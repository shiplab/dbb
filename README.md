# DBB Block Editor

**A small 3D editor for teaching the Design Building Block (DBB) approach to ship design.**

**Open the app: https://shiplab.github.io/dbb/**

![DBB Block Editor with the simplified R/V Gunnerus example](screenshot.png)

## What it is

The DBB approach builds a ship design from physical blocks (volumes and areas) that are grouped by function and linked to requirements. This app is a deliberately simple "Tinkercad for DBB". You place and shape blocks in 3D, give each one a group, a requirement and a density, and the tables sum up volume, area, weight and centres of gravity. An illustrative hull and its hydrostatics give a first check.

It is an editor and calculator for the early stage. The hulls are illustrative shapes, hydrostatics and weights are indicative, and there is no stability analysis. In a course it fits after Systems Based Ship Design (SBSD): the spaces that come out of the system breakdown become the first blocks.

## What it does

- **3D blocks** from seven primitive shapes (box, cylinder, half-cylinder, cone, pyramid, wedge, sphere). Move, rotate and scale them with the gizmo, or type exact size, position and rotation. Snapping aligns block faces.
- **Free groups.** The default is the offshore support vessel breakdown by Levander (task related systems and ship systems). Groups can be renamed, recoloured, nested, added and deleted.
- **Requirements** with the shall/should convention. Each has a metric (volume, area, length, beam or height), a direction (at least or at most) and two target values. Volume and area requirements count the blocks tagged with them; length, beam and height come from the overall envelope.
- **Illustrative hulls** (optional, one or more): press **+ Hull**. Types: offshore vessel, research vessel, cargo ship, slender demihull and barge. A second **+ Hull** adds a mirrored copy for a catamaran. Each hull is fitted around the blocks below the main deck (its *depth*); blocks above it stay outside. The hull can be moved, scaled and reshaped with sliders (flat bottom, bilge, flare, parallel body, bow, stern).
- **Draught and water.** One draught for the whole vessel, shown as a flat water surface. The hydrostatics are calculated at the draught: displaced volume, displacement, LWL, BWL, Cb, Cp, Cm, Cwp, Awp, LCB, KB, LCF and TPC, with an editable water density.
- **Blocks against hulls.** For every block, requirement and total, the app estimates how much volume lies outside the hulls, and the volume and area requirements also show the part inside.
- **Mass and centres of gravity.** Density is set per group (a subgroup follows its parent) and can be overridden per block, with a fill percentage for tanks or a typed mass. The centre of gravity of each block is the centroid of its shape. Hull steel, piping and cabling are taken as a share of the displacement (25% to begin with), spread over the hull volume. The Summary compares total weight with displacement: margin, LCG, TCG, VCG and LCG minus LCB.
- **Tables** that update as you edit. *Summary* has three sections: Overview (area, volume, density, mass and centres of gravity by group), Hull (hull table and hydrostatics) and Weight (balance against displacement). *Requirements* shows "Meets should", "Meets shall" or "Not met". *Blocks* lists every block, with switchable column sets (Geometry, Mass, Hull), sortable columns, and editable density and fill.
- **Save and open** projects as JSON. **Export** any table as CSV. Nothing is stored in the browser, so save before you leave.
- **Examples** from the menu, each with only the groups it uses: Simple (5 blocks), Catamaran (9 blocks, 2 hulls), Trimaran (10 blocks, 3 hulls), R/V Gunnerus (15 blocks, simplified, the default) and PSV (20 blocks).
- **How to** in the app: a quick start, all keyboard shortcuts, a glossary of the terms used, and an About tab. Table headings also explain themselves on hover.

## How to use it

1. **Start from your systems.** Each system that needs volume or deck area becomes a block. Use **New**, or open an example from the **Examples** menu.
2. **Set up groups** in the hierarchy on the left. Rename, recolour, add or delete them to match your own division.
3. **Write requirements** in the **Requirements** tab: choose a metric, at least or at most, and the shall and should values.
4. **Pick the group and requirement** for new blocks in the two menus under the shape library.
5. **Add blocks** by clicking a shape or dragging it onto the workplane (dropping onto a block places it on top).
6. **Shape them.** Select a block and use **Move**, **Rotate** or **Scale**. To resize, choose Scale and drag the small coloured cubes, or type L, B and H in the right panel.
7. **Add a hull (optional).** Press **+ Hull**, then click the hull row to edit it. While a hull is selected the blocks are dimmed. Set the draught, open **Shape** for the sliders, and press **Fit to blocks** after moving blocks. The eye next to **Hierarchy** hides all blocks, to look at the hulls alone.
8. **Add weight.** Set a density per group in the Summary Overview, and override it on a block in the right panel or the Blocks tab. The structure share is set in the Weight section.
9. **Read the tables**, then iterate until the requirements are met, and **Save** the project as JSON.

Coordinates: X forward from the aft end, Y to port, Z up from the baseline, in metres.

| Key | Action |
|---|---|
| W / E / R | Move, rotate, scale |
| H | Hide or show the selection |
| F or 5 | Fit the model in the view |
| 1, 2, 3, 4 | 3D, top, side, front view |
| Ctrl+D | Duplicate (a mirrored hull when a hull is selected) |
| Del | Delete the selection |
| Esc | Deselect |
| Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y | Undo, redo |

## Notes on the examples

The R/V Gunnerus example uses the main dimensions and the space areas and tank volumes published at [shiplab.github.io/gunnerus](https://shiplab.github.io/gunnerus/). The block positions are approximate and are not taken from the drawings. The PSV, catamaran and trimaran examples are illustrative. The example hulls are fitted automatically around the blocks, so the Gunnerus hull is a little longer than the real vessel. Densities, fills and draughts in the examples are chosen to give sensible weight margins; they are not measured data.

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

## Credit and acknowledgements

Developed by Henrique Gaspar, NTNU, October 2026. It builds on a block layout prototype from 2015.

Professor David Andrews, University College London, for his support over the years and the long collaboration between NTNU and UCL.
