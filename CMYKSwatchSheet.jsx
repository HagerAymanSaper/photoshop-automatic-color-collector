#target photoshop
// ============================================================================
// SCRIPT 2 - CMYK Swatch Sheet Generator
// Reads the colors collected by ColorCollector.jsx from Photoshop's memory and
// builds a new CMYK document: one 3 x 3 cm square per color, one layer each,
// in collection order, no text.
// ============================================================================
(function () {
    // ------------------------------ CONFIG ---------------------------------
    var SQUARE_CM        = 3;
    var RESOLUTION       = 254;   // ppi. 254 ppi = exactly 100 px/cm -> 3 cm = 300 px (pixel-exact)
    var GAP_CM           = 0.5;
    var MARGIN_CM        = 1;
    var COLUMNS          = 15;    // 15 = one collection group per row
    var GROUP_LAYERS     = true;  // put each group of 15 layers into a layer group
    var WHITE_BACKGROUND = true;  // false = transparent background
    // -----------------------------------------------------------------------

    var KEY = "CMYKColorCollector_v1";
    function sid(s) { return stringIDToTypeID(s); }
    function pad(n) { var s = "" + n; while (s.length < 4) s = "0" + s; return s; }

    // ---- read state ----
    var st = { active: false, colors: "", count: 0, groupSize: 15, mode: "", profile: "" };
    try {
        var d = app.getCustomOptions(KEY);
        if (d.hasKey(sid("active")))    st.active    = d.getBoolean(sid("active"));
        if (d.hasKey(sid("colors")))    st.colors    = d.getString(sid("colors"));
        if (d.hasKey(sid("count")))     st.count     = d.getInteger(sid("count"));
        if (d.hasKey(sid("groupSize"))) st.groupSize = d.getInteger(sid("groupSize"));
        if (d.hasKey(sid("mode")))      st.mode      = d.getString(sid("mode"));
        if (d.hasKey(sid("profile")))   st.profile   = d.getString(sid("profile"));
    } catch (e) {}

    if (!st.count) { alert("No collected colors found in Photoshop's memory.\nRun the Color Collector first."); return; }
    if (st.active) { alert("The collection session is still running.\nRun the Color Collector script again and choose 'Stop collecting' first."); return; }

    // ---- parse colors (order preserved) ----
    var parts = st.colors.split(";"), colors = [], i, v;
    for (i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        v = parts[i].split(",");
        colors.push([parseFloat(v[0]), parseFloat(v[1]), parseFloat(v[2]), parseFloat(v[3])]);
    }
    var n = colors.length;

    // ---- geometry (all integer pixels) ----
    var pxPerCm = RESOLUTION / 2.54;
    function px(cm) { return Math.round(cm * pxPerCm); }
    var sq = px(SQUARE_CM), gap = px(GAP_CM), mar = px(MARGIN_CM);

    if (Math.abs(SQUARE_CM * pxPerCm - sq) > 0.001) {
        var actual = (sq / RESOLUTION * 2.54).toFixed(4);
        if (!confirm("At " + RESOLUTION + " ppi, 3 cm is not a whole number of pixels.\n" +
                     "Squares would be " + sq + " px = " + actual + " cm.\n\nContinue anyway?\n" +
                     "(Use 254 ppi, or a multiple of it, for exact sizes.)")) return;
    }

    var cols = Math.min(COLUMNS, n);
    var rows = Math.ceil(n / cols);
    var W = 2 * mar + cols * sq + (cols - 1) * gap;
    var H = 2 * mar + rows * sq + (rows - 1) * gap;
    var nGroups = GROUP_LAYERS ? Math.ceil(n / st.groupSize) : 0;

    if (W > 300000 || H > 300000) { alert("Canvas would be " + W + " x " + H + " px; Photoshop's limit is 300,000 px per side."); return; }
    if (n + nGroups + 1 > 8000)   { alert("Too many layers (" + (n + nGroups + 1) + "). Photoshop supports at most 8000."); return; }

    // ---- build ----
    var oldRuler = app.preferences.rulerUnits;
    var oldDialogs = app.displayDialogs;
    app.preferences.rulerUnits = Units.PIXELS;
    app.displayDialogs = DialogModes.NO;

    var profileNote = "";
    try {
        var doc = app.documents.add(
            new UnitValue(W, "px"), new UnitValue(H, "px"), RESOLUTION, "CMYK Swatch Sheet",
            NewDocumentMode.CMYK,
            WHITE_BACKGROUND ? DocumentFill.WHITE : DocumentFill.TRANSPARENT,
            1, BitsPerChannelType.EIGHT);

        // assign the source CMYK profile (before any pixels exist) so numbers keep their meaning
        if (st.profile && String(st.mode).indexOf("CMYK") > -1) {
            try { doc.colorProfileType = ColorProfile.CUSTOM; doc.colorProfileName = st.profile; } catch (e) {}
        } else if (st.mode) {
            profileNote = "\nNote: the source document was not CMYK, so CMYK values are Photoshop's conversion via your working CMYK profile.";
        }

        var group = null, layer, col, x, y, c, r;
        for (i = 0; i < n; i++) {
            if (GROUP_LAYERS && i % st.groupSize === 0) {
                group = doc.layerSets.add();
                group.name = "Group " + (Math.floor(i / st.groupSize) + 1);
            }
            layer = (group ? group.artLayers : doc.artLayers).add();
            layer.name = "Swatch " + pad(i + 1);
            doc.activeLayer = layer;

            c = i % cols; r = Math.floor(i / cols);
            x = mar + c * (sq + gap);
            y = mar + r * (sq + gap);
            doc.selection.select([[x, y], [x + sq, y], [x + sq, y + sq], [x, y + sq]]);

            col = new SolidColor();
            col.cmyk.cyan    = colors[i][0];
            col.cmyk.magenta = colors[i][1];
            col.cmyk.yellow  = colors[i][2];
            col.cmyk.black   = colors[i][3];
            doc.selection.fill(col);
        }
        doc.selection.deselect();

        alert("Done: " + n + " swatches (" + sq + " px = " + (sq / RESOLUTION * 2.54).toFixed(2) + " cm each)\n" +
              "Canvas " + W + " x " + H + " px at " + RESOLUTION + " ppi, CMYK, 8-bit." + profileNote);
    } catch (err) {
        alert("Swatch generation failed:\n" + err);
    } finally {
        app.preferences.rulerUnits = oldRuler;
        app.displayDialogs = oldDialogs;
    }
})();
