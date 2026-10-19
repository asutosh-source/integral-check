# Integral Check

A static web tool for checking AI-generated closed forms of definite integrals.

- **Check an answer:** enter an integrand, bounds and a claimed closed form. The page integrates numerically and reports MATCH, MISMATCH or INCONCLUSIVE.
- **Benchmark:** enter your problems (standard or awkward) and two systems' answers. It checks each answer, lets you record a reasoning grade (A to F), and shows accuracy with 95% Wilson intervals plus the share of correct answers with invalid reasoning. Copy CSV exports the table.
- **Method:** accepted syntax, limits and the grading rubric.

It runs entirely in the browser. There is no server and no build step. Benchmark data is saved in the visitor's own browser (localStorage), so use Copy CSV to keep a record.

## Run it locally

```bash
python3 -m http.server -d docs 8000   # then open http://localhost:8000
```

You can also open `docs/index.html` directly. The page loads fonts from Google Fonts and falls back to system fonts when offline.

## Run the tests

```bash
npm test
```

Needs Node 18 or newer. There are no dependencies to install.

## Deploy to GitHub Pages

1. Create a new repository on GitHub and push this folder to the `main` branch:
   ```bash
   git init -b main
   git add .
   git commit -m "Add Integral Check"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. In the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The **Deploy to GitHub Pages** workflow runs on every push to `main`. When it finishes, the site is at `https://<your-username>.github.io/<your-repo>/`. Check the **Actions** tab if it does not appear.

**Without GitHub Actions:** set **Source** to **Deploy from a branch**, pick `main` and the `/docs` folder, and delete `.github/workflows/pages.yml`.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/index.html` | The page |
| `docs/assets/core.js` | Expression parser, numerical integrator, verdict logic, Wilson interval (no dependencies) |
| `docs/assets/app.js` | Interface and benchmark state |
| `docs/assets/style.css` | Styles, light and dark |
| `tests/core.test.js` | Unit tests for `core.js` |
| `tools/verify_integrals.py` | High-precision (30 digit) checker for research runs. `pip install -r tools/requirements.txt`, then `python tools/verify_integrals.py` |
| `.github/workflows/` | Tests on every push; deploy on `main` |

## Limits

- The browser integrator uses tanh-sinh quadrature in double precision, about 15 digits. Use `tools/verify_integrals.py` when you need 30.
- It checks the final value only. Whether the reasoning is valid is a judgement you record with the grade menu.
- Conditionally convergent oscillatory integrals, such as sin x / x on [0, infinity), are not supported.
- A decimal approximation is not a closed form. Record it as not answering the question.

## Licence

No licence is included. Add one (for example MIT) before others reuse the code.
