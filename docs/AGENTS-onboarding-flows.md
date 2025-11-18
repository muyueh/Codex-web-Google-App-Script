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

沿用 `AGENTS-project-selection.md` 裡的「列出現有專案」指令與對話樣板，取得 `apps-script/` 底下所有資料夾並請使用者用完整路徑指名 Active Project。這裡不再重複指令，避免兩邊文件內容不同步。

### 2.2 檢查選定專案的結構

依 `AGENTS-monorepo-structure.md` 第 5、7 節的 checklist 驗證專案：

1. `.clasp.json` 要存在，並含 `scriptId` + `"rootDir": "."`。
2. `appsscript.json` 必須存在；若缺少，先回報並提議補 manifest。
3. 所有 `*.gs` / `*.js` / `src/**` 檔案都應該待在該專案資料夾內。

只要抓重點條目提醒使用者即可，細節則由結構文件統一維護，避免兩份文件分叉。

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

### 3.5 把新專案加到 CI matrix

回到 repo root 之後，直接照 `AGENTS-deploy-workflow.md` 第 3 節的指示更新 `.github/workflows/deploy-gas.yml` 的 `matrix.project`。該文件已經提供完整 YAML 範例，這裡只提醒「記得新增 `apps-script/gas-your-slug-here` 並向使用者回報」。

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

> **立刻提醒**：只要使用者說「要新開一個專案」，你就必須同時做到兩件事：
>
> 1. 主動提出一個 `gas-<slug>`（參考 `AGENTS-project-selection.md` §2.3），請對方確認或修正。
> 2. 引導對方到 Apps Script UI 建立新專案並取得 Script ID，接著再回傳給你。
>
> 這段提醒要和第一時間的回覆一起送出，避免忘記要 Script ID。

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
