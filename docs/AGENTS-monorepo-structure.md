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

- `AGENTS.md`（Router）
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

> 想了解整體「git push → GitHub Actions → `clasp push`」的部署心智圖，請直接看 `AGENTS-deploy-workflow.md` 的第 1 節，避免兩邊文件內容重複而產生分歧。

---

## 2. Monorepo 目錄結構

標準結構（示意）：

```text
.
├─ AGENTS.md
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
⚠️ 如果使用者還沒提供 Script ID，就不要寫 `.clasp.json`；請立即回報並等待對方給出正確 ID。

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
