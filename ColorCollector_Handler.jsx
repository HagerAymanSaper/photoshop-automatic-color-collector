// ============================================================================
// ColorCollector_Handler.jsx
// Called BY PHOTOSHOP on every 'Set' event once ColorCollector.jsx has
// registered it. Do not run manually. Silent: never shows dialogs.
// Records app.foregroundColor (as CMYK) only when the event is a
// "set foreground color" event, so repeated identical colors are captured.
// ============================================================================
var __handlerArgs = (typeof arguments !== "undefined") ? arguments : [];

(function (A) {
    var KEY = "CMYKColorCollector_v1";
    function sid(s) { return stringIDToTypeID(s); }
    function cid(s) { return charIDToTypeID(s); }
    function r2(v) { return (Math.round(v * 100) / 100).toFixed(2); }

    // 1. find the event descriptor Photoshop passed in (if any)
    var ev = null, i;
    for (i = 0; i < A.length; i++) {
        try { if (A[i] && A[i].hasKey) { ev = A[i]; break; } } catch (e) {}
    }

    // 2. cheap filter first: is this 'set  Clr.FrgC' ?
    if (ev) {
        var isFg = false;
        try {
            var ref = ev.getReference(cid("null"));
            isFg = (ref.getForm() == ReferenceFormType.PROPERTY) &&
                   (ref.getProperty() == cid("FrgC"));
        } catch (e) {}
        if (!isFg) return;
    }

    // 3. only act during an active session
    var d;
    try { d = app.getCustomOptions(KEY); } catch (e) { return; }
    if (!d.hasKey(sid("active")) || !d.getBoolean(sid("active"))) return;

    // 4. no event data available -> cannot filter reliably -> record nothing, raise flag
    if (!ev) {
        if (!d.hasKey(sid("noArgs"))) {
            d.putBoolean(sid("noArgs"), true);
            app.putCustomOptions(KEY, d, false);
        }
        return;
    }

    // 5. capture
    var c = app.foregroundColor.cmyk;
    var entry = r2(c.cyan) + "," + r2(c.magenta) + "," + r2(c.yellow) + "," + r2(c.black) + ";";

    var colors = d.hasKey(sid("colors")) ? d.getString(sid("colors")) : "";
    var count  = d.hasKey(sid("count"))  ? d.getInteger(sid("count")) : 0;

    if (count === 0) { // remember source color mode / profile (read only)
        try {
            if (app.documents.length) {
                d.putString(sid("mode"), String(app.activeDocument.mode));
                d.putString(sid("profile"), String(app.activeDocument.colorProfileName));
            }
        } catch (e) {}
    }

    d.putString(sid("colors"), colors + entry);
    d.putInteger(sid("count"), count + 1);
    app.putCustomOptions(KEY, d, false);
})(__handlerArgs);
