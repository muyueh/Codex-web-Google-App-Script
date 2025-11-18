# AGENTS-project-selection.md

## 這份文件在解決什麼事？

在這個 monorepo 裡，同一時間你只能有一個（或少數明確指定的）**Active Project**。  
這份文件定義：

1. 什麼叫 Active Project
2. 怎麼跟使用者對齊「現在要動哪一個專案」
3. 允許 / 不允許的跨專案操作

搭配根目錄的 `AGENTS.md`（Router），這裡是詳細版規則與對話樣板。

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
