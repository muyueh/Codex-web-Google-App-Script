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
  commit id: "script-id-secret"
  commit id: "single-folder-refactor"
  commit id: "graceful-secret-check"
  commit id: "form-diagnostics"
  commit id: "script-id-in-repo" tag: "work@HEAD"
```

```mermaid
stateDiagram-v2
    state "Taipei 500 Form project" as Project
    state "GitHub Repo (.clasp.json with scriptId)" as Repo
    state "GitHub Actions" as GHA
    state "Secret vault (CLASPRC_JSON)" as Secrets
    state "Secret availability gate" as SecretGate
    state "Google Apps Script" as GAS
    state "Form diagnostics" as Diagnostics
    Project --> Repo: git push (main)
    Repo --> GHA: trigger deploy workflow
    GHA --> SecretGate: verify secrets
    SecretGate --> Project: skip deploy (if missing)
    SecretGate --> Secrets: fetch CLASPRC_JSON
    Secrets --> GHA: write ~/.clasprc.json (chmod 600)
    GHA --> GHA: clasp login --status
    SecretGate --> GHA: unblock deployment
    GHA --> GAS: clasp push -f (uses repo scriptId)
    GAS --> Project: Execution log / edit URL
    GAS --> Diagnostics: 手動執行 logTaipei500FormSummary
    Diagnostics --> Project: 區段與題目統計（JSON）
```

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Maint as Maintainer
    participant Repo as GitHub Repo
    participant CI as Deploy Workflow
    participant Secret as Secret Vault (CLASPRC_JSON)
    participant Config as .clasp.json (scriptId)
    participant GAS as Google Apps Script
    Dev->>Repo: Commit form changes
    Repo-->>CI: Push event on main
    CI->>CI: npm install + clasp install
    CI->>CI: Check required secrets (CLASPRC_JSON only)
    alt Secrets missing
        CI-->>Dev: Skip deploy + warn
    else Secrets available
        CI->>Secret: Request CLASPRC_JSON
        Secret-->>CI: ~/.clasprc.json contents
        CI->>CI: chmod 600 ~/.clasprc.json
        CI->>CI: clasp login --status (fail fast if invalid)
        CI->>Config: Read repo .clasp.json
        CI->>GAS: clasp push -f taipei-500-form
        GAS-->>CI: Deployment result
        CI-->>Dev: Workflow summary
    end
    Maint->>GAS: logTaipei500FormSummary()
    GAS-->>Maint: Question & section breakdown
```

```mermaid
flowchart LR
    Dev[Developer]
    Repo[Repo (taipei-500-form)]
    Secrets[GitHub Secret: CLASPRC_JSON]
    SecretCheck[Secret availability gate]
    Workflow[Deploy Workflow]
    ClaspConfig[.clasp.json (scriptId in repo)]
    GAS[Apps Script Project]
    Form[Google Form]
    Dev -->|clasp / git| Repo
    Repo -->|CI trigger| Workflow
    Workflow -->|checks| SecretCheck
    SecretCheck -->|needs| Secrets
    Secrets -->|writes ~/.clasprc.json + chmod 600| Workflow
    SecretCheck -->|unblocks| Workflow
    Repo -->|provides scriptId| ClaspConfig -->|read during deploy| Workflow
    SecretCheck -->|warn + skip| Dev
    Workflow -->|clasp push -f| GAS
    GAS -->|renders| Form
    Form -->|responses| GAS
    Maint[Maintainer]
    Diagnostics[Form diagnostics helper]
    Maint -->|manual QA| Diagnostics
    Diagnostics -->|read-only access| GAS
    Diagnostics -->|section snapshot| Maint
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
        SecretGate[Secret availability gate]
        Secret[CLASPRC_JSON]
        ClaspConfig[Repo .clasp.json (scriptId)]
        Script[Apps Script builder]
        Perms[chmod 600]
        Diagnostics[Form diagnostics helper]
    end
    A -->|填寫| Form -->|Responses| Script
    Script -->|Creates/updates form| Form
    Maint -->|監控| CI -->|安全驗證| SecretGate
    SecretGate -->|檢查| Secret
    Maint -->|維護| Repo + Script
    Secret -->|寫 ~/.clasprc.json| CI -->|chmod 600| Perms
    ClaspConfig -->|scriptId 與 rootDir| CI
    CI -->|push (when secrets ok)| Script
    Maint -->|手動執行 logTaipei500FormSummary / getTaipei500FormItemSnapshot| Diagnostics
    Diagnostics -->|讀取表單題目| Script
    Diagnostics -->|輸出統計| Maint
```

## Taipei 500 Form Google Apps Script project

這個 repo 現在只追蹤一個 Google Apps Script 專案，所有程式碼都集中在 `taipei-500-form/` 目錄，讓流程維持「GAS code → repo → GitHub Action → GAS」的單一路徑。

### 資料夾結構

```text
.
├── .github/workflows/deploy-gas.yml  # 單一 workflow，部署 taipei-500-form
├── README.md                         # 本說明文件與 Mermaid 示意
├── package.json / package-lock.json  # 共用的 clasp 套件版本
└── taipei-500-form/
    ├── .clasp.json                   # 直接紀錄 scriptId，clasp push/pull 可立即識別專案
    ├── appsscript.json               # GAS manifest，Asia/Taipei + scopes
    ├── Code.js                       # 建立「台北 500 盤評選」Google Form
    └── FormDiagnostics.js            # 區段與題目統計的手動 QA 入口
```

### scriptId 與憑證策略

* `scriptId` 本質上只是專案識別碼，不會提供讀寫權限；真正需要保密的是 `CLASPRC_JSON` 或 service account 憑證。
* 因此，每個子資料夾的 `.clasp.json` 都直接提交到 repo，方便 `clasp push/pull` 立即找對專案，也避免為每個 Apps Script 再新增 GitHub Secret。
* GitHub Actions 只需一個 Secret（`CLASPRC_JSON`），寫入 `~/.clasprc.json` 後就能部署，無須再 patch `.clasp.json`。


### 部署流程（GitHub Actions）

* `.github/workflows/deploy-gas.yml` 會在 `main` 推送或手動觸發後執行。
  * Workflow 步驟：
    1. 安裝 Node.js 20 與 `@google/clasp@^3.1.0`。
    2. 在執行部署前確認 `CLASPRC_JSON` Secret 是否存在；若缺少就發出警告並跳過其餘步驟。
    3. 將 GitHub Secret `CLASPRC_JSON` 寫入 `~/.clasprc.json` 並 `chmod 600`。
    4. 以 `clasp login --status` 驗證憑證是否可用。
    5. 在 `taipei-500-form/` 下執行 `clasp push -f` 部署表單，`scriptId` 直接來自 repo 內的 `.clasp.json`。

### 必要 Secrets

| Secret 名稱 | 內容 | 用途 |
| --- | --- | --- |
| `CLASPRC_JSON` | `clasp login --no-localhost` 產生的 `~/.clasprc.json` | 還原 clasp 登入資訊以供 CI 驗證 |

### 「台北 500 盤評選」Google Form 內容

`taipei-500-form/Code.js` 會建立與更新專屬的 Google Form，重複部署可確保題目與必填規則一致：

* **提名人資訊**：姓名、聯絡方式、參與身份（含其他選項）。
* **餐廳與料理提名**：餐廳名稱、行政主廚、行政區（台北 12 區 + 外縣市）、必吃料理、推薦理由、體驗評分（1–5 分 Likert）。
* **用餐經驗**：造訪頻率（可複選）、心得與建議、是否願意接受專訪。
* **補充資料**：照片／影音連結、上傳佐證資料（最多 5 個檔案，每個 10 MB）、給評選團隊的悄悄話。

主要函式：

* `deployTaipei500Form`：CI/CD 入口，重建表單並在日誌輸出編輯連結。
* `buildTaipei500Form`：設定表單標題、描述、題目與必填規則。
* `resetTaipei500FormId`：清除 Script Properties 中的 Form ID，以便重新建立全新表單。
* `logTaipei500FormSummary`：讀取既有表單並輸出各區段的題型統計，方便在 Apps Script 新檔案中檢查內容。
* `getTaipei500FormItemSnapshot`：產出 JSON 陣列，列出各節與題目標題，可貼回 issue 或 PR 協助審閱。

### 手動 QA：FormDiagnostics.js

當在 Apps Script 新增檔案或需要檢查題目順序時，可在 Apps Script 編輯器內執行：

1. `logTaipei500FormSummary`：於日誌顯示每個區段的題目數與題型分佈。
2. `getTaipei500FormItemSnapshot`：在日誌輸出 JSON 結構，可複製到其他系統或 PR 描述中。

這些函式只讀既有表單，不會刪除或新增題目。

### 本機開發與測試

1. 安裝依賴：`npm install`（已生成 `package-lock.json`）。
2. 全域安裝 `@google/clasp@^3.1.0` 並 `clasp login --no-localhost`，將 `~/.clasprc.json` 內容存入 GitHub Secret `CLASPRC_JSON`（供 CI 使用）。
3. 確認 `taipei-500-form/.clasp.json` 內的 `scriptId` 為欲同步的 Apps Script 專案後，直接執行 `clasp push` 或 `clasp pull`。
4. 推送到 `main` 或以 `workflow_dispatch` 手動觸發部署 workflow，確認 `Deploy Taipei 500 Form` 全數成功。
