

### `docs/AGENTS-project-selection.md`

````markdown
# AGENTS-project-selection.md

## 這份文件在解決什麼事？

在這個 monorepo 裡，同一時間你只能有一個（或少數明確指定的）**Active Project**。  
這份文件定義：

1. 什麼叫 Active Project
2. 怎麼跟使用者對齊「現在要動哪一個專案」
3. 允許 / 不允許的跨專案操作

搭配根目錄的 `Agents.md`（Router），這裡是詳細版規則與對話樣板。

---

## 1. Active Project 是什麼？

**Active Project = 使用者目前指定要你動手的 Apps Script 專案資料夾。**

格式一律是：

```text
apps-script/{project-folder}/
````

例如：

* `apps-script/gas-main-app/`
* `apps-script/gas-second-app/`
* `apps-script/report-a/`
* `apps-script/report-c/`

⚠️ 規則：

* **你不能自己猜** Active Project。
* 使用者沒講清楚前，**不要改任何程式或 workflow**。
* 如果要同時改兩個以上專案，使用者必須明確列出每一個路徑。

---

## 2. 選 Active Project 的標準流程

### 2.1 列出現有專案（在可以開終端機的環境中）

當你第一次進入這個 repo、或使用者說「我要改某個 Apps Script 專案」時：

```bash
pwd
ls
find apps-script -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort
```

然後把結果整理給使用者，例如：

> 我在 repo 裡看到這些 Apps Script 專案：
>
> * `apps-script/gas-main-app/`
> * `apps-script/gas-second-app/`
> * `apps-script/gas-cat-cafe/`
>
> 請問這次要改哪一個？
> 請用完整路徑回答，例如：`apps-script/gas-main-app/`。

### 2.2 使用者指定專案

等使用者明確回覆，例如：

* ✅ `apps-script/gas-main-app/`
* ✅ `apps-script/gas-second-app/` + `apps-script/gas-cat-cafe/`（多專案情境）
* ❌「main 那個」/「第二個」/「咖啡那個」← **請再追問，要求明確路徑**

你要在自己的「上下文」裡記住這件事，之後所有操作都要以這個路徑為準。

建議你在回應中重複一次確認：

> 收到，這次的 Active Project 是：
>
> * `apps-script/gas-main-app/`
>
> 接下來我只會在這個資料夾裡動手。

---

## 3. 多專案情境怎麼處理？

有時候使用者會說：

* 「幫我把 `gas-main-app` 跟 `gas-second-app` 都加進 CI」
* 「兩個專案都要更新 Node 版本」

這時候流程：

1. 要求使用者用路徑列出所有專案，例如：

   > 請確認要一起修改的專案路徑：
   >
   > * `apps-script/gas-main-app/`
   > * `apps-script/gas-second-app/`
   >
   > 以上兩個都要嗎？

2. 你在回覆中明確列出這次會碰的專案清單。

3. 之後每一段操作描述，都要註明是對哪一個專案，例如：

   * 「在 `apps-script/gas-main-app/` 裡更新 `appsscript.json`…」
   * 「在 `apps-script/gas-second-app/` 裡新增 `Code.gs`…」

---

## 4. 不可以做的事（跟 Active Project 有關）

你**不能**：

* 因為看到某個檔案好像「比較重要」就自行假設那是 Active Project。

* 在沒有確認 Active Project 前就：

  * 改 `appsscript.json`
  * 改 `.clasp.json`
  * 改 `.github/workflows/deploy-gas.yml`
  * 新增 / 刪除任何 `apps-script/gas-*` 資料夾

* 同時對多個專案做破壞性變更（例如刪檔、搬移、重新命名）而沒有清楚列出清單，並得到使用者確認。

---

## 5. 建議對話樣板

### 5.1 使用者說「我要改一個 Apps Script 專案」

> 我可以先確認一下你要改哪一個專案嗎？
> 請在下面三個選一個、或直接貼你要的路徑：
>
> * `apps-script/gas-main-app/`
> * `apps-script/gas-second-app/`
> * `apps-script/gas-cat-cafe/`
>
> 請用完整路徑回覆，例如：`apps-script/gas-main-app/`。

### 5.2 使用者說「main 那個」

> 為了避免改錯專案，我需要你用路徑指定專案資料夾。
> 你是指：
>
> * `apps-script/gas-main-app/`
>
> 嗎？如果是，請直接回：
> `Active Project = apps-script/gas-main-app/`

### 5.3 使用者說「這次兩個專案都要改」

> 好，這次會同時修改兩個專案。
> 請確認以下是完整清單：
>
> * `apps-script/gas-main-app/`
> * `apps-script/gas-second-app/`
>
> 如果沒問題，我接下來會：
>
> 1. 先在這兩個資料夾裡做程式 / manifest 變更
> 2. 然後更新 `.github/workflows/deploy-gas.yml` 的 `matrix.project`
>
> 請回覆「確認」或修正清單。

---

## 6. 小結

* **任何改動前都要先確認 Active Project**。
* Active Project 一律用 `apps-script/{project-folder}/` 的路徑表示。
* 多專案時，要把所有專案路徑明列並得到確認。
* 不要自己猜哪個專案是「現在要改的那個」。

````

---

### `docs/AGENTS-env-and-clasp-login.md`

```markdown
# AGENTS-env-and-clasp-login.md

## 這份文件在解決什麼事？

如果你遇到：

- 新環境 / 新機器 / 新 Codespace / 新 fork
- `clasp` 找不到或版本太舊
- Node / npm 沒裝
- `clasp login --status` 失敗

請照這份文件的步驟檢查環境與登入狀態。

---

## 1. 確認目前在 repo root

先確定你真的在這個 monorepo 的根目錄。

```bash
pwd
ls
````

你應該會看到類似：

* `.git/`
* `Agents.md`
* `.github/`
* `apps-script/`
* `shared/`
* `package.json`
* `README.md`

如果沒有看到 `apps-script/` 或 `.github/`，很可能你不在 repo root，請先 `cd` 到正確位置。

---

## 2. 確認 Node 與 npm 有安裝

在任何地方（建議在 repo root）執行：

```bash
node -v
npm -v
```

預期結果：

* 兩個指令都要有版本號輸出
* Node 版本大致上是 LTS 或更高（例如 `v18.x` / `v20.x`）

如果出現：

* `command not found: node` 或 `npm`
* 版本非常老舊（例如 < 14）

請告訴使用者：

> 這個環境沒有安裝（或正確安裝）Node / npm。
> 需要先安裝 Node.js（建議 LTS 版本，內含 npm），才能使用 `clasp` 和 CI 部署流程。

---

## 3. 安裝或確認 `clasp` 版本

### 3.1 安裝 `clasp` ≥ 3.x

如果 `clasp` 不存在或版本過舊，請執行：

```bash
npm install -g @google/clasp@^3.1.0
```

裝完後確認版本：

```bash
clasp -v
```

要求：

* 版本號要 **≥ 3.0.0**

如果還是找不到 `clasp`，請提醒使用者：

> `clasp` 安裝似乎沒有成功，或 `npm` 的 global 路徑沒有在 `PATH`。
> 請在本機環境手動安裝 `@google/clasp` 並確保 `clasp` 指令可用。

---

## 4. 檢查 `clasp` 登入狀態

在可以跑指令的環境中：

```bash
clasp login --status
```

可能狀況：

1. ✅ 已登入，顯示目前 Google 帳號
   → 確認使用者 OK 使用這個帳號部署 Apps Script。

2. ⚠️ 尚未登入 / token 過期 / 帳號錯誤
   → 進入重新登入流程。

---

## 5. 重新登入 `clasp`（建議用 `--no-localhost`）

如果需要重新登入，請執行：

```bash
clasp login --no-localhost
```

典型流程：

1. `clasp` 會在終端機印出一段 URL。

2. 你應該把這段 URL 貼給使用者，說明：

   > 請在瀏覽器開啟這個網址，授權你的 Google 帳號使用 Apps Script API，最後會得到一組 code，請貼回來。

3. 使用者貼回 code 之後，在終端機輸入該 code。

4. 再次確認：

   ```bash
   clasp login --status
   ```

   確定：

   * 已登入
   * 帳號是使用者期望用來部署 Apps Script 專案的那個

---

## 6. Fork / 新環境時要注意的事

**重要觀念：**

* `clasp login` 是「機器 / 環境」層級的設定。
* **每個新的環境（新 VM、新 Codespace、新 local clone）都要重新登入一次。**
* GitHub Actions 的 CI 不會直接用你本機的登入，而是用 `CLASPRC_JSON` secret（詳見 `AGENTS-ci-secret-clasprc-json.md`）。

如果使用者說：

* 「我在本機能 `clasp push`，但 CI 失敗」

  * 通常是 **GitHub secret(`CLASPRC_JSON`) 沒設好**，不是 `clasp login` 的問題。
* 「我換電腦後，這個專案不能 `clasp push` 了」

  * 新電腦要重新安裝 Node / `clasp`，並再走一次 `clasp login` 流程。

---

## 7. 小結

遇到 `clasp` / Node / npm 相關問題時：

1. 先確認自己在 repo root。
2. 檢查 Node / npm 是否存在。
3. 安裝 / 更新 `@google/clasp@^3.1.0`。
4. 用 `clasp login --status` 確認登入帳號。
5. 如有需要，再用 `clasp login --no-localhost` 重新登入。

CI 端使用的認證則由 `CLASPRC_JSON` secret 管理，細節見
`docs/AGENTS-ci-secret-clasprc-json.md`。

````

---

### `docs/AGENTS-ci-secret-clasprc-json.md`

```markdown
# AGENTS-ci-secret-clasprc-json.md

## 這份文件在解決什麼事？

這份文件專門處理：

- GitHub Actions 的 Apps Script 部署為什麼需要 `CLASPRC_JSON`
- 如何在 GitHub 上建立 / 更新這個 secret
- Fork 之後 CI 為什麼會壞掉，以及要怎麼修

---

## 1. CLASPRC_JSON 是什麼？

在本機跑 `clasp login` 時，`clasp` 會在使用者家目錄寫一份檔案：

```text
~/.clasprc.json
````

內容包含：

* OAuth credentials（存取 Apps Script / Drive 的 token 等）
* 讓 `clasp` 在沒有互動的情況下也能跟 Google APIs 溝通

在 CI（GitHub Actions）裡，沒辦法互動式登入，所以我們：

1. 把本機的 `~/.clasprc.json` 內容存成一個 GitHub Actions secret：`CLASPRC_JSON`
2. 在 workflow 裡，讀取這個 secret，寫回 CI 的 `~/.clasprc.json`
3. 然後 `clasp` 在 CI 裡就能正常跑 `clasp login --status` 和 `clasp push -f`

---

## 2. 先問使用者的一句話

在你打算處理 CI / 部署問題時，先問：

> 這個 GitHub repo（或 fork）裡，現在已經有一個名為
> `CLASPRC_JSON` 的 Actions secret 了嗎？

* 如果使用者回答 **有**：

  * 不要主動要求他們重新產生，除非：

    * token 過期 / workflow log 顯示認證錯誤
    * 使用者自己說要換帳號或重設
* 如果使用者回答 **沒有 / 不確定**：

  * 引導他們照下面步驟建立 / 更新。

---

## 3. 如何建立 / 更新 `CLASPRC_JSON`

### 3.1 在本機取得 `~/.clasprc.json`

1. 確保本機已經用正確的 Google 帳號登入 `clasp`：

   ```bash
   clasp login --status
   ```

2. 在本機終端機輸出這個檔案內容：

   ```bash
   cat ~/.clasprc.json
   ```

3. **選取並複製整段 JSON**（包含大括號 `{}`）
   ⚠️ 不要改任何內容。

### 3.2 在 GitHub 上設定 secret

1. 打開 GitHub 網頁 → 進入 **對應的 repo 或 fork**。

2. 點選：

   * **Settings**
   * 左側選單：**Secrets and variables → Actions**

3. 新增或更新一個 secret：

   * Name：**`CLASPRC_JSON`**（大小寫必須完全符合）
   * Secret value：貼上剛才複製的 `~/.clasprc.json` 內容

4. 儲存。

### 3.3 安全性提醒

告訴使用者：

* 不要把 `~/.clasprc.json` 內容貼到任何有 version control 的檔案裡。
* 不要把 secret value 貼在 Issue / PR / Chat 裡。
* 如果懷疑有外流風險，應該撤銷 OAuth 權限並重新 `clasp login` 產生新的 `~/.clasprc.json`，再更新 GitHub secret。

---

## 4. CI 裡怎麼使用 `CLASPRC_JSON`

在 `.github/workflows/deploy-gas.yml` 中，通常會有類似這一段：

```yaml
      - name: Restore clasp credentials from secret
        env:
          CLASPRC_JSON: ${{ secrets.CLASPRC_JSON }}
        run: |
          if [ -z "$CLASPRC_JSON" ]; then
            echo "ERROR: GitHub secret CLASPRC_JSON is missing." >&2
            exit 1
          fi
          printf '%s\n' "$CLASPRC_JSON" > "$HOME/.clasprc.json"
```

這段的作用是：

1. 從 `${{ secrets.CLASPRC_JSON }}` 取得 secret 的值
2. 檢查是不是空的（如果沒設 secret 就會是空值）
3. 把內容原樣寫回 `$HOME/.clasprc.json`
4. 之後 `clasp login --status` / `clasp push -f` 都會使用這份檔案

---

## 5. Fork 之後 CI 為什麼壞掉？

GitHub 的設計是：

* **Secrets 不會跟著 fork 一起被複製過去。**

所以如果使用者：

1. Fork 了這個 monorepo
2. 在 fork 裡直接 push 到 `main`
3. CI workflow 跑起來，但 log 內出現：

   * `CLASPRC_JSON is missing`
   * 或 `clasp login` / `clasp push` 相關認證錯誤

很大機率是：

* Fork 裡根本沒有設定 `CLASPRC_JSON` secret

這時候你要提醒他們：

> 因為 GitHub 的安全性設計，fork 不會帶著原 repo 的 Actions secrets。
> 你需要在你自己的 fork 上，重新建立一個名為 `CLASPRC_JSON` 的 secret，
> 內容一樣是你本機的 `~/.clasprc.json`。

流程跟前面的「建立 / 更新 `CLASPRC_JSON`」完全相同，只是 repo 換成他們自己的 fork。

---

## 6. 常見錯誤與排查建議

### 6.1 Workflow log 提示：`CLASPRC_JSON is missing`

檢查：

1. GitHub → repo → Settings → Secrets and variables → Actions
2. 是否真的有一筆名為 `CLASPRC_JSON` 的 secret
3. 是否存錯成 e.g. `CLASP_RC_JSON` / `CLASPRC` / `CLASPRC-JSON` 等錯字

### 6.2 `clasp login --status` 在 CI 裡失敗

若 log 顯示類似：

* `Error: Could not read API credentials`
* `Invalid_grant` / `unauthorized_client`

可能原因：

* `~/.clasprc.json` 格式錯誤（貼的內容不完整或被編輯過）
* OAuth token 過期或被撤銷
* 使用的 Google 帳號沒有權限存取那些 Apps Script 專案

建議做法：

1. 在本機重新 `clasp login`，確認能操作該 Apps Script 專案。
2. 重新輸出 `cat ~/.clasprc.json`，建立新的 `CLASPRC_JSON` secret。
3. 再跑一次 CI workflow。

---

## 7. 小結

* `CLASPRC_JSON` = 把本機 `~/.clasprc.json` 放進 GitHub Actions secret。
* CI workflows 會把這個 secret 還原成 `~/.clasprc.json` 來使用 `clasp`。
* Fork 不會複製 secrets，fork 後要重新設一次。
* 遇到 CI 認證錯誤時，先檢查 secret 是否存在、拼字是否正確、內容是否最新。

````

---

### `docs/AGENTS-monorepo-structure.md`

```markdown
# AGENTS-monorepo-structure.md

## 這份文件在解決什麼事？

這份文件說明：

1. 這個 repo 是怎麼當成 **Google Apps Script monorepo** 來管理的
2. 每個 Apps Script 專案的標準結構
3. 怎麼檢查 / 修復 monorepo 結構
4. 每個專案在 deploy 之前要通過的 checklist

如果你對「目錄結構」、「每個專案應該有哪些檔案」有疑問，就看這份。

---

## 1. Repo 是一個已經設定好的 GAS monorepo

這個 repo **已經**是一個 Google Apps Script (GAS) monorepo。

在 repo root 應該會看到：

- `Agents.md`（Router）
- `README.md`
- `package.json`
- `shared/`
- `.github/workflows/deploy-gas.yml`
- `apps-script/`

### 1.1 既有 Apps Script 專案

目前 `apps-script/` 裡至少有這幾個資料夾（示意）：

- `apps-script/gas-main-app/`
  - 有 `.clasp.json`, `appsscript.json`, `Code.js` / `Code.gs` 等
- `apps-script/gas-second-app/`
  - 有 `.clasp.json`, `README.md`
  - ⚠️ `appsscript.json` 目前**缺少**，改動前要先補一個 manifest
- `apps-script/gas-cat-cafe/`
  - 有 `.clasp.json`, `appsscript.json`, `Code.gs`（Slides 相關 helper）

CI Workflow `.github/workflows/deploy-gas.yml` 已經存在，並且會用 **matrix** 的方式一次 deploy 多個專案（細節見 `AGENTS-deploy-workflow.md`）。

---

## 2. Mental model：整體 pipeline

可以用這個心智圖來記：

```text
開發者 / Agent
  → git commit / push
  → GitHub Actions
  → clasp push -f
  → Apps Script 專案（雲端）
````

對你來說，重要的是：

* 你只修改 **Git repo 裡的檔案**（`apps-script/gas-<slug>/...`）
* 透過 GitHub Actions + `clasp push -f` 把變更推上 Apps Script
* CI 是否成功，是檢查 deploy 狀態的關鍵訊號

---

## 3. Monorepo 目錄結構

標準結構（示意）：

```text
.
├─ Agents.md
├─ README.md
├─ package.json
├─ shared/
├─ .github/
│  └─ workflows/
│     └─ deploy-gas.yml
└─ apps-script/
   ├─ gas-main-app/
   │  ├─ .clasp.json
   │  ├─ appsscript.json
   │  └─ Code.gs / Code.js / *.gs / *.js / src/…
   ├─ gas-second-app/
   │  ├─ .clasp.json
   │  ├─ appsscript.json   # <-- 若缺少就要補上
   │  └─ Code.gs / Code.js / *.gs / *.js / src/…
   └─ gas-cat-cafe/
      ├─ .clasp.json
      ├─ appsscript.json
      └─ Code.gs / Code.js / *.gs / *.js / src/…
```

### 3.1 基本原則

* 每個 Apps Script 專案都放在：

  ```text
  apps-script/gas-<slug>/
  ```

* 每個專案資料夾都是 **自給自足**：

  * `.clasp.json`（有 `scriptId` + `"rootDir": "."`）
  * `appsscript.json`（Apps Script manifest）
  * 該專案的所有 source 檔（`.gs` / `.js` / `src/**`）

* CI 透過 `.github/workflows/deploy-gas.yml` 的 `matrix.project` 一個一個 deploy。

---

## 4. 快速檢查當前結構

當你懷疑結構怪怪的時候，做這幾件事：

```bash
pwd && ls
ls apps-script 2>/dev/null || echo "no apps-script directory"
cat .github/workflows/deploy-gas.yml 2>/dev/null || echo "missing deploy workflow"
```

### 4.1 確保基本資料夾存在

在 repo root：

```bash
mkdir -p apps-script
mkdir -p shared
mkdir -p .github/workflows
```

這幾個指令是 **idempotent** 的（多跑幾次也不會壞事）。

### 4.2 列出所有專案資料夾

```bash
find apps-script -mindepth 1 -maxdepth 1 -type d | sort
```

把結果整理給使用者看，並用這個清單做 Active Project 選擇（詳見 `AGENTS-project-selection.md`）。

---

## 5. 檢查每一個 Apps Script 專案

對每個資料夾，例如 `apps-script/gas-main-app`：

```bash
PROJECT_DIR="apps-script/gas-main-app"   # 依實際路徑調整
ls "$PROJECT_DIR"
cat "$PROJECT_DIR/.clasp.json"
```

確認：

1. `.clasp.json` 存在，且有 `scriptId` 欄位。
2. `.clasp.json` 裡的 `rootDir` 是 `"."`（不是空值、不是其他路徑）。
3. `appsscript.json` 存在：

   * 如果缺少，要補一個最小的 manifest（但要先得到使用者同意）。
4. `*.gs` / `*.js` / `src/**` 等程式碼都在這個專案資料夾之下，而不是亂放在 repo root。

---

## 6. 如果在 repo root 發現「流浪」的 Apps Script 檔案

有時候會看到：

* `.clasp.json`
* `appsscript.json`
* `Code.gs` / `main.gs`

竟然直接放在 repo root，而不是 `apps-script/gas-<slug>/` 裡。

遇到這種情況，你應該：

1. 停下來，不要直接刪或覆蓋。

2. 跟使用者說明情況，提出遷移計畫：

   > 我在 repo root 發現 Apps Script 相關的檔案（例如 `.clasp.json` / `appsscript.json` / `Code.gs`）。
   > 根據 monorepo 規則，這些應該要搬到 `apps-script/gas-<slug>/`。
   > 建議流程是：
   >
   > 1. 新增一個 `apps-script/gas-<slug>/` 資料夾
   > 2. 把這些檔案都移進去
   > 3. 在 CI 的 `matrix.project` 裡新增這個專案
   >
   > 你可以幫我決定這個專案的 slug 嗎？例如 `gas-legacy-script`？

3. 得到使用者同意之後，才進行搬移，並更新 CI workflow。

---

## 7. 專案級 Checklist（每一個 `apps-script/gas-<slug>/` 都要通過）

對於任何你要部署的專案，請檢查：

### 7.1 `.clasp.json` 必須存在而且正確

內容最少長這樣：

```json
{
  "scriptId": "<VALID_SCRIPT_ID>",
  "rootDir": "."
}
```

* `scriptId`：對應 Apps Script UI 裡的 Script ID。
* `rootDir`：一定要是 `"."`，表示專案的 root 就是這個資料夾。

⚠️ 不要自己亂改 `scriptId`，除非使用者明確要你「改連到另一個 Script」。

### 7.2 `appsscript.json` 必須存在而且合法

最小範例：

```json
{
  "timeZone": "Asia/Taipei",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

依實際需求，可能會有：

* `addOns`
* `sheets`
* `webapp`
* `executionApi`
* 其他 manifest 欄位

**不要亂發明 key**，必要時請參考官方 manifest schema（見 `AGENTS-reference-gas.md`）。

### 7.3 Source 檔案位置正確

* 所有 Apps Script 程式碼檔案都應該在：

  ```text
  apps-script/gas-<slug>/
  ```

* 不要出現這種混亂情況：

  * 一半在 repo root，一半在 `apps-script/gas-<slug>/`
  * 不同專案共用同一個 `src/` 資料夾而沒有區分

### 7.4 CI workflow 已經包含這個專案路徑

打開 `.github/workflows/deploy-gas.yml`，在 `strategy.matrix.project` 裡，應該要有這個專案的路徑，例如：

```yaml
strategy:
  matrix:
    project:
      - apps-script/gas-main-app
      - apps-script/gas-second-app
      - apps-script/gas-cat-cafe
      - apps-script/gas-your-new-app   # <-- 新專案
```

如果你新增了 `apps-script/gas-something/` 卻沒加到這裡，CI 不會自動 deploy 它。

### 7.5 使用者的環境與 CI 認證

* 使用者的 Google 帳號已做好 `clasp login`（本機）
* GitHub repo / fork 裡已設定 `CLASPRC_JSON` secret

細節見：

* `AGENTS-env-and-clasp-login.md`
* `AGENTS-ci-secret-clasprc-json.md`

---

## 8. 小結

* Monorepo 的核心就是：**每個 Apps Script 專案都是一個 `apps-script/gas-<slug>/` 資料夾**。
* 每個專案都必須有 `.clasp.json` + `appsscript.json`，並且在 CI 的 `matrix.project` 裡被列出。
* 遇到結構混亂（檔案漂在 root、缺 manifest、`rootDir` 設錯），先跟使用者溝通，再依這份文件的流程修正。

````

---

### `docs/AGENTS-onboarding-flows.md`

```markdown
# AGENTS-onboarding-flows.md

## 這份文件在解決什麼事？

當使用者說：

- 我剛 fork 這個 repo，要怎麼開始？
- 我有一個現成的 Apps Script 專案（有 Script ID），想放進這個 monorepo。
- 我要在 Apps Script UI 建一個全新的專案，然後跟這個 repo 接在一起。

就照這份文件的 Onboarding Flow 走：

1. Flow 1 – 使用既有 `apps-script/` 資料夾
2. Flow 2 – 用 Script ID 連結既有 Apps Script 專案
3. Flow 3 – 在 Apps Script UI 建新專案，再用 Flow 2 連結

---

## 1. Onboarding 選單（先問使用者要走哪一條）

和使用者溝通時，可以先問：

> 在這個 monorepo 裡，你目前想做哪一種事？
>
> 1. **用現有的 Apps Script 專案資料夾**（已經在 `apps-script/` 裡）  
> 2. **把你在 Apps Script UI 裡的既有專案（有 Script ID）連結進來**  
> 3. **在 Apps Script UI 建一個全新的專案，再連回這個 repo**  
>
> 你可以回覆 1 / 2 / 3，或簡短描述你的情境。

然後依對方回答，走對應的 Flow。

---

## 2. Flow 1 – 使用既有 Apps Script 專案資料夾

這條是最單純的情境：專案資料夾已經在 `apps-script/` 下面了。

### 2.1 列出現有專案

在 repo root：

```bash
find apps-script -mindepth 1 -maxdepth 1 -type d 2>/dev/null || echo "no-apps-script-folder"
````

舉例輸出：

```text
apps-script/gas-main-app
apps-script/gas-second-app
apps-script/gas-cat-cafe
```

把清單整理給使用者，請他選 Active Project（詳見 `AGENTS-project-selection.md`）。

### 2.2 檢查選定專案的結構

假設使用者選了 `apps-script/gas-main-app`：

```bash
PROJECT_DIR="apps-script/gas-main-app"
ls "$PROJECT_DIR"
cat "$PROJECT_DIR/.clasp.json"
```

檢查：

* `.clasp.json` 存在且有 `scriptId`
* `.clasp.json` 的 `"rootDir": "."`
* `appsscript.json` 存在

  * 若缺少：先跟使用者說明，並提議建立一個最小 manifest
* Source 檔案都在 `PROJECT_DIR` 之內

### 2.3 確認專案有被 CI deploy

打開 `.github/workflows/deploy-gas.yml`，看 `strategy.matrix.project`：

```yaml
strategy:
  matrix:
    project:
      - apps-script/gas-main-app
      - apps-script/gas-second-app
      - apps-script/gas-cat-cafe
```

確保 `apps-script/gas-main-app` 有在裡面。如果沒有，就跟使用者提議加上去（詳見 `AGENTS-deploy-workflow.md`）。

### 2.4 後續工作

* 使用者之後要你改程式 / manifest / trigger，就在這個資料夾裡操作。
* 任何破壞性變更（大改結構 / 刪檔 / 搬移）都要事先說明並取得同意（見 `AGENTS-editing-workflow.md`）。

---

## 3. Flow 2 – 用 Script ID 連結既有 Apps Script 專案

這條用在：使用者在 Apps Script UI 裡已有一個專案，想跟這個 repo 接起來。

### 3.1 跟使用者要兩個資訊

1. Apps Script 的 **Script ID**

   * 取得方式：Apps Script UI → **Project Settings** → **Script ID**

2. 想要在 monorepo 裡用的資料夾 slug（kebab-case）：

   * 形式：`gas-<slug>`
   * 例如：`gas-taipei-500-form`, `gas-report-monthly` 等

你可以這樣問：

> 請提供兩個資訊：
>
> 1. 你現有 Apps Script 專案的 Script ID
> 2. 想在 `apps-script/` 底下用的資料夾名稱（slug），格式為 `gas-<slug>`，例如 `gas-taipei-500-form`
>
> 我會幫你在 `apps-script/` 建立對應資料夾並用 `clasp` 連結。

### 3.2 建新資料夾並進入

在 repo root：

```bash
SLUG="gas-your-slug-here"             # 使用使用者提供的 slug
mkdir -p "apps-script/$SLUG"
cd "apps-script/$SLUG"
```

### 3.3 用 `clasp clone` 把專案拉下來

```bash
clasp clone "$SCRIPT_ID"
```

預期結果：

* 產生 `.clasp.json`
* 產生 `appsscript.json`
* 把現有程式檔案 (`Code.gs` / `*.gs` / `*.js`) 拉到這個資料夾

如果 `clasp clone` 失敗，通常要檢查：

* Script ID 是否正確
* `clasp login` 是否已登入正確帳號
* 該帳號是否有該 Script 的存取權

### 3.4 確認 `.clasp.json` 的 `rootDir`

有時 `clasp clone` 產生的 `.clasp.json` 會沒有 `rootDir`，或設定成別的路徑。
建議強制設成 `"."`：

```bash
node << 'EOF'
const fs = require('fs');
const path = '.clasp.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
if (data.rootDir !== '.') data.rootDir = '.';
fs.writeFileSync(path, JSON.stringify(data, null, 2));
EOF
```

### 3.5 回 repo root，把專案加到 CI matrix

回到 repo root（非常重要）：

```bash
cd /path/to/your/repo   # 依實際路徑
```

編輯 `.github/workflows/deploy-gas.yml`，在 `matrix.project` 裡加上：

```yaml
      - apps-script/gas-your-slug-here
```

完整範例見 `AGENTS-deploy-workflow.md`。

### 3.6 跟使用者回報你做了什麼

你可以跑：

```bash
find "apps-script/$SLUG" -maxdepth 2 -type f | sort
cat "apps-script/$SLUG/.clasp.json"
```

然後把關鍵檔案清單與 `.clasp.json` 內容摘要給使用者看，說明：

* 新增了 `apps-script/$SLUG/`
* 用 `clasp clone` 拉下原本的 Apps Script 專案
* 修正 `.clasp.json` 的 `rootDir`
* 更新了 deploy workflow 的 `matrix.project`

---

## 4. Flow 3 – 在 Apps Script UI 建新專案，再用 Flow 2 連結

這條用在：使用者想從零開始一個新的 Apps Script 專案。

### 4.1 跟使用者要兩個資訊

1. 在 monorepo 裡的資料夾 slug：`gas-<slug>`
2. 想要在 Apps Script UI 裡看到的專案名稱（title）

你可以這樣說明：

> 流程會是：
>
> 1. 你先到 Apps Script UI 建一個新專案
> 2. 把 Script ID 貼給我
> 3. 我再幫你用 Flow 2 把它連進這個 monorepo
>
> 先請你決定：
>
> * 在 repo 裡要的資料夾（slug），格式 `gas-<slug>`
> * Apps Script 專案在 UI 裡顯示的名稱（可以是中文）

### 4.2 指導使用者在 Apps Script UI 建專案

請他：

1. 到 [`https://script.google.com/`](https://script.google.com/)
2. 登入想要用來部署的 Google 帳號
3. 建立 **New project**
4. 把專案 title 改成使用者想要的名稱
5. 打開 **Project Settings**
6. 找到 **Script ID**，複製並貼回來

### 4.3 得到 Script ID 之後，轉到 Flow 2

一旦使用者提供 Script ID + slug，就可以完全按照 **Flow 2** 的流程：

1. `mkdir -p apps-script/gas-<slug>`
2. `cd` 進去
3. `clasp clone "<SCRIPT_ID>"`
4. 修 `.clasp.json` → `"rootDir": "."`
5. 回 repo root，更新 `.github/workflows/deploy-gas.yml` 的 `matrix.project`

### 4.4 選擇性：建立 starter `Code.gs`

如果使用者希望有一個簡單的起始函式，可以幫他在 `apps-script/gas-<slug>` 裡建立：

```bash
cd "apps-script/gas-<slug>"
cat << 'EOF' > Code.gs
function hello() {
  Logger.log('Hello from gas-<slug> in this monorepo!');
}
EOF
```

記得提醒使用者：

* 之後可以在 Apps Script UI 裡修改這個函式，或新增其他檔案
* 每次修改 repo 裡的程式並 push 到 main，CI 會自動 `clasp push -f`（前提是 `CLASPRC_JSON` 有設好）

---

## 5. 小結

* **Flow 1**：專案已經在 `apps-script/` → 選 Active Project → 確認結構 → 修改。
* **Flow 2**：有現成的 Apps Script project（有 Script ID） → 新建 `apps-script/gas-<slug>/` → `clasp clone` → 加入 CI。
* **Flow 3**：先在 Apps Script UI 建新專案 → 拿 Script ID → 回到 Flow 2。

配合：

* `AGENTS-monorepo-structure.md`：看結構 / checklist
* `AGENTS-env-and-clasp-login.md`：確保 `clasp` / Node / 登入沒問題
* `AGENTS-ci-secret-clasprc-json.md`：確保 CI 的 secret 設定 OK

````

---

### `docs/AGENTS-deploy-workflow.md`

```markdown
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

3. 跟使用者說明：

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

````

---

### `docs/AGENTS-editing-workflow.md`

```markdown
# AGENTS-editing-workflow.md

## 這份文件在解決什麼事？

這份文件整合兩大主題：

1. **安全守則（Safety & editing rules）**：你可以改哪些東西、不能動哪些東西
2. **實際編輯流程（Editing workflow）**：從對齊需求 → 改檔案 → 檢查 diff → 部署

在動任何檔案之前，務必先理解這份文件的規則。

---

## 1. 你可以改哪些東西？

你 **可以** 建立 / 編輯：

- `apps-script/gas-<slug>/` 底下的所有 Apps Script 專案檔案：
  - `.clasp.json`
  - `appsscript.json`
  - `Code.gs` / `Code.js` / `*.gs` / `*.js` / `src/**`
- `shared/` 底下的共用程式碼（若有）
- `.github/workflows/deploy-gas.yml`（只有 GAS deploy 相關的這一份）
- 根目錄：
  - `README.md`
  - `Agents.md`
  - `docs/AGENTS-*.md`（這些文件本身）

你也 **可以**：

- 在 `deploy-gas.yml` 的 `strategy.matrix.project` 裡加 / 移除 `apps-script/gas-<slug>` 條目（移除前要經過使用者同意）。
- 在合理範圍內調整：
  - Node 版本（例如從 `20` 升到 `22`）
  - `@google/clasp` 小版本（`^3.1.0 → ^3.2.0`）
  - GitHub Actions 版本小調整（例如 `actions/checkout@v4` 仍維持 v4）

---

## 2. 你不能動哪些東西？

你 **不得**：

1. **洩漏或 commit 任何機密資訊**：

   - `CLASPRC_JSON` 的實際內容
   - OAuth tokens
   - Service account JSON
   - 任何其他 credentials

   不可以：

   - 把 secrets 寫入 repo 檔案
   - 在回覆中印出 secrets 完整內容

2. **任意更改 `.clasp.json` 裡的 `scriptId`**

   除非：

   - 使用者明確說要「改連到另一個 Script」
   - 並提供新的 Script ID

   否則不要去動 `scriptId`。

3. **未經同意刪除或重新命名現有專案資料夾**

   - 包含任何 `apps-script/gas-*` 開頭的資料夾
   - 任何大規模搬移檔案的操作

4. **修改與 GAS 無關的 workflows 或 repo 政策**

   - 其他 `.github/workflows/*.yml`（非 `deploy-gas.yml`）
   - LICENSE
   - 安全政策 / CODEOWNERS / 等等

   除非使用者有非常明確的指示。

---

## 3. 破壞性變更前必須走的流程

**破壞性變更** 包含：

- 刪除專案資料夾 / 檔案
- 移動大量檔案（例如從 root 搬進 `apps-script/gas-<slug>/`）
- 重新命名 `apps-script/gas-*` 資料夾
- 變更 `scriptId`（指向另一個 Script）

在做任何上述行為之前，你必須：

1. **先說明計畫**

   > 我打算做這些事情：  
   > 1. 把 `apps-script/gas-old-app/` 整個資料夾刪除  
   > 2. 同時從 `deploy-gas.yml` 的 matrix 裡移除  
   >
   > 這樣做的效果是：  
   > - repo 裡不會再有這個專案的程式  
   > - Apps Script 雲端那邊現有的程式不會被自動刪除，但也不會再被更新  
   >
   > 請確認是否真的要這樣做？

2. **等待使用者明確同意**

   - 使用者要明講「OK」「確認」「可以」之類的字眼。
   - 若使用者有任何疑慮，先回答完問題再決定。

3. **才執行變更**

   - 刪 / 移 / 改之前再三確認路徑
   - 變更完成後，簡要說明你實際做了什麼

---

## 4. 編輯工作流程（非破壞性變更）

這是你在「正常修改程式 / manifest / CI 配置」時的建議流程。

### 4.1 對齊 Active Project

- 先用 `AGENTS-project-selection.md` 的流程，確認這次要動哪一個專案。
- 把 Active Project 用路徑講清楚，例如：

  > 這次的 Active Project：`apps-script/gas-main-app/`

如果要同時改多個專案，要列出所有路徑並得到使用者確認。

### 4.2 只在允許的範圍內動手

記住：

- 程式修改：只動 `apps-script/gas-<slug>/`（和必要時的 `shared/`）。
- CI 修改：只動 `.github/workflows/deploy-gas.yml`。
- 說明文件：可以改 `Agents.md` 或 `docs/AGENTS-*.md`。

不要：

- 把 Apps Script 程式碼放到 repo root。
- 在沒有說明的情況下改其他 workflows。

### 4.3 實際修改程式 / manifest / workflow

依需求：

- 改 `.gs` / `.js` 程式
- 調整 `appsscript.json`（例如新增觸發 / add-on 設定）
- 更新 `deploy-gas.yml` 的 `matrix.project`

修改時請：

- 參照 `AGENTS-reference-gas.md` 內的官方文件，不要亂發明 Apps Script API 或 manifest 欄位。
- 若引入新的 API / 欄位，建議在 PR 說明或註解中附上連結來源。

### 4.4 檢查變更內容

如果有 git 環境，可以建議使用者在本機執行：

```bash
git status
git diff
````

你在回覆中，可以：

* 用文字描述「哪些檔案被新增 / 修改」
* 簡要貼出關鍵程式片段（不要整份檔案，除非必要）

### 4.5 Commit 與 push（由使用者執行）

你可以建議 commit message，例如：

* `feat: add calendar trigger to gas-main-app`
* `fix: ensure cat-cafe slide helper handles empty rows`
* `chore: add gas-report-monthly to deploy matrix`

但真正下 `git commit` / `git push` 的是使用者。

### 4.6 確認 CI 部署結果

在 change 被 push 之後，提醒使用者：

> 這次變更會觸發 `Deploy Google Apps Script (monorepo)` 這個 workflow。
> 請到 GitHub Actions 頁面看看是否成功，有沒有錯誤訊息。

必要時，協助閱讀 workflow log（例如依錯誤訊息回推是哪個專案 / 檔案出問題）。

---

## 5. 編輯 workflow 的額外注意事項

當你修改 `.github/workflows/deploy-gas.yml` 時：

* **保留原本的觸發條件與 job 名稱**，除非使用者明確要求更改。

  * 例如 `on: push` / `workflow_dispatch` / `jobs.deploy` 等

* 主要調整點應該在：

  * `strategy.matrix.project`（新增 / 移除 project 路徑）
  * Node / `clasp` / actions 版本（小幅更新）

* 不要：

  * 把 deploy workflow 拆成一堆新的 workflows
  * 移除現有觸發條件（例如把 `push` 刪掉）

---

## 6. 小結

* 改東西前，先對齊 Active Project。
* 你可以改 Apps Script 專案內容、`deploy-gas.yml`、說明文件，但不能動 secrets 和非 GAS workflows。
* 破壞性變更一定要經過「說明 → 等同意 → 再執行」的流程。
* 實際工作流程：對齊需求 → 修改 → 檢查 diff → 建議 commit → 協助看 CI 結果。

````

---

### `docs/AGENTS-reference-gas.md`

```markdown
# AGENTS-reference-gas.md

## 這份文件在解決什麼事？

這份文件是你寫 / 重構 Apps Script 程式碼和 manifest 時的「參考索引」。

核心原則：

> **不要亂發明 Apps Script API 或 manifest 欄位。**

如果你不確定某個 API 名稱 / 參數 / manifest 格式，請把下面的官方 / 範例資源當作唯一真實來源。

---

## 1. `clasp` CLI 文件

**用途：**

- 確認 `clasp clone` / `clasp push` / `clasp login` 等指令的正確用法
- 理解 `.clasp.json` 可以有哪些欄位

**來源：**

- 官方 GitHub repo：`https://github.com/google/clasp`

你可以在這裡查到：

- `clasp` 的安裝方式
- 各種指令的參數與範例
- `.clasp.json` 結構說明

---

## 2. Apps Script manifest schema

**用途：**

- 查 `appsscript.json` 的欄位名稱與格式
- 了解各種 add-on / web app / trigger 等設定如何在 manifest 裡描述

**來源：**

- 官方文件：`https://developers.google.com/apps-script/concepts/manifests`

你應該在這裡確認：

- `timeZone`, `exceptionLogging`, `runtimeVersion` 等基本欄位
- `sheets`, `calendar`, `drive` 等具體服務的設定
- `addOns` / `oauthScopes` / `executionApi` 等進階欄位

---

## 3. Apps Script 範例程式碼（Samples）

當你需要「實戰範例」時，可以參考下列 repo：

1. **Cheat sheets / 小片段範例**

   - `https://github.com/jc324x/google-apps-script-cheat-sheet`
   - `https://github.com/oshliaer/google-apps-script-snippets`

   用途：

   - 快速找到常見的操作方式，例如：
     - 操作 Sheets / Docs / Slides / Gmail 等
     - 使用各種服務（`SlidesApp`, `SpreadsheetApp`, `DriveApp`, ...）

2. **官方 sample 集合**

   - `https://github.com/googleworkspace/apps-script-samples/tree/master`

   用途：

   - 參考完整的專案範例
   - 看看官方怎麼組織程式碼與 manifest

---

## 4. 使用這些參考的時候要注意什麼？

### 4.1 不要生出不存在的 API

錯誤示例：

- `SpreadsheetApp.fooMagicApi()`（官方文件沒有）
- `SlidesApp.getPresentationByVibe()`（瞎掰）

正確做法：

1. 先在官方文件或 sample repo 裡確認：
   - 這個物件是否存在（例如 `SlidesApp`）
   - 指定的方法是否存在（例如 `openById`、`getActivePresentation`）
   - 方法的參數與回傳值是什麼

2. 如果沒找到，不要硬寫；改成：

   - 找類似功能的 API
   - 或告訴使用者「官方目前沒有提供這樣的 API」

### 4.2 不要亂加 manifest 欄位

錯誤示例：

```json
{
  "timeZone": "Asia/Taipei",
  "unknownFeatureToggle": true
}
````

正確做法：

* 所有 `appsscript.json` 欄位都應該能在 manifest 官方文件裡找到對應說明。
* 如需使用進階設定（例如 Add-on 的 `addOns` 部分），請先找一個官方範例再改寫。

---

## 5. 在 PR / 註解裡標註參考來源（建議）

當你引入一個比較不直覺的設定 / API 時，建議在程式碼註解或 PR 說明裡加上一兩行：

例如：

```js
// 參考官方範例：Apps Script Slides quickstart
// https://developers.google.com/apps-script/samples/docs/slides-simple
function createSlidesDeckFromTemplate() {
  ...
}
```

或在 `appsscript.json` 旁加註：

```jsonc
// Manifest 結構參考：
// https://developers.google.com/apps-script/concepts/manifests
{
  "timeZone": "Asia/Taipei",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

這樣未來人的維護成本會低很多，你自己也比較不容易忘記當初為什麼要這樣寫。

---

## 6. 小結

* 遇到不確定的 Apps Script API / manifest 欄位時：

  1. 查官方文件
  2. 查 sample repo
  3. 找不到就不要亂編，直接跟使用者說明限制

* 如果你根據某個文件或範例實作，最好在註解或 PR 說明裡附上來源，方便後續維護。

```

---

如果你想，我也可以幫你把這些內容再微調成「更精簡版」或「更偏英文版」，或是幫你補一份 `docs/AGENTS-*.md` 的目錄說明 👍
```
