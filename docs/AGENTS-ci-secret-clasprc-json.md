# AGENTS-ci-secret-clasprc-json.md

## 這份文件在解決什麼事？

這份文件專門處理：

- GitHub Actions 的 Apps Script 部署為什麼需要 `CLASPRC_JSON`
- 如何在 GitHub 上建立 / 更新這個 secret
- Fork 之後 CI 為什麼會壞掉，以及要怎麼修

---

## 1. CLASPRC_JSON 是什麼？

在本機跑 `clasp login` 時，`clasp` 會在使用者家目錄寫一份檔案：

```text
~/.clasprc.json
````

內容包含：

* OAuth credentials（存取 Apps Script / Drive 的 token 等）
* 讓 `clasp` 在沒有互動的情況下也能跟 Google APIs 溝通

在 CI（GitHub Actions）裡，沒辦法互動式登入，所以我們：

1. 把本機的 `~/.clasprc.json` 內容存成一個 GitHub Actions secret：`CLASPRC_JSON`
2. 在 workflow 裡，讀取這個 secret，寫回 CI 的 `~/.clasprc.json`
3. 然後 `clasp` 在 CI 裡就能正常跑 `clasp login --status` 和 `clasp push -f`

---

## 2. 先問使用者的一句話

在你打算處理 CI / 部署問題時，先問：

> 這個 GitHub repo（或 fork）裡，現在已經有一個名為
> `CLASPRC_JSON` 的 Actions secret 了嗎？

* 如果使用者回答 **有**：

  * 不要主動要求他們重新產生，除非：

    * token 過期 / workflow log 顯示認證錯誤
    * 使用者自己說要換帳號或重設
* 如果使用者回答 **沒有 / 不確定**：

  * 引導他們照下面步驟建立 / 更新。

---

## 3. 如何建立 / 更新 `CLASPRC_JSON`

### 3.1 在本機取得 `~/.clasprc.json`

1. 確保本機已經用正確的 Google 帳號登入 `clasp`：

   ```bash
   clasp login --status
   ```

2. 在本機終端機輸出這個檔案內容：

   ```bash
   cat ~/.clasprc.json
   ```

3. **選取並複製整段 JSON**（包含大括號 `{}`）
   ⚠️ 不要改任何內容。

### 3.2 在 GitHub 上設定 secret

1. 打開 GitHub 網頁 → 進入 **對應的 repo 或 fork**。

2. 點選：

   * **Settings**
   * 左側選單：**Secrets and variables → Actions**

3. 新增或更新一個 secret：

   * Name：**`CLASPRC_JSON`**（大小寫必須完全符合）
   * Secret value：貼上剛才複製的 `~/.clasprc.json` 內容

4. 儲存。

### 3.3 安全性提醒

告訴使用者：

* 不要把 `~/.clasprc.json` 內容貼到任何有 version control 的檔案裡。
* 不要把 secret value 貼在 Issue / PR / Chat 裡。
* 如果懷疑有外流風險，應該撤銷 OAuth 權限並重新 `clasp login` 產生新的 `~/.clasprc.json`，再更新 GitHub secret。

---

## 4. CI 裡怎麼使用 `CLASPRC_JSON`

在 `.github/workflows/deploy-gas.yml` 中，通常會呼叫這個 composite action：

```yaml
      - name: Restore clasp credentials from secret
        uses: ./.github/actions/restore-clasp-credentials
        with:
          clasprc-json: ${{ secrets.CLASPRC_JSON }}
```

這段的作用是：

1. 從 `${{ secrets.CLASPRC_JSON }}` 取得 secret 的值
2. 檢查是不是空的（如果沒設 secret 就會是空值），缺少時會印出錯誤訊息並引導你閱讀 `docs/AGENTS-ci-secret-clasprc-json.md`
3. 把內容原樣寫回 `$HOME/.clasprc.json`
4. 之後 `clasp login --status` / `clasp push -f` 都會使用這份檔案

---

## 5. Fork 之後 CI 為什麼壞掉？

GitHub 的設計是：

* **Secrets 不會跟著 fork 一起被複製過去。**

所以如果使用者：

1. Fork 了這個 monorepo
2. 在 fork 裡直接 push 到 `main`
3. CI workflow 跑起來，但 log 內出現：

   * `CLASPRC_JSON is missing`
   * 或 `clasp login` / `clasp push` 相關認證錯誤

很大機率是：

* Fork 裡根本沒有設定 `CLASPRC_JSON` secret

這時候你要提醒他們：

> 因為 GitHub 的安全性設計，fork 不會帶著原 repo 的 Actions secrets。
> 你需要在你自己的 fork 上，重新建立一個名為 `CLASPRC_JSON` 的 secret，
> 內容一樣是你本機的 `~/.clasprc.json`。

流程跟前面的「建立 / 更新 `CLASPRC_JSON`」完全相同，只是 repo 換成他們自己的 fork。

---

## 6. 常見錯誤與排查建議

### 6.1 Workflow log 提示：`CLASPRC_JSON is missing`

檢查：

1. GitHub → repo → Settings → Secrets and variables → Actions
2. 是否真的有一筆名為 `CLASPRC_JSON` 的 secret
3. 是否存錯成 e.g. `CLASP_RC_JSON` / `CLASPRC` / `CLASPRC-JSON` 等錯字

### 6.2 `clasp login --status` 在 CI 裡失敗

若 log 顯示類似：

* `Error: Could not read API credentials`
* `Invalid_grant` / `unauthorized_client`

可能原因：

* `~/.clasprc.json` 格式錯誤（貼的內容不完整或被編輯過）
* OAuth token 過期或被撤銷
* 使用的 Google 帳號沒有權限存取那些 Apps Script 專案

建議做法：

1. 在本機重新 `clasp login`，確認能操作該 Apps Script 專案。
2. 重新輸出 `cat ~/.clasprc.json`，建立新的 `CLASPRC_JSON` secret。
3. 再跑一次 CI workflow。

---

## 7. 小結

* `CLASPRC_JSON` = 把本機 `~/.clasprc.json` 放進 GitHub Actions secret。
* CI workflows 會把這個 secret 還原成 `~/.clasprc.json` 來使用 `clasp`。
* Fork 不會複製 secrets，fork 後要重新設一次。
* 遇到 CI 認證錯誤時，先檢查 secret 是否存在、拼字是否正確、內容是否最新。
