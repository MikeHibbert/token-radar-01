"""Out-of-process render probe for the `renders` artifact row.

Why this file exists (declared-work discipline, work_7dfd321917; Lesson 16,
docs/kindling-training-lessons.md): the token-radar-01 artifact gate passed 7/7
while the dashboard painted nothing. reviewHours was a const called by farmSteps
during the rows.map - a temporal-dead-zone throw before first paint - and the only
witness was a screenshot collapsing 347,462 -> 105,432 bytes. A gate that parses
artifacts is not a gate that reads the page. This probe executes the page in a real
browser and reports what the DOM actually contains.

It is driven out of process by check-artifacts.ts because that clone has no
node_modules: an in-process Playwright import would throw at load and take all
eight rows down with it. The probe prints exactly one JSON object on stdout and
exits non-zero when the page cannot be rendered at all, so a browser that will not
launch is a named failure rather than a silent pass.

Usage: python3 render-probe.py <dashboard-dir> <board.json>
"""

import json
import sys
from pathlib import Path


def _row_name(row):
    """Name of a board row, whether it is an object or the compact array form.

    WHY (work_7dfd321917): out/dashboard/data.js stores rows as positional arrays
    (["bybit","Bybit",1,...]) while board.json stores objects; the row must read the
    name from either shape or the detail-panel assertion compares against None.
    """
    if isinstance(row, dict):
        return row.get("name")
    if isinstance(row, (list, tuple)) and len(row) > 1:
        return row[1]
    return None


def _encode_like(template, row):
    """Re-encode a board.json row object into data.js's positional-array shape.

    WHY (work_7dfd321917): the two files describe the same rows in different shapes. The
    template is a live data.js row, so the field order is the page's own, not a guess.
    """
    if not isinstance(row, dict):
        return row
    out = []
    for slot in template:
        if isinstance(slot, str) and slot in row:
            out.append(row[slot])
        elif isinstance(slot, list):
            out.append(row.get("chains", slot))
        elif isinstance(slot, (int, float)) and not isinstance(slot, bool):
            out.append(row.get("implied_value_usd", slot))
        else:
            out.append(slot)
    return out


def main() -> int:
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "error": "usage: render-probe.py <dashboard-dir> <board.json>"}))
        return 2

    dashboard = Path(sys.argv[1]).resolve()
    board_path = Path(sys.argv[2]).resolve()
    index = dashboard / "index.html"
    if not index.is_file():
        print(json.dumps({"ok": False, "error": f"missing {index}"}))
        return 2

    board = json.loads(board_path.read_text(encoding="utf-8"))
    board_rows = board if isinstance(board, list) else board.get("rows", [])
    # WHY (work_7dfd321917, corrected live 26 Nov 2026): the expected count must come from the
    # REAL board, never from the board being rendered. Deriving it from the same file made a
    # blank board report ok:true (0 == 0) - a row that passes a blank board has proved nothing.
    # --expect pins the real count while a deliberately blank board is rendered.
    expect_arg = None
    if "--expect" in sys.argv:
        expect_arg = int(sys.argv[sys.argv.index("--expect") + 1])
    expected = expect_arg if expect_arg is not None else len(board_rows)
    first_name = _row_name(board_rows[0]) if board_rows else None

    # WHY (work_7dfd321917, proof obligation): the page reads out/dashboard/data.js, not
    # board.json, so a blank board fed only to board.json would still paint the old rows and
    # the row would pass a blank board - proving nothing. When the caller supplies a board
    # whose rows differ from data.js, rewrite data.js in a scratch copy of the dashboard so
    # the page under test really is the blank one. The real out/ is never modified.
    data_js = dashboard / "data.js"
    if data_js.is_file():
        text = data_js.read_text(encoding="utf-8")
        marker = text.find("=")
        try:
            embedded = json.loads(text[marker + 1:].strip().rstrip(";"))
        except Exception:  # noqa: BLE001 - unparseable data.js is left alone; the row still counts the DOM
            embedded = None
        # WHY (work_7dfd321917): board.json is the single authority for the expected count. The
        # scratch copy below is always rebuilt from board.json's rows, so reading the count back
        # out of data.js would only ever echo the file we just wrote - the item forbids that.
        # WHY (work_7dfd321917, proof obligation, corrected): the page reads data.js, so the
        # blank-board proof must blank data.js too - but the payload written into the scratch
        # copy must keep data.js's OWN shape. data.js stores rows as positional arrays; writing
        # board.json's object rows into it would make the page throw on row[0] and the row would
        # fail for the wrong reason. So the scratch data.js is the board's rows re-encoded in the
        # shape data.js already uses, and the real out/ is never modified.
        # WHY (work_7dfd321917, proof obligation): the page reads data.js, so a blank board.json
        # alone would still paint a full page and the row would pass a blank board - proving
        # nothing. The scratch copy is therefore always built from board.json's rows, re-encoded
        # in data.js's own shape, so board.json is the single authority for what should paint.
        if embedded is not None:
            import shutil
            import tempfile

            scratch = Path(tempfile.mkdtemp(prefix="render-probe-"))
            shutil.copytree(dashboard, scratch / "dashboard")
            # WHY (work_7dfd321917, corrected live 26 Nov 2026): data.js stores each row as a
            # POSITIONAL ARRAY (["bybit","Bybit",1,1274423855,"CEX",[...]]), while board.json
            # stores each row as an OBJECT. Writing board.json's objects into data.js made the
            # page throw "Cannot read properties of undefined (reading '0')" and paint 0 rows -
            # a failure of the probe, not of the dashboard. So board rows are re-encoded into
            # data.js's own array shape, using the live data.js row as the field template.
            template = None
            if isinstance(embedded, dict):
                for candidate in embedded.get("rows") or []:
                    if isinstance(candidate, list):
                        template = candidate
                        break
            if template is not None:
                board_rows = [_encode_like(template, row) for row in board_rows]
            if isinstance(embedded, list):
                payload = board_rows
            else:
                payload = {**embedded, "rows": board_rows}
            # WHY (work_7dfd321917, corrected live 26 Nov 2026): the page reads
            # window.TOKEN_RADAR (out/dashboard/app.js line 3: `const source = window.TOKEN_RADAR`).
            # Writing window.BOARD here left the page with no data at all, so the probe counted 0
            # tbody rows on a healthy out/ and would have "failed" a blank board for the wrong
            # reason - a row that cannot tell a broken page from a blank one proves nothing.
            (scratch / "dashboard" / "data.js").write_text(
                "window.TOKEN_RADAR = " + json.dumps(payload) + ";\n", encoding="utf-8"
            )
            dashboard = scratch / "dashboard"
            index = dashboard / "index.html"

    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:  # noqa: BLE001 - reported, never swallowed
        print(json.dumps({"ok": False, "error": f"playwright unavailable: {error}"}))
        return 2

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(args=["--no-sandbox"])
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                page.goto(index.as_uri(), wait_until="load")
                # The page is a single IIFE that paints synchronously on load; give the
                # deferred scripts one turn to run before counting anything.
                page.wait_for_timeout(250)

                tbody_count = page.locator("#boardRows tr[data-slug]").count()
                empty_hidden = page.evaluate(
                    "() => { const el = document.getElementById('empty');"
                    " return el ? (el.hidden === true || getComputedStyle(el).display === 'none') : null; }"
                )

                detail_name = None
                detail_visible = False
                if tbody_count > 0:
                    page.locator("#boardRows tr[data-slug]").first.click()
                    page.wait_for_timeout(150)
                    heading = page.locator("#detail .detail-identity h2").first
                    detail_visible = heading.is_visible()
                    detail_name = heading.inner_text().strip() if detail_visible else None

                # WHY (work_7dfd321917): ok is gated on the count, not just on "the browser
                # launched". A probe that reports ok:true while the DOM is empty is the same
                # false pass this row exists to prevent.
                print(json.dumps({
                    "ok": tbody_count == expected,
                    "expected": expected,
                    "tbody_count": tbody_count,
                    "empty_hidden": empty_hidden,
                    "detail_visible": detail_visible,
                    "detail_name": detail_name,
                    "first_name": first_name,
                }))
                return 0
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - a browser that cannot render is a named failure
        print(json.dumps({"ok": False, "error": f"render failed: {error}"}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
