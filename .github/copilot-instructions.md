# Copilot Instructions for Grids SVG Project

## Project Overview
- **Grids** is a client-side SVG grid generator and equation plotter for browser use. No backend or build tools required.
- Main features: customizable Cartesian grids, equation plotting, axis/label styling, and export to SVG/PNG/PDF.
- All logic is implemented in vanilla JavaScript, organized by function (UI, grid, equations, labels).

## Key Files & Structure
- `index.html`: Main UI and entry point. Loads all scripts.
- `css/style.css`: Visual styles.
- `js/main.js`: UI event handling, app initialization.
- `js/plotter.js`: Grid drawing and equation plotting.
- `js/equations.js`: Equation parsing and evaluation.
- `js/labels.js`: Axis/label logic and rendering.
- `js/grid-presets.js`: Predefined grid templates.
- `js/utils.js`: Shared utility functions.
- `js/modules/`: Contains modularized grid and point logic (`gridAPI.js`, `pointsLayer.js`, `pointsUI.js`).
- `assets/`: Icons, screenshots.
- `sw.js`, `manifest.json`: PWA support (offline, installable).

## Developer Workflows
- **No build step required.** Open `index.html` in a browser to run and debug.
- For debugging, use browser DevTools (console, DOM inspector, network tab).
- To test changes, reload the page after editing JS/CSS files.
- Service worker (`sw.js`) may cache files; disable/clear cache in DevTools if changes don't appear.

## Project-Specific Patterns
- **SVG-centric rendering:** All grid and plot visuals are generated as SVG elements for scalability and export.
- **Equation plotting:** User input is parsed and plotted live; see `equations.js` and `plotter.js` for math logic.
- **Modular JS:** Core logic is split into modules for grid, points, and UI. Use ES6 imports/exports for new modules.
- **Config-driven UI:** Grid presets and label options are defined in JS objects for easy extension.
- **No external dependencies** (except browser APIs).

## Integration Points
- **PWA:** Manifest and service worker enable offline use and installability. Update these files for new assets or caching rules.
- **Export:** SVG/PNG/PDF export logic is in `plotter.js` and related modules.

## Conventions
- Use descriptive variable and function names (see existing files for style).
- Keep UI logic (`main.js`) separate from rendering and math logic.
- Prefer modularization for new features (add to `js/modules/`).
- All user-facing strings should be easy to localize (avoid hardcoding in multiple places).

## Example: Adding a New Grid Feature
1. Define grid logic in a new module under `js/modules/`.
2. Update `main.js` to add UI controls and event handlers.
3. Extend `plotter.js` to support new rendering logic.
4. Add any new presets to `grid-presets.js`.

---
For questions, see `README.md` or open an issue on GitHub.
