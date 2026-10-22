# Ship Design Building Block Editor

**A small 3D editor for teaching early-stage ship design, inspired by the Design Building Block (DBB) approach.**

**Open the app: https://shiplab.github.io/dbb/**

![Ship Design Building Block Editor with the feeder container ship example](screenshot.png)

> **For educational use only.** The hulls are illustrative parametric shapes, not real lines. Weights, hydrostatics, trim, heel and stability are simplified estimates, and stability covers small angles only. The results must not be used for design approval, class or flag-state documentation, or any safety-critical decision. The software is provided as it is, without warranty.

## What it is

The Design Building Block (DBB) approach builds a ship design from physical blocks (volumes and areas) that are grouped by function and linked to requirements. This app is a deliberately simple "Tinkercad for DBB". You place and shape blocks in 3D, give each one a group, a requirement and a density, and the tables sum up volume, area, weight and centres of gravity. An illustrative hull, floating at the weight, gives a first check of draught, trim, heel and initial stability.

It is an editor and calculator for the early stage. In a course it fits after Systems Based Ship Design (SBSD): the spaces that come out of the system breakdown become the first blocks.

## What it does

- **3D blocks** from seven primitive shapes (box, cylinder, half-cylinder, cone, pyramid, wedge, sphere). Move, rotate and scale them with the gizmo, or type exact size, position and rotation. The scale handles keep the opposite face fixed. Snapping aligns block faces.
- **Import STL.** Press **Import STL** in the shape library, or drop an STL file on the workplane: one file becomes one block. Units are guessed and can be changed. Large files (up to 500 MB) are reduced on import to a few thousand triangles, so the project file stays small, while volume, centre of gravity and plan area come from the real mesh. Imported shapes are saved inside the project JSON. The right panel shows the selected block or hull and gives its width back to the 3D view when nothing is selected.
- **Free groups.** The default is the offshore support vessel breakdown by Levander (task related systems and ship systems). Groups can be renamed, recoloured, nested, added and deleted.
- **Requirements** with the shall/should convention. Each has a metric (volume, area, weight, length, beam, height, total weight or gross tonnage), a direction (at least or at most) and two target values. Volume, area and weight requirements count the blocks linked to them, and a block can serve several requirements. Length, beam, height, total weight and gross tonnage come from the whole design. The status is red when the shall is not met, green between shall and should, and orange beyond the should (an excess), with the margin.
- **Illustrative hulls** (optional, one or more): press **+ Hull**. Types: offshore vessel, research vessel, cargo ship, slender demihull and barge. A second **+ Hull** makes a catamaran and a third a trimaran, up to five hulls, each fitted to its own group of blocks. Each hull is fitted around the blocks below the main deck (its *depth*), which a block can define with the **Defines main deck** tick; blocks above it stay outside. The hull can be moved, scaled and reshaped with sliders (flat bottom, bilge, flare, parallel body, bow, stern). Hull and water colours can be chosen.
- **Draught and water.** One draught for the whole vessel, shown as a water surface. The hydrostatics are calculated at the draught: displaced volume, displacement, LWL, BWL, Cb, Cp, Cm, Cwp, Awp, LCB, KB, LCF and TPC, with an editable water density.
- **Float.** With **Float** on, the draught, trim and heel follow the weight as you move blocks. The trim and heel are an exact tilted water plane on the hull shapes, drawn in 3D with draught marks and a live readout.
- **Initial stability.** KB, BM (from the waterplane of all hulls, so multihulls are handled), KM and GM, transverse and longitudinal. Blocks can be marked **Free surface** (partly filled liquid tanks) and the correction is subtracted from GM. A few basic checks are shown: GM at least 0.15 m, static heel at most 5 degrees and trim at most 1% of the length. These are guides, not a stability assessment.
- **Blocks against hulls.** For every block, requirement and total, the app estimates how much volume lies outside the hulls, and the volume and area requirements also show the part inside.
- **Mass and centres of gravity.** Density is set per group (a subgroup follows its parent) and can be overridden per block, with a fill percentage for tanks or a typed mass. The centre of gravity of each block is the centroid of its shape. Hull steel, piping and cabling are taken as a share of the displacement, spread over the hull volume. The weight balance compares total weight with displacement: margin, LCG, TCG, VCG and LCG minus LCB.
- **Summary with an assessment.** The Summary tab opens with chips for requirements, weight and hull, floating and stability, then a list of problems, notes and what passes, each linking to where to look. Below it are the geometry and the hulls.
- **Tables** that update as you edit. *Requirements* shows "Meets should", "Meets shall" or "Not met". *Blocks* lists every block, with switchable column sets (Geometry, Mass, Hull), sortable columns, and editable density and fill. *Hydrostatics* holds the floating condition, the weight balance, the weight by group (densities can be edited here), the initial stability and the hull hydrostatics. The tables panel can be resized by dragging.
- **Gross tonnage (GT).** An estimate by the 1969 Tonnage Convention, GT = K1 × V, from the blocks that count as enclosed spaces (untick **Counts for GT** on open spaces). It can be used as a requirement. It is not a tonnage certificate.
- **PDF report.** The **PDF** button writes a report: a perspective view and side, top and front drawings, the assessment, requirements, systems, hulls, weights, floating condition, hydrostatics, stability, assumptions and an appendix listing every block.
- **Save and open** projects as JSON. **XLSX** exports the whole project as an Excel workbook (Summary, Project, Output, Blocks, Weight, Hydrostatics, Requirements) with the group colours, and formulas for the block masses, totals and gross tonnage. Nothing is stored in the browser, so save before you leave.
- **Examples** from the menu, each with only the groups it uses: Simple (5 blocks), Catamaran (9 blocks, 2 hulls), Trimaran (10 blocks, 3 hulls), R/V Gunnerus (15 blocks, simplified), PSV (20 blocks), Container ship, feeder (19 blocks, the default), Tanker, double hull (22 blocks), Bulk carrier, handysize (19 blocks), Sailing yacht, 15 m (13 blocks), and PSV with STL parts (a crane, a funnel and an A-frame imported from STL files).
- **How to** in the app: a quick start, all keyboard shortcuts, a glossary of the terms used, and an About tab with the disclaimer. Table headings also explain themselves on hover.

## How to use it

1. **Start from your systems.** Each system that needs volume or deck area becomes a block. Use **New**, or open an example from the **Examples** menu.
2. **Set up groups** in the hierarchy on the left. Rename, recolour, add or delete them to match your own division.
3. **Write requirements** in the **Requirements** tab: choose a metric, at least or at most, and the shall and should values. To link a block to several requirements, tick them in the block panel.
4. **Pick the group and requirement** for new blocks in the two menus under the shape library.
5. **Add blocks** by clicking a shape or dragging it onto the workplane (dropping onto a block places it on top).
6. **Shape them.** Select a block and use **Move**, **Rotate** or **Scale**. To resize, choose Scale and drag the small coloured cubes (the opposite face stays fixed), or type L, B and H in the right panel. **Import STL** adds your own shape.
7. **Add a hull (optional).** Press **+ Hull** (a second makes a catamaran, a third a trimaran), tick **Defines main deck** on the block whose top is the deck, then click the hull row to edit it. While a hull is selected the blocks are dimmed. Set the draught, open **Shape** for the sliders, and press **Fit to blocks** after moving blocks. The eye next to **Hierarchy** hides all blocks, to look at the hulls alone.
8. **Add weight.** In the **Hydrostatics** tab set a density per group, and override it on a block in the right panel or the Blocks tab, with a fill percentage for tanks or a typed mass. Tick **Free surface** on a part-filled liquid tank. The structure share is set in the same tab.
9. **Float it.** Press **Float** in the toolbar and move blocks: the draught, trim and heel follow, and GM is shown in the readout.
10. **Read the Summary**, follow its links to the details, iterate until the requirements are met, and **Save** the project as JSON, or export it to Excel or to a PDF report.

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

The R/V Gunnerus example uses the main dimensions and the space areas and tank volumes published at [shiplab.github.io/gunnerus](https://shiplab.github.io/gunnerus/). The block positions are approximate and are not taken from the drawings. The PSV, catamaran, trimaran, container ship, tanker, bulk carrier and sailing yacht examples are illustrative. The crane, funnel and A-frame in *PSV with STL parts* are simplified shapes made for this tool, free to use; the original STL files are in the `examples` folder, so you can try **Import STL** with them. The hulls of the smaller examples are fitted automatically around the blocks, so the Gunnerus hull is a little longer than the real vessel; in the container ship, tanker and bulk carrier the blocks are fitted to the hull instead. Densities, fills and draughts in the examples are chosen so that each floats level with a sensible weight margin; they are not measured data.

## Citation

The approach and the tool are two different things, and they are cited separately.

**The approach.** If you use or refer to the Design Building Block approach, cite the paper:

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

**The tool.** If you use the Ship Design Building Block Editor itself, for example in teaching material, a report or a thesis, cite the software:

Gaspar, H.M. (2026). *Ship Design Building Block Editor* [Computer software]. NTNU. https://shiplab.github.io/dbb/

```bibtex
@software{gaspar2026dbbeditor,
  author       = {Gaspar, Henrique M.},
  title        = {{DBB} Block Editor},
  year         = {2026},
  note         = {Web application for teaching early-stage ship design, inspired by the Design Building Block approach},
  organization = {NTNU},
  url          = {https://shiplab.github.io/dbb/}
}
```

## Credit and acknowledgements

Developed by Henrique Gaspar, NTNU, October 2026. It builds on a block layout prototype from 2015.

Professor David Andrews, University College London, for his support over the years and the long collaboration between NTNU and UCL.
