# GAS Second App

This directory is reserved for the secondary Apps Script deployment.

Run the following once you have authenticated `clasp` locally to download the
remote source into this folder:

```bash
cd apps-script/gas-second-app
npx clasp clone 1s-wTbfES7k69y0xn8dtTRkXVyv-8Vl6lm2GS8GX363WPW_gmwl6RAc09 --rootDir .
```

The `.clasp.json` file is already configured with `rootDir` set to `.` so that
the repository layout matches the Apps Script structure.
