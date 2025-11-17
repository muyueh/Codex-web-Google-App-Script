# clasp-from-fresh

```mermaid
gitGraph
  commit id: "initial-commit"
  branch codex/setup-gas-monorepo
  commit id: "taipei-500-form-gas"
  checkout main
  merge codex/setup-gas-monorepo id: "merge-pr-1"
  branch work
  checkout work
  commit id: "harden-clasp-deploy"
  commit id: "script-id-secret" tag: "work@HEAD"
```

```mermaid
stateDiagram-v2
    state "Local repo" as Local
    state "GitHub" as GitHub
    state "GitHub Actions" as GHA
    state "Secret vault (CLASPRC_JSON)" as Secrets
    state "Secret vault (Script IDs)" as ScriptSecrets
    state "Google Apps Script" as GAS
    Local --> GitHub: git push (main)
    GitHub --> GHA: trigger deploy workflow
    GHA --> Secrets: fetch CLASPRC_JSON
    Secrets --> GHA: write ~/.clasprc.json (chmod 600)
    GHA --> GHA: clasp login --status
    GHA --> ScriptSecrets: request scriptId
    ScriptSecrets --> GHA: jq patch .clasp.json
    GHA --> GAS: clasp push -f
    GHA --> Local: sanitized ::error:: if auth fails
    GAS --> Local: Execution log / edit URL
```

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Repo as GitHub Repo
    participant CI as Deploy Workflow
    participant Secret as Secret Vault (CLASPRC_JSON)
    participant ScriptSecret as Secret Vault (Script IDs)
    participant GAS as Google Apps Script
    Dev->>Repo: Commit form changes
    Repo-->>CI: Push event on main
    CI->>CI: npm install + clasp install
    CI->>Secret: Request CLASPRC_JSON
    Secret-->>CI: ~/.clasprc.json contents
    CI->>CI: chmod 600 ~/.clasprc.json
    CI->>CI: clasp login --status (fails sanitized on error)
    CI->>ScriptSecret: Request taipei-500-form scriptId
    ScriptSecret-->>CI: Provide scriptId
    CI->>CI: jq patch .clasp.json
    CI->>GAS: clasp push -f apps-script/taipei-500-form
    GAS-->>CI: Deployment result
    CI-->>Dev: Workflow summary
```

```mermaid
flowchart LR
    Dev[Developer]
    Repo[Monorepo]
    Secrets[GitHub Secret: CLASPRC_JSON]
    ScriptIdSecret[GitHub Secret: TAIPEI_500_FORM_SCRIPT_ID]
    Workflow[Deploy Workflow]
    GAS[Apps Script Project]
    Form[Google Form]
    Dev -->|clasp / git| Repo
    Repo -->|CI trigger| Workflow
    Workflow -->|reads| Secrets
    Secrets -->|writes ~/.clasprc.json + chmod 600| Workflow
    Workflow -->|requests scriptId| ScriptIdSecret
    ScriptIdSecret -->|jq patch .clasp.json| Workflow
    Workflow -->|validate + matrix push| GAS
    GAS -->|renders| Form
    Form -->|responses| GAS
```

```mermaid
flowchart LR
    subgraph Users
        A[提名人]
        Maint[維運者]
    end
    subgraph Frontend
        Form[Google Form: 台北 500 盤評選]
    end
    subgraph Backend
        CI[Deploy Workflow]
        Secret[CLASPRC_JSON]
        ScriptSecret[Script ID Secret]
        Script[Apps Script builder]
        Perms[chmod 600]
    end
    A -->|填寫| Form -->|Responses| Script
    Script -->|Creates/updates form| Form
    Maint -->|監控| CI -->|安全驗證| Secret
    Maint -->|維護| ScriptSecret
    Secret -->|寫 ~/.clasprc.json| CI -->|chmod 600| Perms
    ScriptSecret -->|注入 scriptId| CI -->|jq patch .clasp.json| Script
    CI -->|push| Script
```

## Google Apps Script 專案結構與部署規則

本 repo 採用 monorepo 方式管理所有 Google Apps Script（GAS）專案；所有 GAS 專案都放在 `apps-script/` 目錄底下，每一個子資料夾對應到一個獨立的 Apps Script 專案。

### 資料夾結構

```text
apps-script/
  taipei-500-form/
    .clasp.json       # CI 會依據 GitHub Secret 注入 scriptId，rootDir 固定為 "."
    appsscript.json   # GAS manifest，已設定 Asia/Taipei 與所需 scopes
    Code.js           # 建立「台北 500 盤評選」Google Form 的程式碼

shared/
  example-utils.js    # 可複製到各專案使用的共用工具示範

package.json          # 共用工具鏈（clasp、lint、format）
package-lock.json     # npm 安裝鎖定檔
```

### 命名與設定規則

* 專案資料夾名稱一律使用小寫 + `-`（kebab-case），例如 `taipei-500-form`。
* 每個專案資料夾內必須有自己的 `.clasp.json`，並且 `"rootDir": "."`，讓 `clasp push` 只部署該子資料夾。
* 共用的工具或設定（`shared/`、`package.json`、`.github/` 等）放在 repo 根目錄，供所有 Apps Script 專案共用。

### 部署流程（GitHub Actions）

* `.github/workflows/deploy-gas.yml` 在 `main` 推送或手動觸發時啟動。
* Workflow 使用 matrix，一筆一專案。目前只包含 `apps-script/taipei-500-form`，未來可再加入其他子資料夾。
* 每個 matrix 工作都會：
  1. 安裝 Node.js 20 與 `@google/clasp@^3.1.0`。
  2. 將 GitHub Secret `CLASPRC_JSON` 寫入 `~/.clasprc.json` 並立即 `chmod 600` 鎖定權限。
  3. 執行 `clasp login --status` 以確認授權（失敗時輸出 sanitized `::error::`）。
  4. 透過 `jq` 以 GitHub Secret `TAIPEI_500_FORM_SCRIPT_ID`（或後續新增的 scriptId Secret）覆寫專案內的 `.clasp.json`。
  5. 在對應子資料夾下執行 `clasp push -f` 完成部署。

### 必要 Secrets

| Secret 名稱 | 內容 | 用途 |
| --- | --- | --- |
| `CLASPRC_JSON` | `clasp login --no-localhost` 產生的 `~/.clasprc.json` 全文 | 重建 `~/.clasprc.json` 並限制權限，以便 CI 對 Google 帳戶驗證 |
| `TAIPEI_500_FORM_SCRIPT_ID` | `apps-script/taipei-500-form` 實際 scriptId（例：`1abc...`） | 由 CI 以 `jq` 寫入 `.clasp.json`，確保 `clasp push -f` 指向正確專案 |

### 新增專案流程

1. 在 `apps-script/` 底下建立新的 `<project-name>/` 資料夾（kebab-case）。
2. 在該資料夾中執行 `clasp create` 或 `clasp clone` 產生 `.clasp.json` 與 `appsscript.json`。
3. 建立專案程式碼後，更新 `README.md`（包含 Mermaid 圖）與 `.github/workflows/deploy-gas.yml` 的 matrix。
4. 提交變更並推送到 `main`，GitHub Actions 會自動針對所有列出的專案 `clasp push -f`。

## 「台北 500 盤評選」Google Form 內容

`apps-script/taipei-500-form/Code.js` 會建立並維護專屬的 Google Form，重複部署可確保題目順序一致：

* **提名人資訊**：姓名、聯絡方式、參與身份（含其他選項）。
* **餐廳與料理提名**：餐廳名稱、行政主廚、行政區（下拉選單覆蓋台北 12 區與外縣市）、必吃料理、推薦理由、體驗評分（1–5 分 Likert）。
* **用餐經驗**：造訪頻率（可複選）、心得與建議、是否願意接受專訪。
* **補充資料**：照片／影音連結、上傳佐證資料（最多 5 個檔案，每個 10 MB）、給評選團隊的悄悄話。

主要函式：

* `deployTaipei500Form`：CI/CD 驗證入口，重建表單並在日誌輸出編輯連結。
* `buildTaipei500Form`：設定表單標題、描述、題目與必填規則。
* `resetTaipei500FormId`：清除 Script Properties 中的 Form ID，可在需要時重新建立全新表單。

## 本機開發與測試

1. 安裝依賴：`npm install`（已生成 `package-lock.json`）。
2. 全域安裝 `@google/clasp@^3.1.0` 並 `clasp login --no-localhost`，將 `~/.clasprc.json` 內容存入 GitHub Secret `CLASPRC_JSON`。
3. 在 `apps-script/taipei-500-form` 內設定正確的 `scriptId`（可使用 CI Secret 的值）後，執行 `clasp push` 或 `clasp pull` 以同步 Google Apps Script 專案。
4. 將變更推送到 `main` 或以 `workflow_dispatch` 手動觸發部署工作，確認 CI 內 `Deploy Google Apps Script (monorepo)` workflow 全數成功。
