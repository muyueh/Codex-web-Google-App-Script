# AGENTS-env-and-clasp-login.md

## 這份文件在解決什麼事？

如果你遇到：

- 新環境 / 新機器 / 新 Codespace / 新 fork
- `clasp` 找不到或版本太舊
- Node / npm 沒裝
- `clasp login --status` 失敗

請照這份文件的步驟檢查環境與登入狀態。

---

## 1. 確認目前在 repo root

先確定你真的在這個 monorepo 的根目錄。

```bash
pwd
ls
````

你應該會看到類似：

* `.git/`
* `AGENTS.md`
* `.github/`
* `apps-script/`
* `shared/`
* `package.json`
* `README.md`

如果沒有看到 `apps-script/` 或 `.github/`，很可能你不在 repo root，請先 `cd` 到正確位置。

---

## 2. 確認 Node 與 npm 有安裝

在任何地方（建議在 repo root）執行：

```bash
node -v
npm -v
```

預期結果：

* 兩個指令都要有版本號輸出
* Node 版本大致上是 LTS 或更高（例如 `v18.x` / `v20.x`）

如果出現：

* `command not found: node` 或 `npm`
* 版本非常老舊（例如 < 14）

請告訴使用者：

> 這個環境沒有安裝（或正確安裝）Node / npm。
> 需要先安裝 Node.js（建議 LTS 版本，內含 npm），才能使用 `clasp` 和 CI 部署流程。

---

## 3. 安裝或確認 `clasp` 版本

### 3.1 安裝 `clasp` ≥ 3.x

如果 `clasp` 不存在或版本過舊，請執行：

```bash
npm install -g @google/clasp@^3.1.0
```

裝完後確認版本：

```bash
clasp -v
```

要求：

* 版本號要 **≥ 3.0.0**

如果還是找不到 `clasp`，請提醒使用者：

> `clasp` 安裝似乎沒有成功，或 `npm` 的 global 路徑沒有在 `PATH`。
> 請在本機環境手動安裝 `@google/clasp` 並確保 `clasp` 指令可用。

---

## 4. 檢查 `clasp` 登入狀態

在可以跑指令的環境中：

```bash
clasp login --status
```

可能狀況：

1. ✅ 已登入，顯示目前 Google 帳號
   → 確認使用者 OK 使用這個帳號部署 Apps Script。

2. ⚠️ 尚未登入 / token 過期 / 帳號錯誤
   → 進入重新登入流程。

---

## 5. 重新登入 `clasp`（建議用 `--no-localhost`）

如果需要重新登入，請執行：

```bash
clasp login --no-localhost
```

典型流程：

1. `clasp` 會在終端機印出一段 URL。

2. 你應該把這段 URL 貼給使用者，說明：

   > 請在瀏覽器開啟這個網址，授權你的 Google 帳號使用 Apps Script API，最後會得到一組 code，請貼回來。

3. 使用者貼回 code 之後，在終端機輸入該 code。

4. 再次確認：

   ```bash
   clasp login --status
   ```

   確定：

   * 已登入
   * 帳號是使用者期望用來部署 Apps Script 專案的那個

---

## 6. Fork / 新環境時要注意的事

**重要觀念：**

* `clasp login` 是「機器 / 環境」層級的設定。
* **每個新的環境（新 VM、新 Codespace、新 local clone）都要重新登入一次。**
* GitHub Actions 的 CI 不會直接用你本機的登入，而是用 `CLASPRC_JSON` secret（詳見 `AGENTS-ci-secret-clasprc-json.md`）。

如果使用者說：

* 「我在本機能 `clasp push`，但 CI 失敗」

  * 通常是 **GitHub secret(`CLASPRC_JSON`) 沒設好**，不是 `clasp login` 的問題。
* 「我換電腦後，這個專案不能 `clasp push` 了」

  * 新電腦要重新安裝 Node / `clasp`，並再走一次 `clasp login` 流程。

---

## 7. 小結

遇到 `clasp` / Node / npm 相關問題時：

1. 先確認自己在 repo root。
2. 檢查 Node / npm 是否存在。
3. 安裝 / 更新 `@google/clasp@^3.1.0`。
4. 用 `clasp login --status` 確認登入帳號。
5. 如有需要，再用 `clasp login --no-localhost` 重新登入。

CI 端使用的認證則由 `CLASPRC_JSON` secret 管理，細節見
`docs/AGENTS-ci-secret-clasprc-json.md`。
