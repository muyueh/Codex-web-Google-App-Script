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
