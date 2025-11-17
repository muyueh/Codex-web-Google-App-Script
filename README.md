# Google Apps Script Monorepo – Structure & Rules

This repository hosts multiple Google Apps Script projects managed through [`@google/clasp`](https://github.com/google/clasp) and deployed via GitHub Actions. Every project lives under `apps-script/` and keeps its own manifest, source files, and `.clasp.json` so the folder can be pushed independently.

## Directory layout

```
.
├─ apps-script/
│  ├─ gas-main-app/      # Script ID linked in .clasp.json (helloWorld + Slides helper)
│  └─ gas-second-app/    # Script ID linked in .clasp.json (manifest TBD)
├─ shared/               # Optional shared snippets, docs, or templates
├─ package.json          # Contains workspace-level scripts (e.g., deploy)
├─ package-lock.json
├─ node_modules/
└─ .github/workflows/
   └─ deploy-gas.yml     # Matrix-driven clasp push for each Apps Script project
```

Each `apps-script/gas-<slug>/` directory is a self-contained Apps Script workspace whose contents map directly to the Apps Script editor because `"rootDir": "."` in the `.clasp.json` files.

## Naming conventions

* Project folders follow `apps-script/gas-<slug>/` (e.g., `gas-main-app`, `gas-second-app`).
* `.clasp.json` files always live inside the project folder and keep `"rootDir": "."`.
* Source files use `.gs`/`.js` extensions (Apps Script accepts both) and sit alongside the manifest.
* Shared utilities that are not automatically deployed belong in `shared/`.

## Per-project requirements

Every project directory (currently `gas-main-app` and `gas-second-app`) must contain:

1. `.clasp.json` with the correct `scriptId` and `rootDir` set to `"."`.
2. `appsscript.json` manifest configured for the runtime, time zone, and enabled services required by that project.
3. Source files (`Code.js`, `.gs` modules, or subdirectories) that match what you expect to appear in Apps Script.
4. Inclusion in the CI matrix located in `.github/workflows/deploy-gas.yml` so automated pushes cover all active folders.

## Shared code policy

The `shared/` directory is intentionally decoupled from deployments. Use it for reusable snippets, documentation, or templates that developers can copy into `gas-main-app`, `gas-second-app`, or future folders. Nothing inside `shared/` is imported automatically—copy/paste or manual syncing is required when sharing logic.

## CI/CD behavior

`.github/workflows/deploy-gas.yml` defines a single workflow (`Deploy Google Apps Script (matrix)`) that:

1. Runs on pushes to `main` and manual `workflow_dispatch` events.
2. Sets up Node.js 20 and installs `@google/clasp@^3.1.0`.
3. Restores `~/.clasprc.json` from the `CLASPRC_JSON` GitHub secret.
4. Iterates over `matrix.project`, currently `apps-script/gas-main-app` and `apps-script/gas-second-app`, running `clasp push -f` in each directory.

Keep the trigger scope and job name intact unless the deployment workflow changes intentionally. When adding or removing project folders, update the matrix list so CI remains in sync with the monorepo contents.

## Onboarding new projects

Follow these steps to add another Apps Script project to the monorepo:

1. **Gather inputs** – Obtain the project slug (`gas-<slug>`) and target Script ID.
2. **Create the folder** – `mkdir apps-script/gas-new-app && cd apps-script/gas-new-app`.
3. **Link with clasp** – Run `npx clasp clone <SCRIPT_ID> --rootDir .` (or create starter manifest/source files if starting from scratch).
4. **Verify manifests** – Ensure `.clasp.json` has `"rootDir": "."` and the manifest (`appsscript.json`) reflects the desired settings.
5. **Add code** – Place `.gs`/`.js` files within the folder and keep project-specific docs nearby.
6. **Update CI** – Append the new folder path to the `matrix.project` list inside `.github/workflows/deploy-gas.yml`.
7. **Commit & push** – Run `git status`, commit the new folder plus workflow update, and push so CI can deploy it automatically.

With these conventions, `gas-main-app`, `gas-second-app`, and any future projects stay isolated yet deployable through a single workflow.
