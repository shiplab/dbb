# DBB Block Editor

A small browser-based 3D editor for teaching the **Design Building Block (DBB)** approach to ship design. Think "Tinkercad for DBB": create blocks from primitive shapes, assign each to a group and a requirement, and read the summed volume, area and main dimensions (L, B, H).

The editor only edits and sums. Stability, hydrostatics and other analyses are left to other applications.

## Use

Open the published page (GitHub Pages) or `index.html` in a browser. No install or server is needed.

- **Groups** are free. The default is Levander's OSV breakdown (Erikstad and Levander), but students can rename, add or delete groups.
- **Requirements** use the shall/should convention: a metric (volume, area, length, beam, height), at least or at most, and the two target values.
- **Examples** menu: Simple (5 blocks), R/V Gunnerus (15 blocks, simplified) and PSV (20 blocks).
- **Save / Open** use a JSON project file. **Export CSV** saves the summary, requirements or block table.
- The **How to** button inside the app explains the workflow.

Coordinates: X forward from the aft end, Y to port, Z up from the baseline, in metres.

## Develop

```
npm install      # only needed for the tests (three.js, for the geometry maths)
npm test         # checks volumes, areas, requirements and the JSON round trip
npm run build    # assembles index.html from src/
```

`src/core.js` holds the logic (shapes, volumes, summaries, requirements, JSON and CSV). `src/app.js` holds the 3D scene and interface. three.js r147 is included under `vendor/`.

## Reference

Gaspar, H.M., Fonseca, Í.A. and Andrews, D., *Wither now the Design Building Block (DBB) Approach*. International Marine Design Conference (IMDC 2024). https://doi.org/10.59490/imdc.2024.915

Created by Henrique Gaspar, NTNU, October 2026.
