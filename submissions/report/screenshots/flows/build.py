"""Builds the flow-strip HTML for the report: cropped screenshots in a row with arrows.
Run: python3 build.py, then render each .html to .png with headless Chrome (see render.sh)."""
from pathlib import Path

HERE = Path(__file__).parent
# Crop of the expanded player's right column: Up next + tabs + panel (source px).
PANEL = dict(x=762, y=56, w=470, h=656)
TOAST = dict(x=1150, y=22, w=344, h=54)
STRIP = dict(x=470, y=760, w=575, h=34)

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;background:#fff;color:#1a1a1a}
.row{display:flex;align-items:flex-start;gap:0;padding:24px 20px}
.step{width:%(cw)dpx;display:flex;flex-direction:column;gap:10px}
.label{display:flex;gap:10px;align-items:flex-start;font-size:19px;line-height:1.3;font-weight:600;min-height:52px}
.num{flex:none;width:30px;height:30px;border-radius:50%%;background:#1a1a1a;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center}
.slot{height:%(th)dpx;display:flex;justify-content:flex-end}
.crop{border:1px solid #d6d6d6;border-radius:10px;overflow:hidden;position:relative;background-repeat:no-repeat}
.hl{position:absolute;border:3px solid #e8590c;border-radius:8px}
.arrow{width:56px;align-self:center;text-align:center;font-size:40px;color:#888;margin-top:60px}
.cap{font-size:15px;color:#555;text-align:center}
""" % dict(cw=PANEL['w'], th=TOAST['h'] + 4)


def crop(src, c, highlights=()):
    hl = ''.join(
        f'<div class="hl" style="left:{x}px;top:{y - c["y"]}px;width:{w}px;height:{h}px"></div>'
        for (x, y, w, h) in highlights)
    return (f'<div class="crop" style="width:{c["w"]}px;height:{c["h"]}px;'
            f'background-image:url(../raw/{src});background-position:-{c["x"]}px -{c["y"]}px">{hl}</div>')


def step(n, label, src, toast=False, strip=False, highlights=()):
    t = crop(src, TOAST) if toast else ''
    s = crop(src, STRIP) if strip else ''
    return (f'<div class="step"><div class="label"><span class="num">{n}</span><span>{label}</span></div>'
            f'<div class="slot">{t}</div>{crop(src, PANEL, highlights)}{s}</div>')


def page(name, steps):
    arrow = '<div class="arrow">&rarr;</div>'
    body = arrow.join(steps)
    (HERE / f'{name}.html').write_text(
        f'<!doctype html><html><head><meta charset="utf-8"><title>{name}</title><style>{CSS}</style></head>'
        f'<body><div class="row">{body}</div></body></html>')


# Up next rows sit at these source y ranges; highlight x is relative to the crop.
ROW = {1: 90, 5: 302}
def row_hl(r):
    return (14, ROW[r], 444, 46)

page('flow-s1', [
    step(1, 'The track explains itself; Up next before', '01-explanation-and-up-next-before.jpg', strip=True),
    step(2, 'Listener picks Too slow and Too gloomy', '02-reason-chips-picked.jpg'),
    step(3, 'Toast confirms the reading; two conflicting tracks are replaced', '03-toast-and-up-next-swapped.jpg',
         toast=True, highlights=[row_hl(1), row_hl(5)]),
])
page('flow-s2', [
    step(1, 'Listener types a reason no chip covers', '13-free-text-typed.jpg'),
    step(2, 'Toast says it is saved but does not steer; Up next is unchanged', '14-free-text-saved-toast.jpg', toast=True),
    step(3, 'The typed reason is listed under Dislikes', '15-dislikes-list-with-free-text.jpg'),
])
page('flow-s3', [
    step(1, 'Dislikes panel sums up everything steering', '06-dislikes-combined-effects.jpg'),
    step(2, 'Listener removes a dislike; its effects drop out', '07-dislike-removed-summary-updates.jpg', toast=True),
    step(3, 'The removed track can come up again', '08-removed-track-returns-to-up-next.jpg',
         highlights=[row_hl(5)]),
])

# Overview: the two views side by side, full screenshots at half size.
ov_css = CSS + """
.views{display:flex;gap:28px;padding:24px 20px}
.view{display:flex;flex-direction:column;gap:10px}
.view img{width:756px;border:1px solid #d6d6d6;border-radius:10px;display:block}
.vt{font-size:19px;font-weight:600}
.pin{position:absolute;background:#e8590c;color:#fff;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;white-space:nowrap}
.wrap{position:relative}
"""
def view(title, src, pins):
    p = ''.join(f'<div class="pin" style="left:{x}px;top:{y}px">{t}</div>' for (x, y, t) in pins)
    return f'<div class="view"><div class="vt">{title}</div><div class="wrap"><img src="../{src}">{p}</div></div>'

(HERE / 'overview.html').write_text(
    f'<!doctype html><html><head><meta charset="utf-8"><title>overview</title><style>{ov_css}</style></head><body>'
    '<div class="views">'
    + view('Main screen', '16-heard-list-collapsed-player.jpg',
           [(560, 4, 'Start new queue &rarr;'), (300, 150, 'Heard: tracks played this session'),
            (120, 359, 'Player bar'), (420, 359, 'Explanation &darr;'), (606, 322, 'Dislike &darr;'),
            (684, 322, 'Expand &darr;')])
    + '<div class="arrow" style="margin-top:0">&rarr;</div>'
    + view('Expanded player', '01-explanation-and-up-next-before.jpg',
           [(440, 26, '&larr; Up next'), (616, 183, '&larr; Tabs'), (616, 270, '&larr; Reason panel'),
            (40, 359, 'Explanation &darr;')])
    + '</div></body></html>')
print('ok')
