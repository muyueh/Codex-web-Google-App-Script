# AGENTS-deploy-workflow.md

## 這份文件在解決什麼事？

這份文件專門說明：

- `.github/workflows/deploy-gas.yml` 的行為與結構
- 如何把新的 Apps Script 專案加進 CI deploy
- 移除專案時要注意什麼
- 常見 CI 部署錯誤要怎麼看

如果你要改 `deploy-gas.yml` 或 debug CI，請看這裡。

---

## 1. 整體部署 pipeline 回顧

心智圖：

```text
Local edits (或 Agent 在 repo 裡的修改)
  → git commit / push 到 main
  → GitHub Actions 被觸發
  → 每個專案跑一次 clasp push -f
  → 對應的 Apps Script 專案被更新
````

只要：

* `deploy-gas.yml` 存在且設定正確
* `CLASPRC_JSON` secret 設定完成
* 各專案 `.clasp.json` / `appsscript.json` 正確

那麼每次 push 到 main（或手動觸發 workflow），就會自動 deploy。

---

## 2. `deploy-gas.yml` 的預期行為

在 repo root：

```bash
cat .github/workflows/deploy-gas.yml
```

通常會看到類似：

```yaml
name: Deploy Google Apps Script (monorepo)

on:
  push:
    branches:
      - main
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        project:
          - apps-script/gas-main-app
          - apps-script/gas-second-app
          - apps-script/gas-cat-cafe

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install clasp (3.x)
        run: npm install -g @google/clasp@^3.1.0

      - name: Restore clasp credentials from secret
        env:
          CLASPRC_JSON: ${{ secrets.CLASPRC_JSON }}
        run: |
          if [ -z "$CLASPRC_JSON" ]; then
            echo "ERROR: GitHub secret CLASPRC_JSON is missing." >&2
            exit 1
          fi
          printf '%s\n' "$CLASPRC_JSON" > "$HOME/.clasprc.json"

      - name: Check clasp login status
        run: clasp login --status

      - name: Deploy ${{ matrix.project }}
        working-directory: ${{ matrix.project }}
        run: clasp push -f
```

### 2.1 觸發條件 (`on:`)

* `push` 到 `main` 分支
* `workflow_dispatch` 允許手動從 GitHub Actions UI 觸發

### 2.2 Matrix project

`strategy.matrix.project` 列出所有要被 deploy 的專案資料夾：

* `apps-script/gas-main-app`
* `apps-script/gas-second-app`
* `apps-script/gas-cat-cafe`
* …任何新的 `apps-script/gas-<slug>`

GitHub Actions 會針對這些值各跑一次 Job，並在每個專案裡執行 `clasp push -f`。

### 2.3 主要步驟說明

1. **Checkout repo**

   * 把 Git repo 內容拉到 CI 環境。

2. **Set up Node**

   * 用 `actions/setup-node@v4` 安裝 Node 20。
   * 如果你要升級 Node 版本，可以在這裡升 minor / major，但建議先跟使用者溝通。

3. **Install clasp**

   * `npm install -g @google/clasp@^3.1.0`
   * 需要 3.x 以上版本。

4. **Restore clasp credentials**

   * 從 `${{ secrets.CLASPRC_JSON }}` 還原 `~/.clasprc.json`。
   * 如果 secret 缺失，會直接 `exit 1`。

5. **Check clasp login status**

   * 跑 `clasp login --status`，確認憑證可用。

6. **Deploy 每個專案**

   * `working-directory: ${{ matrix.project }}`
   * 在該資料夾跑 `clasp push -f`，把當前檔案推上 Apps Script。

### 2.4 Script ID guard（缺 `scriptId` 就拒絕 deploy）

`deploy-gas.yml` 在 `clasp push` 之前會跑一個 Guard：

```yaml
      - name: Guard: require scriptId before deploy
        working-directory: ${{ matrix.project }}
        run: |
          if [ ! -f ".clasp.json" ]; then
            echo "::error title=Missing Script ID::${{ matrix.project }} is in the deploy matrix but has no .clasp.json." >&2
            exit 1
          fi
          node <<'EOF'
            // …檢查 scriptId 是否存在且符合格式（英數字 + -/_，長度 >= 20）
          EOF
```

這個步驟會直接終止 job，如果：

1. `.clasp.json` 不存在
2. `.clasp.json` 裡沒有 `scriptId`
3. `scriptId` 不是有效的 Apps Script ID（guard 會檢查是否符合長度與允許字元格式）

**目的：** 防止還沒拿到 Script ID 的新專案被加進 deploy matrix。這種錯誤應該在你寫程式之前就被發現，而不是等 CI 失敗。

**修復方式：**

* 如果專案還沒 onboarding 完：把它從 `matrix.project` 移除，等 Script ID 到手後再加回來。
* 如果 `.clasp.json` 被刪掉或損壞：重新照 `AGENTS-onboarding-flows.md` Flow 2 / Flow 3 建立。

---

## 3. 新專案要怎麼加進 CI deploy？

假設你新增了一個 `apps-script/gas-new-app/` 專案（流程見 `AGENTS-onboarding-flows.md`），要讓它跟著 CI deploy：

1. 打開 `.github/workflows/deploy-gas.yml`

2. 在 `matrix.project` 裡加一行：

   ```yaml
   strategy:
     fail-fast: false
     matrix:
       project:
         - apps-script/gas-main-app
         - apps-script/gas-second-app
         - apps-script/gas-cat-cafe
         - apps-script/gas-new-app       # 新增這行
   ```

3. **確認 `.clasp.json` 已存在且含 Script ID。** guard 會檢查這點，所以沒有 Script ID 的專案先不要放進 matrix。

4. 跟使用者說明：

   > 我已經把 `apps-script/gas-new-app` 加進 deploy matrix。
   > 之後只要 push 到 main，這個專案就會自動被 `clasp push -f`。

---

## 4. 要移除專案時怎麼做？

⚠️ 移除 deploy target 是一種「破壞性變更」，一定要先跟使用者確認。

步驟建議：

1. 跟使用者說明：

   > 如果我從 `deploy-gas.yml` 裡移除 `apps-script/gas-X/`，之後 CI 就不會再自動 deploy 這個專案。
   > Apps Script 雲端那邊現有的程式不會被刪除，但也不會再跟 repo 裡的程式同步。
   > 請確認你真的要停用這個專案的自動 deploy？

2. 得到明確同意後，在 `matrix.project` 中刪掉相應條目。

3. 若使用者也要刪除 repo 裡的專案資料夾（`apps-script/gas-X/`），要再走一次「破壞性變更流程」（詳見 `AGENTS-editing-workflow.md`）：

   * 說明要刪的檔案 / 資料夾
   * 等使用者確認
   * 再執行刪除

---

## 5. 版本升級（Node / Actions / clasp）

你可以在合理範圍內做 **小版本升級（minor）**，例如：

* `@google/clasp@^3.1.0` → `@google/clasp@^3.2.0`
* `actions/checkout@v4` → 仍然 v4，只改 patch
* `node-version: '20'` → `'22'`（需先跟使用者確認）

但請不要在沒有使用者同意的情況下做：

* 大版本跳躍式升級（尤其可能導致 CI 失敗）
* 新增 / 刪除完全不同的 workflow
* 修改與 GAS 無關的 workflows

---

## 6. 常見 CI 部署錯誤與排查方向

### 6.1 `CLASPRC_JSON is missing` / `ERROR: GitHub secret CLASPRC_JSON is missing.`

代表：

* repo 或 fork 裡 **沒有** 設定 `CLASPRC_JSON` secret，或名稱拼錯。

解法：

* 參考 `AGENTS-ci-secret-clasprc-json.md`，協助使用者在該 repo / fork 增設 secret。

### 6.2 `clasp login --status` 失敗

可能訊息：

* `Could not read API credentials`
* `invalid_grant`
* `unauthorized_client`

排查：

1. Secret 內容是否為最新版本的 `~/.clasprc.json`
2. 該 Google 帳號是否仍有權限存取所有 `scriptId`
3. Apps Script API 是否有被關閉或權限變更

通常做法：

* 要求使用者在本機重新 `clasp login`，再重新建立 `CLASPRC_JSON` secret。

### 6.3 單一專案 `clasp push -f` 失敗

看該 matrix job 的 log，常見原因：

* `.clasp.json` 的 `scriptId` 錯誤或指向不存在的專案
* `appsscript.json` schema 有錯（invalid manifest）
* 專案裡有語法錯誤導致 Apps Script 端拒絕（較少見）

排查時：

1. 檢查該 `apps-script/gas-<slug>/` 的 `.clasp.json` 和 `appsscript.json`。
2. 參考 `AGENTS-monorepo-structure.md` 的 checklist。
3. 如有需要，請使用者在 Apps Script UI 裡看詳細錯誤。

---

## 7. 小結

* `deploy-gas.yml` 用 matrix 的方式一次 deploy 多個 `apps-script/gas-<slug>/` 專案。
* 新增專案：記得把路徑加進 `matrix.project`。
* 停用專案：刪 `matrix.project` 之前先跟使用者確認。
* 多數 CI 問題與兩件事有關：

  1. `CLASPRC_JSON` secret 沒設好
  2. `.clasp.json` / `appsscript.json` / Apps Script 權限不正確

搭配：

* `AGENTS-ci-secret-clasprc-json.md` 解決 CI 認證問題
* `AGENTS-monorepo-structure.md` 確認專案結構
