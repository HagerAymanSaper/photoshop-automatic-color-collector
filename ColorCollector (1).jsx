#target photoshop
// ============================================================================
// SCRIPT 1 - Automatic Color Collector (start / status / stop)
// Run once to START. Run again to see status or STOP.
// Needs ColorCollector_Handler.jsx next to this file, or in an
// "Event Scripts Only" subfolder (recommended, keeps it out of the Scripts menu).
// Colors live in Photoshop's in-session memory (app.putCustomOptions),
// no external files are created.
// ============================================================================
(function () {
    var KEY = "CMYKColorCollector_v1";
    var GROUP_SIZE = 15;
    var HANDLER_NAME = "ColorCollector_Handler.jsx";

    function sid(s) { return stringIDToTypeID(s); }

    function load() {
        var st = { active: false, colors: "", count: 0, noArgs: false, mode: "", profile: "" };
        try {
            var d = app.getCustomOptions(KEY);
            if (d.hasKey(sid("active")))  st.active  = d.getBoolean(sid("active"));
            if (d.hasKey(sid("colors")))  st.colors  = d.getString(sid("colors"));
            if (d.hasKey(sid("count")))   st.count   = d.getInteger(sid("count"));
            if (d.hasKey(sid("noArgs")))  st.noArgs  = d.getBoolean(sid("noArgs"));
            if (d.hasKey(sid("mode")))    st.mode    = d.getString(sid("mode"));
            if (d.hasKey(sid("profile"))) st.profile = d.getString(sid("profile"));
        } catch (e) {}
        return st;
    }

    function save(st) {
        var d = new ActionDescriptor();
        d.putBoolean(sid("active"), st.active);
        d.putString(sid("colors"), st.colors);
        d.putInteger(sid("count"), st.count);
        d.putInteger(sid("groupSize"), GROUP_SIZE);
        d.putBoolean(sid("noArgs"), st.noArgs);
        d.putString(sid("mode"), st.mode);
        d.putString(sid("profile"), st.profile);
        app.putCustomOptions(KEY, d, false); // false = memory only, gone when Photoshop quits
    }

    // ---- locate handler ----
    var here = File($.fileName).parent;
    var handler = new File(here + "/Event Scripts Only/" + HANDLER_NAME);
    if (!handler.exists) handler = new File(here + "/" + HANDLER_NAME);

    function ourNotifiers() {
        var list = [], i;
        for (i = 0; i < app.notifiers.length; i++) {
            try {
                if (app.notifiers[i].eventFile.fsName === handler.fsName) list.push(app.notifiers[i]);
            } catch (e) {}
        }
        return list;
    }

    function unregister() {
        var list = ourNotifiers(), i;
        for (i = list.length - 1; i >= 0; i--) { try { list[i].remove(); } catch (e) {} }
    }

    function groupText(n) {
        var full = Math.floor(n / GROUP_SIZE), rest = n % GROUP_SIZE;
        var t = full + " full group(s) of " + GROUP_SIZE;
        if (rest) t += " + " + rest + " color(s) in Group " + (full + 1);
        return t;
    }

    function statusDialog(st) {
        var w = new Window("dialog", "Color Collector - session running");
        w.alignChildren = "fill";
        var msg = "Colors collected: " + st.count + "\n" + groupText(st.count);
        if (st.noArgs) {
            msg += "\n\nWARNING: Photoshop called the handler WITHOUT event data, so it could not " +
                   "tell eyedropper samples from other 'Set' events and recorded nothing. " +
                   "See the notes: a UXP plugin is then required.";
        }
        var t = w.add("statictext", undefined, msg, { multiline: true });
        t.preferredSize = [400, st.noArgs ? 120 : 50];
        var g = w.add("group");
        var bBuild = g.add("button", undefined, "Stop && build sheet");
        var bStop = g.add("button", undefined, "Stop collecting");
        var bKeep = g.add("button", undefined, "Keep collecting");
        var bDisc = g.add("button", undefined, "Stop && discard all");
        bBuild.onClick = function () { w.close(3); };
        bStop.onClick = function () { w.close(1); };
        bDisc.onClick = function () { w.close(2); };
        bKeep.onClick = function () { w.close(0); };
        return w.show();
    }

    // ---- main ----
    var st = load();
    var registered = ourNotifiers().length > 0;

    if (st.active && registered) {
        var r = statusDialog(st);
        if (r === 1 || r === 2 || r === 3) {
            unregister();
            st.active = false;
            if (r === 2) { st.colors = ""; st.count = 0; st.mode = ""; st.profile = ""; st.noArgs = false; }
            save(st);
            if (r === 3) {
                var sheet = new File(here + "/CMYKSwatchSheet.jsx");
                if (sheet.exists) { $.evalFile(sheet); }
                else { alert("Session stopped, but CMYKSwatchSheet.jsx was not found next to this script."); }
                return;
            }
            alert(r === 2
                ? "Session stopped and all colors discarded."
                : "Session stopped.\n" + st.count + " colors stored (" + groupText(st.count) + ").\n\nRun the CMYK Swatch Sheet script to build the sheet.");
        }
        return;
    }

    // ---- start a session ----
    if (!handler.exists) {
        alert("Cannot find " + HANDLER_NAME + ".\nPut it next to this script or in an 'Event Scripts Only' subfolder.");
        return;
    }

    if (st.count > 0) {
        var keep = confirm(st.count + " colors from an earlier session are still in memory.\n\n" +
                           "Yes = keep them and continue adding\nNo = discard them and start fresh");
        if (!keep) { st.colors = ""; st.count = 0; st.mode = ""; st.profile = ""; }
    }
    st.noArgs = false;
    st.active = true;

    app.notifiersEnabled = true;
    unregister();                       // never register twice
    app.notifiers.add("setd", handler); // 'Set' event; handler filters for foreground-color sets
    save(st);

    alert("Collecting started.\n\n" +
          "- Eyedropper: use Point Sample, and CLICK (do not drag) for each color.\n" +
          "- Every foreground-color change counts as a sample.\n" +
          "- Run this script again to see the count or to stop.\n\n" +
          "Currently stored: " + st.count + " colors.");
})();
