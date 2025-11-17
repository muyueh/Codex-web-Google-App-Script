# Agents Playbook – Google Apps Script Monorepo

You are an AI agent working in this repo to maintain a **Google Apps Script (GAS) monorepo**. The workspace is already wired for [`@google/clasp` ≥ 3](https://developers.google.com/apps-script/guides/clasp) and GitHub Actions deployments.

Use this guide as the source of truth for what you may modify, how to inspect the current setup, and how to expand it safely.

---

## 0. Quick facts

* **Repo root** already contains: `Agents.md`, `README.md`, `package.json`, `shared/`, `.github/workflows/deploy-gas.yml`, and the monorepo folder `apps-script/`.
* **Existing Apps Script projects** live under `apps-script/`:
  * `apps-script/gas-main-app/` – contains `.clasp.json`, `appsscript.json`, and `Code.js`.
  * `apps-script/gas-second-app/` – currently contains `.clasp.json` and `README.md` (no manifest yet; add one before pushing code).
* **CI/CD** is handled by `.github/workflows/deploy-gas.yml`, which already deploys both folders via a matrix job.

Mental model:

```
Local edits → git commit/push → GitHub Actions → clasp push -f → Apps Script
```

When in doubt, ground yourself with:

```bash
pwd && ls
ls apps-script 2>/dev/null || echo "no apps-script directory"
cat .github/workflows/deploy-gas.yml 2>/dev/null || echo "missing deploy workflow"
```

---

## 1. Guardrails & scope

You **may** touch:

* Files inside `apps-script/gas-<slug>/` (source, manifests, `.clasp.json`).
* Shared utilities in `shared/` if they are imported by projects.
* `.github/workflows/deploy-gas.yml` (keep existing triggers/job name unless asked otherwise).
* Top-level docs (`README.md`, `Agents.md`).

You **must not**:

* Commit secrets (especially the `CLASPRC_JSON` GitHub secret, OAuth tokens, or service-account JSON).
* Change a `scriptId` in `.clasp.json` unless the user explicitly says to re-link a project.
* Delete or rename existing `apps-script/gas-*` folders without confirmation.
* Modify non-GAS workflows or repository-wide policies unless instructed.

Before destructive actions (renames, large deletions), describe the plan to the user and wait for approval.

---

## 2. Environment sanity checks

Run these once per session or when something feels off:

1. **Confirm Node/npm**
   ```bash
   node -v
   npm -v
   ```
   If missing, inform the user—they are required for `clasp`.

2. **Install clasp (if not already)**
   ```bash
   npm install -g @google/clasp@^3.1.0
   clasp -v
   ```

3. **Check clasp auth**
   ```bash
   clasp login --status
   ```
   If prompted, use `clasp login --no-localhost`, share the Google auth URL with the user, and paste the returned code into the waiting terminal.

---

## 3. Secrets & CI credential flow

CI deployments rely on a single GitHub Actions secret:

* `CLASPRC_JSON` – contents of the user’s `~/.clasprc.json` from `clasp login`.

Action items:

1. Ask whether the secret already exists. If not, walk the user through creating/updating it under **Settings → Secrets and variables → Actions**.
2. Remind the user never to paste this JSON into tracked files.
3. For CI, `.github/workflows/deploy-gas.yml` writes `${{ secrets.CLASPRC_JSON }}` into `~/.clasprc.json`. No extra steps are required once the secret is set.

---

## 4. Repo layout & how to extend it

### 4.1 Inspecting existing projects

List all projects:
```bash
find apps-script -mindepth 1 -maxdepth 1 -type d | sort
```
For each folder (`apps-script/gas-main-app`, `apps-script/gas-second-app`, etc.) verify:
* `.clasp.json` exists with the correct `scriptId` and `"rootDir": "."`.
* `appsscript.json` is present (if missing, create one before pushing code).
* Source files live alongside the manifest.

### 4.2 Adding or linking projects

When the user wants to link a new Apps Script project:

1. Ask for a slug (`gas-<slug>`) and the Script ID.
2. Create a folder under `apps-script/` with that slug.
3. Run `clasp clone <SCRIPT_ID>` inside the folder, or create starter files if the project is brand new.
4. Ensure `.clasp.json` has `"rootDir": "."`.
5. Add the folder path to the matrix inside `.github/workflows/deploy-gas.yml`.

### 4.3 Migrating stray files

If you ever find Apps Script files at the repo root, move them into a new `apps-script/gas-<slug>/` folder (see Appendix A of the reference text for detailed steps) and update the workflow matrix.

---

## 5. Deploy workflow expectations (`.github/workflows/deploy-gas.yml`)

The current workflow (`Deploy Google Apps Script (matrix)`) already runs on pushes to `main` and `workflow_dispatch`. It:

1. Checks out the repo.
2. Sets up Node 20.
3. Installs `@google/clasp@^3.1.0`.
4. Restores `~/.clasprc.json` from `CLASPRC_JSON`.
5. Runs `clasp push -f` for each path in `matrix.project` (`apps-script/gas-main-app` and `apps-script/gas-second-app`).

When you add/remove project folders, update the `matrix.project` list accordingly. Avoid changing triggers or job names unless the user specifically requests it.

---

## 6. Project-level checklist

For every `apps-script/gas-<slug>` folder you touch:

1. `.clasp.json`
   ```json
   {
     "scriptId": "<VALID_SCRIPT_ID>",
     "rootDir": "."
   }
   ```
2. `appsscript.json` exists and follows the Apps Script manifest schema. (Today `gas-second-app` still needs one—add it before deploying any code there.)
3. Source files (`*.gs`, `*.js`, or `src/**`) live within the folder.
4. The folder path is listed in `.github/workflows/deploy-gas.yml`.
5. Tests or lint steps (if any) pass locally before pushing.

---

## 7. Editing workflow

1. Align with the user on which project(s) to edit.
2. Make code/manifest changes inside the corresponding folder.
3. Run any relevant local scripts (e.g., `npm test`, linters) if added later.
4. `git status` to review modifications.
5. Commit with a descriptive message, push, and (if requested) open a PR or provide the diff.

---

## 8. Reference docs

Before writing or refactoring any Apps Script code in this repo, pause and consult at least one of the resources below for relev
ant patterns, method names, or edge-case guidance. Capture any nuances you rely on in code comments or PR context so reviewer
s know which source informed the change.

* `clasp` CLI – https://github.com/google/clasp
* Apps Script manifest schema – https://developers.google.com/apps-script/concepts/manifests
* Useful script samples (search these for snippets similar to the requested feature):
  * https://github.com/jc324x/google-apps-script-cheat-sheet – quick reminders for common GAS APIs.
  * https://github.com/oshliaer/google-apps-script-snippets – curated recipes for Sheets, Docs, and Slides automation.
  * https://github.com/googleworkspace/apps-script-samples/tree/master – official, end-to-end sample projects from Google.

Keep documentation handy and avoid inventing APIs—verify against the official sources above before committing code.

