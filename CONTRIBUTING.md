# Contributing

Thank you for helping us improve this Google Apps Script monorepo! Please follow the existing AGENTS instructions and the repo README for project-specific workflows. The notes below highlight contribution requirements enforced by CI.

## Reference Check evidence is mandatory

Every pull request must prove that the author completed the required reference check before changing any Apps Script code or manifest:

1. Open the files under `shared/google-apps-script-api-reference/keyword-index/` that match the services or concepts you are touching.
2. Open the corresponding files under `shared/google-apps-script-api-reference/full-reference/` to confirm the exact APIs, parameters, and official documentation links.
3. Record the filenames you consulted (for both keyword-index and full-reference) plus any official URLs inside the **Reference Check** section of the pull request template.

The PR template in `.github/pull_request_template.md` already contains the required section. Fill it out for every change. A dedicated GitHub Action (`.github/workflows/reference-check.yml`) parses the pull request description and will fail if:

- The `## Reference Check` section is missing or empty.
- No `keyword-index/*.md` file is listed.
- No `full-reference/*.md` file is listed.

If the job fails, update the pull request body with the missing information and re-run the workflow. Merges are blocked until the evidence is provided.
