# AGENTS-project-selection.md

## 這份文件在解決什麼事？

在這個 monorepo 裡，同一時間你只能有一個（或少數明確指定的）**Active Project**。  
這份文件定義：

1. 什麼叫 Active Project
2. 怎麼跟使用者對齊「現在要動哪一個專案」
3. 允許 / 不允許的跨專案操作

搭配根目錄的 `AGENTS.md`（Router），這裡是詳細版規則與對話樣板。

---

## 0. Active Project flag 檔

這個 monorepo 新增了一個 flag 檔來記錄「現在正在處理哪一個專案」。

```
apps-script/.active-project
```

規則：

* 內容永遠只有一行、只放 Active Project 的完整路徑，例如：`apps-script/gas-main-app/`。
* 路徑格式必須符合 `apps-script/{project-folder}/`，並且尾端要保留 `/`。
* 這個檔案只提供 Agent 用的狀態，不參與 CI。

### 0.1 動手前一定要讀 flag 檔

每次開始任務前都要先確認現在的 flag：

```bash
cat apps-script/.active-project 2>/dev/null || echo "no-active-project-flag"
```

讀取結果後依下列情境處理：

1. **沒有 flag 或內容是空的**

   > 現在沒有 Active Project flag。請指定這次要改哪一個專案，例如：`apps-script/gas-main-app/`。

   使用者確認後寫入檔案：

   ```bash
   printf '%s\n' 'apps-script/gas-main-app/' > apps-script/.active-project
   ```

2. **有 flag，且資料夾存在**

   > 我目前看到 Active Project flag 是：`apps-script/gas-main-app/`。
   > 這次要繼續在這個專案上改嗎？

   * 如果使用者回覆「是」或明講「就用這個」，沿用原值。
   * 如果使用者改指定另一個專案，視為切換（見 0.2 節），覆寫檔案。

3. **有 flag，但資料夾不存在**

   > `.active-project` 記錄的是 `apps-script/gas-old-app/`，但這個資料夾現在不存在了。請重新指定這次要用的專案路徑，例如：`apps-script/gas-main-app/`。

   取得新路徑後覆寫 flag。

### 0.2 切換 Active Project 時要先確認

當使用者描述看起來要換專案時：

1. 先說出目前 flag 內容，例如：

   > 目前 Active Project flag 是：`apps-script/gas-main-app/`。你剛剛提到要改 `apps-script/gas-second-app/`。要不要把 Active Project 切換成 `apps-script/gas-second-app/`？（切換後我後續都只會改 second app）

2. 只有在使用者明確回覆 OK / 確認後，才覆寫檔案：

   ```bash
   printf '%s\n' 'apps-script/gas-second-app/' > apps-script/.active-project
   ```

3. 在回覆中說明：

   > 已更新 Active Project flag：`apps-script/.active-project` 現在是 `apps-script/gas-second-app/`。接下來所有修改都只會針對這個專案。

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

### 2.3 使用者說「我要開一個全新的專案」

當對方明確表示「這次要做一個新的 Apps Script 專案」但還沒給 slug 時：

1. **主動提出候選資料夾名稱**：用需求關鍵詞組成 `gas-<kebab-case>`，例如「李慕約簡報」→ `gas-li-mu-yue-slides`。
2. 直接在回覆裡附上完整路徑（含 `apps-script/` 與最後的 `/`），並請對方只要回答「確認」或提供替代 slug。
3. 只有在得到確認後，才把 `.active-project` 切換成新路徑並進入 Onboarding Flow（見 `docs/AGENTS-onboarding-flows.md`）。

回覆樣板：

> 目前 `.active-project` 是 `apps-script/gas-main-app/`，但你這次要一個新專案。
> 我先建議用 `apps-script/gas-li-mu-yue-slides/`，這個命名對應李慕約簡報。
>
> 如果你同意，我會把 Active Project 切過去並開始建資料夾；若想換別的 slug，也請直接回覆完整路徑。

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

### 5.4 使用者說「這次要新開一個專案」

> 我會先幫這個主題取一個 slug，例如 `gas-li-mu-yue-slides`，完整路徑是：
>
> * `apps-script/gas-li-mu-yue-slides/`
>
> 請回覆「確認」或提供你要的 slug。如果確認，我會立刻把 Active Project flag 改成這個新路徑，然後依 `AGENTS-onboarding-flows.md` 指南把新專案連回 Apps Script。

---

## 6. 小結

* **任何改動前都要先確認 Active Project**。
* Active Project 一律用 `apps-script/{project-folder}/` 的路徑表示。
* 多專案時，要把所有專案路徑明列並得到確認。
* 不要自己猜哪個專案是「現在要改的那個」。
