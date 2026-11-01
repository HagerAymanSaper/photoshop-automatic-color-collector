# Photoshop CMYK Color Collector & Swatch Sheet Generator

Two ExtendScript (`.jsx`) tools for Adobe Photoshop 2021. Sample colors with the normal Eyedropper tool, then generate a production-ready CMYK swatch sheet with one click.

- **Collector:** every Eyedropper click is captured automatically while a session is running.
- **Generator:** builds a new CMYK document with one **3 × 3 cm** square per color, each on its own layer, in the order the colors were sampled. No text or labels.

## Files

| File | Purpose |
|------|---------|
| `ColorCollector.jsx` | Start, check status and stop a collection session. Also has a **Stop & build sheet** button. |
| `ColorCollector_Handler.jsx` | Called automatically by Photoshop on each Eyedropper sample. Never run it manually. |
| `CMYKSwatchSheet.jsx` | Builds the CMYK swatch document from the collected colors. |

## Requirements

- Adobe Photoshop 2021 (v22). Other versions are untested.
- For exact CMYK values, the source document should be in CMYK mode. If it is RGB, Photoshop converts through your working CMYK profile.

## Installation

1. Copy `ColorCollector.jsx` and `CMYKSwatchSheet.jsx` into the Photoshop scripts folder:
   - Windows: `C:\Program Files\Adobe\Adobe Photoshop 2021\Presets\Scripts`
   - macOS: `/Applications/Adobe Photoshop 2021/Presets/Scripts`
2. Inside that folder, open (or create) the subfolder `Event Scripts Only` and copy `ColorCollector_Handler.jsx` there.
3. Restart Photoshop. The two scripts appear under **File > Scripts**.

Without admin rights you can run the scripts from any folder via **File > Scripts > Browse**. In that case keep all three files in the same folder.

## Usage

1. Open your design and choose the Eyedropper tool (`I`). Set **Sample Size** to **Point Sample**.
2. Run **File > Scripts > ColorCollector** to start a session.
3. Click each color you want. Click, do not drag.
4. Run **ColorCollector** again to see the count. Choose one of:
   - **Stop & build sheet:** stop and generate the swatch document immediately.
   - **Stop collecting:** stop only. Run **CMYKSwatchSheet** later.
   - **Keep collecting:** close the dialog and continue.
   - **Stop & discard all:** stop and clear the stored colors.
5. The new CMYK document opens with all swatches.

## How it works

Plain JSX cannot listen to tool clicks. This project uses Photoshop's notifier system:

1. `ColorCollector.jsx` registers `ColorCollector_Handler.jsx` for the `Set` event.
2. After every event, the handler checks that it is a *set foreground color* event. Other `Set` events are ignored.
3. The foreground color is stored as CMYK values in Photoshop's in-session memory (`app.putCustomOptions`, non-persistent). No CSV, TXT or other files are created, and the source document is never modified.
4. Because capture is event-driven, rapid samples and repeated identical colors are all recorded.

Colors are grouped in sets of 15 by collection order (1-15 = Group 1, 16-30 = Group 2, and so on). In the generated document each group becomes a layer group and a row of the grid.

Stored colors are lost when Photoshop quits.

## Output sheet

- CMYK, 8-bit, 254 ppi. At 254 ppi, 1 cm is exactly 100 px, so each 3 cm square is exactly 300 × 300 px.
- 15 columns, 0.5 cm gap, 1 cm margin. Canvas size is calculated from the number of colors.
- One layer per square, named `Swatch 001`, `Swatch 002`, and so on.
- The source CMYK profile is assigned to the new document when the source was CMYK.

### Configuration

Edit the constants at the top of `CMYKSwatchSheet.jsx`:

```js
var SQUARE_CM        = 3;
var RESOLUTION       = 254;   // use 254 or a multiple for pixel-exact sizes
var GAP_CM           = 0.5;
var MARGIN_CM        = 1;
var COLUMNS          = 15;
var GROUP_LAYERS     = true;
var WHITE_BACKGROUND = true;
```

## Limitations

- Photoshop limits: 300,000 px per canvas side and 8,000 layers. The script warns before exceeding them.
- Any foreground-color change is treated as a sample, including clicks in the Swatches panel or Color Picker.
- Dragging the Eyedropper may record many colors. Click once per color.
- Photoshop's Swatches panel groups are not scriptable in Photoshop 2021, so groups of 15 are kept in memory instead.
- Values are stored with 2-decimal precision and filled at 8-bit depth, so tiny rounding differences are possible.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Status shows 0 colors after clicking | Make sure the handler is in `Event Scripts Only` (or next to `ColorCollector.jsx`) and restart Photoshop. |
| Warning that the handler got no event data | Your Photoshop build does not pass event data to notifier scripts. A UXP plugin would be needed. |
| "Cannot find ColorCollector_Handler.jsx" | Move the handler into `Event Scripts Only` or next to `ColorCollector.jsx`. |
| "Stop & build sheet" cannot find the generator | Keep `CMYKSwatchSheet.jsx` in the same folder as `ColorCollector.jsx`. |
| Generator says collection is still running | Run `ColorCollector` and stop the session first. |

## License

Add a license of your choice, for example MIT.
