# DBB Block Editor

**A small 3D editor for teaching the Design Building Block (DBB) approach to ship design.**

**Open the app: https://shiplab.github.io/dbb/**

![DBB Block Editor with the simplified R/V Gunnerus example](screenshot.png)

## What it is

The DBB approach builds a ship design from physical blocks (volumes and areas) that are grouped by function and linked to requirements. This tool is a deliberately simple "Tinkercad for DBB". You place and shape blocks in 3D, give each one a group and a requirement, and the tables sum up the result.

It is an editor and calculator only. It does not do hydrostatics, stability or other analyses; those belong in other applications. In a course, it fits after Systems Based Ship Design (SBSD): the spaces that come out of the system breakdown become the first blocks.

## What it does

- **3D blocks** from seven primitive shapes (box, cylinder, half-cylinder, cone, pyramid, wedge, sphere). Move, rotate and scale them with the gizmo, or type exact size, position and rotation. Snapping aligns block faces.
- **Free groups.** The default is the offshore support vessel breakdown by Levander (task related systems and ship systems). Groups can be renamed, recoloured, nested, added and deleted.
- **Requirements** with the shall/should convention. Each has a metric (volume, area, length, beam or height), a direction (at least or at most) and two target values. Volume and area requirements count the blocks tagged with them, and length, beam and height come from the overall envelope.
- **Tables** that update as you edit: a summary of volume and area per group, with the overall L, B and H; a requirements table showing "Meets should", "Meets shall" or "Not met"; and a list of all blocks.
- **Save and open** projects as JSON. **Export** any table as CSV.
- **Examples** from the menu: Simple (5 blocks), R/V Gunnerus (15 blocks, simplified) and PSV (20 blocks).

## How to use it

1. **Start from your systems.** Each system that needs volume or deck area becomes a block. Use **New**, or open an example from the **Examples** menu.
2. **Set up groups** in the hierarchy on the left. Rename, recolour, add or delete them to match your own division.
3. **Write requirements** in the **Requirements** tab: choose a metric, at least or at most, and the shall and should values.
4. **Pick the group and requirement** for new blocks in the two menus under the shape library.
5. **Add blocks** by clicking a shape or dragging it onto the workplane (dropping onto a block places it on top).
6. **Shape them.** Select a block and use **Move**, **Rotate** or **Scale** (keys W, E, R). To resize, choose Scale and drag the small coloured cubes, or type L, B and H in the right panel.
7. **Read the tables.** The Summary, Requirements and Blocks tabs show the totals and whether each requirement is met.
8. **Iterate and save.** Resize or move blocks until the requirements are met, then **Save** the project as JSON.

Coordinates: X forward from the aft end, Y to port, Z up from the baseline, in metres. Keyboard: W, E, R transform mode; Ctrl+D duplicate; Del delete; F fit; 1 to 4 camera views; Ctrl+Z undo. The **How to** button in the app shows this guide too.

## Notes on the examples

The R/V Gunnerus example uses the main dimensions and the space areas and tank volumes published at [shiplab.github.io/gunnerus](https://shiplab.github.io/gunnerus/). The block positions are approximate and are not taken from the drawings. The PSV example is illustrative.

## Citation

This tool is based on the approach in:

Gaspar, H.M., Fonseca, Í.A. and Andrews, D. *Wither now the Design Building Block (DBB) Approach.* International Marine Design Conference (IMDC 2024). https://doi.org/10.59490/imdc.2024.915

```bibtex
@inproceedings{gaspar2024dbb,
  author    = {Gaspar, Henrique M. and Fonseca, {\'I}caro A. and Andrews, David},
  title     = {Wither now the Design Building Block ({DBB}) Approach},
  booktitle = {International Marine Design Conference (IMDC 2024)},
  year      = {2024},
  doi       = {10.59490/imdc.2024.915}
}
```

## Credit

Created by Henrique Gaspar, NTNU, October 2026.
