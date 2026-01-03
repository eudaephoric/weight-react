# Weight Tracker (Vite + React)

Simple single-page app to track personal weight. Stores data in `localStorage` and supports import/export JSON. Uses Chart.js for charts.

Quick start

1. Install dependencies (from `weight-react` folder):

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
npm run preview
```

4. Deploy to GitHub Pages

First, install the new dev dependency (adds the `gh-pages` publisher):

```bash
npm install
```

Then publish the `dist/` folder to GitHub Pages with:

```bash
npm run deploy
```

Notes:
- This repo uses a relative `base: './'` in `vite.config.js` so the build uses relative asset paths; that works both when opening `dist/index.html` from file:// and when serving via GitHub Pages.
- Make sure this project is committed and pushed to a GitHub repository. The `gh-pages` package will create/overwrite the `gh-pages` branch for the deployment.
- If your GitHub repo name is different than `weight-react` (the local folder), that's fine — no extra config is required because we use relative paths. If you prefer the canonical `/your-repo/` base URL instead, tell me the exact repo name and I'll set `base` to `'/your-repo/'` and update instructions accordingly.

Notes

- The UI is dark-themed. Use the Data tab to set starting weight, target weight, and add daily entries. Use the Charts tab to visualize data and filter by year or date range.
- Export creates `weight-data.json`. Import expects the same structure (object with `entries` array).
