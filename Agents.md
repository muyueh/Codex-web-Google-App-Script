# Agents Playbook – Google Apps Script Monorepo

You are an AI agent (e.g. ChatGPT Codex Cloud) working in this repo to maintain a **Google Apps Script (GAS) monorepo**.  

The workspace is already wired for:

- [`@google/clasp` ≥ 3.x](https://developers.google.com/apps-script/guides/clasp)
- GitHub Actions deployments via `.github/workflows/deploy-gas.yml`
- One folder per Apps Script project under `apps-script/`
- A single GitHub secret `CLASPRC_JSON` for CI auth

Use this guide as the **source of truth** for what you may modify, how to inspect the current setup, and how to expand it safely.

---

## 0. Quick facts for this repo

This repo is **already** a GAS monorepo.

At the **repo root**, you should see:

- `Agents.md`
- `README.md`
- `package.json`
- `shared/`
- `.github/workflows/deploy-gas.yml`
- `apps-script/`

Existing Apps Script projects under `apps-script/`:

- `apps-script/gas-main-app/`
  - Contains `.clasp.json`, `appsscript.json`, and `Code.js` / `Code.gs` etc.
- `apps-script/gas-second-app/`
  - Contains `.clasp.json` and `README.md`
  - **Note:** `appsscript.json` is currently **missing** here; create one before pushing any code.
- `apps-script/gas-cat-cafe/`
  - Contains `.clasp.json`, `appsscript.json`, and `Code.gs` (Slides deck helper)

The CI workflow `.github/workflows/deploy-gas.yml`:

- Already exists
- Already deploys all listed folders via a **matrix job** (`matrix.project`)
- Runs `clasp push -f` once per project

Mental pipeline:

```text
Local edits (or Codex edits)
  → git commit / push
  → GitHub Actions
  → clasp push -f
  → Apps Script projects
````

When in doubt, ground yourself with:

```bash
pwd && ls
ls apps-script 2>/dev/null || echo "no apps-script directory"
cat .github/workflows/deploy-gas.yml 2>/dev/null || echo "missing deploy workflow"
```

---

## 1. Mental model

High-level pipeline:

```text
Developer / Codex → git commit/push → GitHub Actions → clasp push -f → Apps Script
```

Monorepo structure (example):

```text
.
├─ Agents.md
├─ README.md
├─ package.json
├─ shared/
├─ .github/
│  └─ workflows/
│     └─ deploy-gas.yml
└─ apps-script/
   ├─ gas-main-app/
   │  ├─ .clasp.json
   │  ├─ appsscript.json
   │  └─ Code.gs / Code.js / *.gs / *.js / src/…
   ├─ gas-second-app/
   │  ├─ .clasp.json
   │  ├─ appsscript.json   # <-- must be created if missing
   │  └─ Code.gs / Code.js / *.gs / *.js / src/…
   └─ gas-cat-cafe/
      ├─ .clasp.json
      ├─ appsscript.json
      └─ Code.gs / Code.js / *.gs / *.js / src/…
```

Principles:

* Every Apps Script project lives in `apps-script/gas-<slug>/`.
* Each project folder is **self-contained**:

  * `.clasp.json` with a valid `scriptId` and `"rootDir": "."`
  * `appsscript.json` manifest
  * All source files for that project
* GitHub Actions deploys each folder independently via a **matrix**.

When you’re confused, run:

```bash
pwd
ls
ls apps-script 2>/dev/null || echo "no apps-script directory"
cat .github/workflows/deploy-gas.yml 2>/dev/null || echo "no deploy-gas.yml yet"
```

---

## 2. Safety & editing rules

You **may**:

* Create and edit files under:

  * `apps-script/gas-<slug>/`
  * `shared/`
  * `.github/workflows/deploy-gas.yml`
  * `README.md`
  * `Agents.md`
* Edit `.clasp.json`, `appsscript.json`, and source files inside each project.
* Add or remove `apps-script/gas-<slug>` entries in the workflow matrix.
* Bump **minor** versions for Node, actions, or `@google/clasp` (e.g. `^3.1.0 → ^3.2.0`) if needed.

You **must not**:

* Commit or print secrets:

  * `CLASPRC_JSON`
  * OAuth tokens
  * Service account JSON
  * Any other credentials
* Change `scriptId` in existing `.clasp.json` files **unless** the user explicitly asks you to re-link a project.
* Delete or rename existing `apps-script/gas-*` folders without explicit human confirmation.
* Modify non-GAS workflows, license, or repository-wide policies unless the user clearly asks.

Before any **destructive** actions (renames, big deletions, moving many files):

1. Explain the plan to the user.
2. Wait for their approval.
3. Only then proceed.

---

## 3. Environment sanity checks (local / Codex)

Run these once per session or when something feels off.

### 3.1 Confirm repo root

```bash
pwd
ls
```

You should see `.git`, `Agents.md`, `.github/`, `apps-script/`, etc.

### 3.2 Confirm Node & npm

```bash
node -v
npm -v
```

If Node or npm is missing, tell the user they must be installed for `clasp` to work.

### 3.3 Install `clasp` ≥ 3.x

```bash
npm install -g @google/clasp@^3.1.0
clasp -v
```

Confirm `clasp` is installed and version is ≥ `3.0.0`.

### 3.4 Check `clasp` login (for this environment)

```bash
clasp login --status
```

* If logged in and the user is happy with that Google account → OK.
* If not logged in (or wrong account), run:

  ```bash
  clasp login --no-localhost
  ```

  Flow:

  1. `clasp` prints a URL → copy into chat for the user.
  2. User opens the URL, authorizes, and gets a code.
  3. User pastes the code in chat.
  4. You paste the code into the waiting terminal.
  5. Verify again:

     ```bash
     clasp login --status
     ```

---

## 4. GitHub secret `CLASPRC_JSON` (CI auth)

CI deployments rely on a **single** GitHub Actions secret:

* `CLASPRC_JSON` – full contents of the user’s local `~/.clasprc.json` created by `clasp login`.

You **cannot** read this secret from CI; you must ask the user.

### 4.1 Ask the user

Ask:

> Do you already have a GitHub Actions secret named `CLASPRC_JSON` on this repo (this fork)?

* If **yes**: do **not** rotate it unless they explicitly ask.
* If **no / not sure**: guide them to create or update it.

### 4.2 Creating / refreshing `CLASPRC_JSON`

In the user’s own environment (not necessarily Codex):

1. After a successful `clasp login`, they run:

   ```bash
   cat ~/.clasprc.json
   ```

2. They should:

   * Copy the **entire JSON** output.
   * Go to GitHub → this repo → **Settings → Secrets and variables → Actions**.
   * Create or update a secret named **`CLASPRC_JSON`** with that value.

3. Warn them:

   * Never commit this JSON.
   * Never paste it into tracked files.

### 4.3 How CI uses this secret

In `.github/workflows/deploy-gas.yml` the workflow:

* Reads `${{ secrets.CLASPRC_JSON }}`
* Writes it into `~/.clasprc.json` in the CI environment
* Then runs `clasp login --status` and `clasp push -f` for each project

Once `CLASPRC_JSON` is set, **no extra CI steps** are needed.

---

## 5. Ensure monorepo structure & inspect existing projects

From repo root, ensure base folders exist (they should already):

```bash
mkdir -p apps-script
mkdir -p shared
mkdir -p .github/workflows
```



### 5.1 List and inspect projects

List all project folders:

```bash
find apps-script -mindepth 1 -maxdepth 1 -type d | sort
```

For each folder (e.g. `apps-script/gas-main-app`, `apps-script/gas-second-app`, `apps-script/gas-cat-cafe`):

```bash
PROJECT_DIR="apps-script/gas-main-app"   # or gas-second-app / gas-cat-cafe
ls "$PROJECT_DIR"
cat "$PROJECT_DIR/.clasp.json"
```

Ensure:

* `.clasp.json` exists and has a `scriptId`.
* `rootDir` is `"."`. If not, patch it (see Flow 2 step 4 below).
* `appsscript.json` exists; if missing, create a **minimal** manifest (with user approval).
* Source files (`*.gs`, `*.js`, or `src/**`) live inside the project folder.

### 5.2 Migrating stray files (root → monorepo)

If you ever see `.clasp.json`, `appsscript.json`, or Apps Script code files in the **repo root** (and not under `apps-script/`), use **Appendix A** to migrate them into a proper `apps-script/gas-<slug>/` folder.

---

## 6. Onboarding menu – what the user wants to do

Once `clasp` and `CLASPRC_JSON` are sorted, ask the user:

> What do you want to do in this repo?
>
> 1. Use an **existing project folder** under `apps-script/`
> 2. Link an **existing Apps Script project** (you have a Script ID)
> 3. Create a **brand-new Apps Script project** in the Apps Script UI and link it here

Then follow the relevant **Flow**:

* Flow 1 – Use existing project folder
* Flow 2 – Link existing GAS project using its Script ID
* Flow 3 – Create brand-new GAS project and then link it (via Flow 2)

---

## 7. Flow 1 – Use an existing project folder

This is for `apps-script/gas-main-app`, `apps-script/gas-second-app`, `apps-script/gas-cat-cafe`, or any other existing folder.

1. List projects:

   ```bash
   find apps-script -mindepth 1 -maxdepth 1 -type d 2>/dev/null || echo "no-apps-script-folder"
   ```

2. If there are **no** project folders, tell the user they must use Flow 2 or Flow 3.

3. Otherwise, show the list and ask which one(s) they want to work on.

4. For each selected project (e.g. `apps-script/gas-main-app`):

   ```bash
   PROJECT_DIR="apps-script/gas-main-app"
   ls "$PROJECT_DIR"
   cat "$PROJECT_DIR/.clasp.json"
   ```

   Check:

   * `.clasp.json` exists and has a `scriptId`.
   * `"rootDir": "."` (if missing, patch as in Flow 2 step 4).
   * `appsscript.json` exists; if missing, create a minimal manifest **with user approval**.

5. Make sure `PROJECT_DIR` appears in the workflow matrix (see Section 9).

---

## 8. Flow 2 – Link an existing GAS project (Script ID known)

Use this when the user already has a script in the Apps Script UI and knows its **Script ID**.

1. Ask the user for:

   * `SCRIPT_ID` from Apps Script → **Project Settings → Script ID**
   * A folder slug `gas-<slug>` for the new project (kebab-case), e.g. `gas-taipei-500-form`.

2. Create the folder and move into it:

   ```bash
   SLUG="gas-your-slug-here"
   mkdir -p "apps-script/$SLUG"
   cd "apps-script/$SLUG"
   ```

3. Clone the project:

   ```bash
   clasp clone "$SCRIPT_ID"
   ```

   This should create `.clasp.json`, `appsscript.json`, and any existing code files.

4. Ensure `.clasp.json` has `"rootDir": "."`:

   ```bash
   node << 'EOF'
   const fs = require('fs');
   const path = '.clasp.json';
   const data = JSON.parse(fs.readFileSync(path, 'utf8'));
   if (data.rootDir !== '.') data.rootDir = '.';
   fs.writeFileSync(path, JSON.stringify(data, null, 2));
   EOF
   ```

5. Go back to repo root and add `apps-script/$SLUG` to the matrix in `.github/workflows/deploy-gas.yml` (Section 9).

6. Show the user what you did:

   ```bash
   cd /workspace/...  # ensure you're at repo root
   find "apps-script/$SLUG" -maxdepth 2 -type f | sort
   cat "apps-script/$SLUG/.clasp.json"
   ```

7. If requested, create a commit and push (or open a PR).

---

## 9. Flow 3 – Create a brand-new GAS project in the UI

This is the “new project” path; it then switches back to Flow 2.

1. Ask the user for:

   * Folder slug: `gas-<slug>` (kebab-case).
   * A human-friendly Apps Script project title.

2. Instruct the user:

   > 1. Go to [https://script.google.com/](https://script.google.com/)
   > 2. Create a **New project**
   > 3. Set the project title
   > 4. Open **Project Settings**
   > 5. Copy the **Script ID** and paste it here

3. Once they provide the Script ID, run **Flow 2** with that ID and slug.

4. Optionally, create a starter `Code.gs`:

   ```bash
   cd "apps-script/gas-<slug>"
   cat << 'EOF' > Code.gs
   function hello() {
     Logger.log('Hello from gas-<slug> in this monorepo!');
   }
   EOF
   ```

---

## 10. GitHub Actions deploy workflow (`.github/workflows/deploy-gas.yml`)

This repo **already has** a deploy workflow. You usually **edit** it instead of recreating it.

From repo root:

```bash
cat .github/workflows/deploy-gas.yml
```

Expected behavior:

1. Runs on:

   * `push` to `main`
   * `workflow_dispatch` (manual run)
2. Job `deploy`:

   * `runs-on: ubuntu-latest`
   * Uses `strategy.matrix.project` to list project folders, e.g.:

     * `apps-script/gas-main-app`
     * `apps-script/gas-second-app`
     * `apps-script/gas-cat-cafe`
   * Steps:

     * Checkout repo (`actions/checkout@v4`)
     * Set up Node (`actions/setup-node@v4`, Node 20)
     * Install `@google/clasp@^3.1.0`
     * Restore `~/.clasprc.json` from `CLASPRC_JSON`
     * `clasp login --status` (sanity check)
     * For each `matrix.project`, run `clasp push -f` in that folder

If `.github/workflows/deploy-gas.yml` does **not** exist (e.g. in a fresh fork), you can create it using this template (adjust `matrix.project` as needed):

```yaml
name: Deploy Google Apps Script (monorepo)

on:
  push:
    branches:
      - main
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        project:
          - apps-script/gas-main-app
          - apps-script/gas-second-app
          - apps-script/gas-cat-cafe

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install clasp (3.x)
        run: npm install -g @google/clasp@^3.1.0

      - name: Restore clasp credentials from secret
        env:
          CLASPRC_JSON: ${{ secrets.CLASPRC_JSON }}
        run: |
          if [ -z "$CLASPRC_JSON" ]; then
            echo "ERROR: GitHub secret CLASPRC_JSON is missing." >&2
            exit 1
          fi
          printf '%s\n' "$CLASPRC_JSON" > "$HOME/.clasprc.json"

      - name: Check clasp login status
        run: clasp login --status

      - name: Deploy ${{ matrix.project }}
        working-directory: ${{ matrix.project }}
        run: clasp push -f
```

When editing an existing workflow:

* Keep triggers (`on:`) and job name the same unless the user explicitly asks.
* Only adjust:

  * `strategy.matrix.project` entries (add/remove project folders)
  * Node / action / `clasp` versions if needed.

Whenever you add a new project folder, **add** it to `matrix.project`. When you remove a project folder (with user approval), **remove** it from `matrix.project`.

---

## 11. Project-level checklist

For **every** `apps-script/gas-<slug>` you touch, verify:

1. `.clasp.json` exists and contains:

   ```json
   {
     "scriptId": "<VALID_SCRIPT_ID>",
     "rootDir": "."
   }
   ```

2. `appsscript.json` exists and follows the Apps Script **manifest schema**.

   Minimal example:

   ```json
   {
     "timeZone": "Asia/Taipei",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8"
   }
   ```

3. Source files (`*.gs`, `*.js`, or `src/**`) live inside the project folder (not at repo root).

4. The folder path appears in `.github/workflows/deploy-gas.yml` under `matrix.project`.

5. The user confirms:

   * Apps Script API access is OK for their Google account.
   * The `CLASPRC_JSON` secret is configured for this repo / fork.

Once all of the above are true, any push to `main` (or manual workflow run) will:

* Recreate `~/.clasprc.json` in CI.
* Run `clasp push -f` for each listed project.
* Deploy code to the corresponding Apps Script projects.

---

## 12. Editing workflow (for agents)

When making changes:

1. Align with the user on which project(s) to modify (e.g. `gas-main-app` vs `gas-second-app` vs `gas-cat-cafe`).

2. Make code / manifest changes **only** inside the corresponding folder.

3. If there are tests or linters (via `npm`), run them locally when possible.

4. Check what changed:

   ```bash
   git status
   git diff
   ```

5. Commit with a clear message (e.g. `feat: add trigger to gas-cat-cafe`) and push.

6. If requested, open a PR or post the diff in the conversation.

7. Confirm that GitHub Actions ran and whether the deploy succeeded.

---

## 13. Reference docs (don’t invent APIs)

Before writing or refactoring Apps Script code, consult at least one of these:

* `clasp` CLI:

  * [https://github.com/google/clasp](https://github.com/google/clasp)
* Apps Script manifest schema:

  * [https://developers.google.com/apps-script/concepts/manifests](https://developers.google.com/apps-script/concepts/manifests)
* Useful script samples:

  * [https://github.com/jc324x/google-apps-script-cheat-sheet](https://github.com/jc324x/google-apps-script-cheat-sheet)
  * [https://github.com/oshliaer/google-apps-script-snippets](https://github.com/oshliaer/google-apps-script-snippets)
  * [https://github.com/googleworkspace/apps-script-samples/tree/master](https://github.com/googleworkspace/apps-script-samples/tree/master)

**Rule:** Never invent Apps Script APIs or manifest fields if correct ones can be checked in the docs above.
If you rely on a specific doc, mention it in comments or PR description so humans can see the source.

---

