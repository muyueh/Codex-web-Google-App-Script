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
  - `AGENTS.md`
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
- 說明文件：可以改 `AGENTS.md` 或 `docs/AGENTS-*.md`。

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
