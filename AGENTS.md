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

2. **在撰寫或修改任何 Apps Script 程式碼之前，一定要先查 `shared/google-apps-script-api-reference/`，並在對話中回報你查了哪些索引 / 參考**
   - 先開 `keyword-index/` 找到相關服務與概念，再跳到 `full-reference/` 確認 API／參數與官方連結。
   - 在正式開始寫程式之前，把你查到的關鍵檔案（例如 `keyword-index/slides.md`、`full-reference/slides.md`）寫進回覆裡，這是強制前置步驟。
   - 這個 vendor library 是寫 GAS 程式碼前的強制前置步驟，避免憑空生出 API 或錯誤的 manifest 設定。

3. **任何改動前，一定要先確認 Active Project**
   - 不可以自己猜，必須請使用者指名專案資料夾，例如：
     - `apps-script/gas-main-app/`
     - `apps-script/gas-second-app/`
   - ⚠️ 專案名稱格式必須是：`apps-script/{project-folder}/`
     例如：`apps-script/report-a/`、`apps-script/report-c/`。
   - 使用者如果只說「我要開一個新的」而沒給 slug，務必主動提出候選名稱（詳見 `docs/AGENTS-project-selection.md` §2.3），不要把決定丟回給對方。

4. **沒有得到使用者提供的 Script ID 之前，禁止建立或修改 `.clasp.json`，也不要把該資料夾加進 deploy matrix**
   - 任何新專案都必須先由使用者給 Script ID，再照 `docs/AGENTS-onboarding-flows.md` Flow 2 / Flow 3 操作。
   - 不可以自己編造、猜測或填入 placeholder Script ID；遇到缺失就立刻停下來並追要資訊。
   - `.github/workflows/deploy-gas.yml` 現在會在每次 deploy 前檢查 `.clasp.json` 是否存在且 `scriptId` 是非空且符合理論格式，缺失就會失敗；這個 guard 用來提醒你「未完成 onboarding 的專案不要在 `matrix.project` 裡」。

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
  - 👉 `docs/AGENTS-reference-gas.md`（內含查 `shared/google-apps-script-api-reference/` 的流程）

---

## 寫 GAS 之前一定要完成的 Reference Check

> 這個檢查清單是強制的，只要任務包含任何 GAS 程式 / manifest 修改，就要逐條完成並在回覆裡報告結果。

1. **指明這次要用到的服務或概念**（例如 Slides、Sheets、Triggers）。
2. **打開 `shared/google-apps-script-api-reference/keyword-index/` 找到對應頁面**，並記下檔名。
3. **跳到 `full-reference/` 的同名頁面確認 API / 參數 / 官方連結**。
4. **如果要改 manifest，另外查官方 manifest schema**（`docs/AGENTS-reference-gas.md` §2）。
5. **把你查閱的檔名、段落或官方 URL 寫進回覆裡**，作為「我已經完成 Reference Check」的證明。

沒有完成以上步驟，不可以開始寫任何 GAS 程式碼或 manifest。

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


