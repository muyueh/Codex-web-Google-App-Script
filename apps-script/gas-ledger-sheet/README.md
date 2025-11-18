# Ledger Sheet Apps Script

This Apps Script project provisions the `Ledger` worksheet, adds data-validation rules, and exposes helper menu actions via `Code.gs`. The project is now fully linked to its Apps Script backend via `.clasp.json`, so CI deploys will keep the remote project in sync with this folder.

## Script linkage

The `.clasp.json` stores the production Script ID (`1EHXUf_gYt0PRycN4g0xWM8rG-xyhQkLsw1w5XQR9mMV4z01gVC0yxwb2`). If this ID ever needs to change (for example, when cloning to another Apps Script project), remember to update the `.clasp.json` and coordinate any CI workflow changes using the onboarding flow described in `docs/AGENTS-onboarding-flows.md`.
