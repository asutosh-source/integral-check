# Integral Check

**A browser-based tool for checking proposed closed-form solutions to definite integrals.**

Integral Check is a static website project intended to help users compare a claimed exact value for a definite integral with a numerical evaluation. Its exact capabilities depend on the code in this repository.

> **Important:** Numerical agreement is evidence, not a formal proof of an identity. Numerical integration can be unreliable for singular, oscillatory, divergent, or poorly conditioned integrals. Interpret results such as `MATCH`, `MISMATCH`, or `INCONCLUSIVE` according to the implemented validation rules.

## Features

- Runs in a modern web browser.
- Supports comparison of a definite integral and a claimed result, if implemented by the current interface.
- Reports a comparison result according to the implemented numerical checks.
- Includes project tests and supporting tools.
- Can be published as a static website using GitHub Pages.

## Live website

After deployment, visit:

**https://asutosh-source.github.io/integral-check/**

If the page is unavailable, check the repository's **Actions** tab for deployment errors and confirm that GitHub Pages is enabled.

## Clone the repository

```bash
git clone https://github.com/asutosh-source/integral-check.git
cd integral-check
```

## Run locally

If `docs/index.html` exists, try opening it in a modern browser. If browser restrictions prevent some features from working, use a local static HTTP server from the directory configured for the website.

## Run tests

Install [Node.js](https://nodejs.org/) (Node.js 18 or newer is recommended), then run these commands from the project root:

```bash
npm test
```

To see other available npm scripts:

```bash
npm run
```

## Deploy with GitHub Pages

1. Push the project to the `main` branch.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and select the Pages deployment workflow.
5. Wait for the workflow to finish successfully.
6. Visit `https://asutosh-source.github.io/integral-check/`.

If no deployment workflow appears, confirm that a workflow file exists under `.github/workflows/` and check which directory it publishes. The workflow and the Pages settings must agree on the publication directory (expected to be `docs` only if the workflow is configured that way).

## Update the website

After editing the project, commit and push your changes:

```bash
git add .
git commit -m "Update Integral Check"
git push origin main
```

A successful push may trigger a new deployment automatically if the workflow is configured for pushes to `main`.

## Project structure

The repository may contain these directories and files:

- `docs/` — static website files, if configured for publication.
- `tests/` — automated tests.
- `tools/` — project utilities.
- `.github/workflows/` — GitHub Actions workflow configuration.
- `package.json` — Node.js scripts and project metadata.

## Limitations

- A numerical comparison does not establish a mathematical proof.
- Accuracy depends on the numerical method, tolerances, domain handling, and the integral being tested.
- Independently verify results before relying on them in important mathematical or research work.
- Describe benchmark outputs as simulated or computed results unless they come from independently collected experimental data.

## Contributing

When reporting a problem, include the input, expected behavior, observed result, and any error message. Test improvements, documentation updates, and reproducible examples are welcome.

## License

No license is specified in this README. Unless a license file is added, do not assume the code is available for unrestricted reuse.
