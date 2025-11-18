# AGENTS Router – GAS Monorepo


這份檔案只負責兩件事：

1. 告訴你最核心的幾條規則（TL;DR）
2. 告訴你「遇到什麼情境要去看哪一份 `docs/AGENTS-*.md`」

---

## 如何搭配 `README.md` 使用

`README.md` 解釋這個 monorepo 的檔案結構、命名規範與 CI 行為；`AGENTS.md` 則是你在執行任務時的 Router。常見的流程如下：

1. 先用 `README.md` 理解資料夾與 workflow 的整體架構。
2. 回到 `AGENTS.md` 決定該情境要開哪一份 `docs/AGENTS-*.md`。
3. 在專屬文件裡照著 checklist 執行操作並回報結果。

> **重點：** `README.md` 是背景知識，`AGENTS.md` 才是日常執行任務時必須遵守的路線圖。

---

## TL;DR：永遠記得這幾件事

1. **這是一個 Google Apps Script monorepo**  
   - 每個專案都在 `apps-script/gas-<slug>/` 裡。

2. **任何改動前，一定要先確認 Active Project**  
   - 不可以自己猜，必須請使用者指名專案資料夾，例如：  
     - `apps-script/gas-main-app/`  
     - `apps-script/gas-second-app/`  
   - ⚠️ 專案名稱格式必須是：`apps-script/{project-folder}/`  
     例如：`apps-script/report-a/`、`apps-script/report-c/`。

---

## Router：遇到什麼情境要看哪一份文件？

> **規則：** 遇到下列情境時，先用工具打開對應的 `docs/AGENTS-*.md`，裡面才是詳細流程。

- **選專案 / 切換專案 / Active Project 規則**
  - 👉 `docs/AGENTS-project-selection.md`

- **新環境、fork 之後、或 `clasp login` / Node / npm 有問題**
  - 👉 `docs/AGENTS-env-and-clasp-login.md`

- **GitHub Actions secret `CLASPRC_JSON` / CI 認證失敗 / fork 之後 CI 壞掉**
  - 👉 `docs/AGENTS-ci-secret-clasprc-json.md`

- **整體 monorepo 結構、每個 Apps Script 專案要有哪些檔案（`.clasp.json` / `appsscript.json` 等）**
  - 👉 `docs/AGENTS-monorepo-structure.md`

- **Onboarding：Fork 這一個 repo 之講的新設定 / 新增專案**
  - 使用既有 `apps-script/` 資料夾  
  - 每一個資料夾都必須要有一個 Script ID 連結 Apps Script 專案  
  - 在 Apps Script UI 建新專案再連結  
  - 👉 `docs/AGENTS-onboarding-flows.md`

- **GitHub Actions 部署流程、`.github/workflows/deploy-gas.yml`、`matrix.project` 設定**
  - 👉 `docs/AGENTS-deploy-workflow.md`

- **如何安全地改程式 / manifest / workflow，包含破壞性變更流程**
  - 👉 `docs/AGENTS-editing-workflow.md`

- **要查 Apps Script API、manifest schema 或 sample 範例**
  - 👉 `docs/AGENTS-reference-gas.md`

---

## 完整文件清單

> `docs/` 資料夾集中存放了所有可用的 AGENTS 指引，之後若新增文件也請補上列表。

- [docs/AGENTS-project-selection.md](docs/AGENTS-project-selection.md)
- [docs/AGENTS-env-and-clasp-login.md](docs/AGENTS-env-and-clasp-login.md)
- [docs/AGENTS-ci-secret-clasprc-json.md](docs/AGENTS-ci-secret-clasprc-json.md)
- [docs/AGENTS-monorepo-structure.md](docs/AGENTS-monorepo-structure.md)
- [docs/AGENTS-onboarding-flows.md](docs/AGENTS-onboarding-flows.md)
- [docs/AGENTS-deploy-workflow.md](docs/AGENTS-deploy-workflow.md)
- [docs/AGENTS-editing-workflow.md](docs/AGENTS-editing-workflow.md)
- [docs/AGENTS-reference-gas.md](docs/AGENTS-reference-gas.md)

---

## 一句話總結

> 在你「改任何檔案」之前：先問清楚 Active Project，然後只在那個專案允許的範圍內動手；遇到特定情境，就打開上面對應的 `docs/AGENTS-*.md` 照著做。


