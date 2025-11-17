# clasp-from-fresh

```mermaid
gitGraph
  commit id: "initial-import"
  commit id: "legacy-form-era"
  commit id: "single-gas-reset" tag: "main@HEAD"
```

```mermaid
stateDiagram-v2
    state "Developer workstation" as Dev
    state "Repo (.clasp.json, Code.js)" as Repo
    state "GitHub Actions" as GHA
    state "Secret vault (CLASPRC_JSON)" as Secrets
    state "Google Apps Script project" as GAS
    Dev --> Repo: git push main
    Repo --> GHA: Trigger deploy workflow
    GHA --> Secrets: Read ~/.clasprc.json contents
    Secrets --> GHA: Provide OAuth tokens
    GHA --> GHA: clasp login --status
    GHA --> GAS: clasp push -f
    GAS --> Dev: Execution log / editor updates
```

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Repo as GitHub Repo
    participant CI as Deploy Workflow
    participant Secret as GitHub Secret (CLASPRC_JSON)
    participant GAS as Google Apps Script
    Dev->>Repo: Commit Code.js + manifest
    Repo-->>CI: Push to main
    CI->>CI: Install Node + clasp
    CI->>Secret: Restore ~/.clasprc.json
    Secret-->>CI: OAuth credentials
    CI->>CI: clasp login --status
    CI->>GAS: clasp push -f
    GAS-->>CI: Deployment result
    CI-->>Dev: Workflow summary
```

```mermaid
flowchart LR
    Dev[Developer]
    Repo[Repo root]
    Workflow[GitHub Actions]
    Secret[CLASPRC_JSON secret]
    Clasp[clasp CLI]
    GAS[Apps Script Project]
    Dev -->|edit + push| Repo
    Repo -->|main branch| Workflow
    Workflow -->|needs tokens| Secret
    Secret -->|~/.clasprc.json| Workflow
    Workflow -->|uses| Clasp
    Clasp -->|push code| GAS
    GAS -->|helloWorld log| Dev
```

```mermaid
flowchart LR
    subgraph Users
        Dev[Developer]
        Viewer[Reviewer]
    end
    subgraph Frontend
        GASUI[Apps Script Editor]
    end
    subgraph Backend
        Repo[GitHub Repo]
        CI[GitHub Actions]
        Secret[CLASPRC_JSON]
    end
    Dev -->|edit + commit| Repo
    Repo -->|push main| CI
    CI -->|clasp push -f| GASUI
    Secret -->|OAuth token| CI
    GASUI -->|log output| Viewer
```

## Single Apps Script project at repo root

This repository now tracks one standalone Google Apps Script project directly from the root directory. All deployment tooling and workflow files target the same code to keep the CI/CD loop simple.

### Repository layout

```text
.
├─ .clasp.json
├─ appsscript.json
├─ Code.js
├─ package.json
└─ .github/
   └─ workflows/
      └─ deploy-gas.yml
```

### Getting started locally

1. Install clasp globally (`npm install -g @google/clasp`).
2. Run `clasp clone <SCRIPT_ID>` or update `.clasp.json` with your `scriptId`.
3. Authenticate once via `clasp login`.
4. Modify `Code.js`, then deploy either with `clasp push -f` or by running `npm run deploy`.

### GitHub Actions deployment

The workflow defined in `.github/workflows/deploy-gas.yml` automatically deploys every push to `main`. Provide the secret `CLASPRC_JSON` that mirrors the contents of your local `~/.clasprc.json`. The workflow restores those credentials, verifies login status, and performs `clasp push -f`.

### Hello World entry point

`Code.js` exposes `helloWorld()`, which writes a log entry: `Hello from single-repo GAS + GitHub Actions!`. Use the Apps Script editor's **Run** button or the Executions tab to see the log output.
