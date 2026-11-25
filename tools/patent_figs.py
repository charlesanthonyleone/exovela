#!/usr/bin/env python3
"""Patent-style line figures (FIG. 1–10) for the Exovela disclosure draft."""
from pathlib import Path
import math

OUT = Path(__file__).resolve().parents[1] / "assets" / "figures"
OUT.mkdir(parents=True, exist_ok=True)

INK = "#111"
THIN = 1.15
MID = 1.45
THICK = 2.05

def svg(w, h, title, body, fig):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t">
  <title id="t">{title}</title>
  <rect width="{w}" height="{h}" fill="#fff"/>
  {body}
  <text x="{w/2}" y="{h-18}" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="18" font-weight="700" fill="{INK}">FIG. {fig}</text>
</svg>
'''

def t(x, y, s, size=13, anchor="start", weight="700"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Times New Roman, Times, serif" font-size="{size}" font-weight="{weight}" fill="{INK}">{s}</text>'

def lead(x1, y1, x2, y2, num, side="end"):
    """Leader from point on drawing (x1,y1) to numeral (x2,y2)."""
    circ = f'<circle cx="{x2}" cy="{y2-4}" r="11" fill="#fff" stroke="{INK}" stroke-width="1.1"/>'
    tx = t(x2, y2, str(num), 12, "middle")
    return f'<path d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="{INK}" stroke-width="0.9" fill="none"/>{circ}{tx}'

def path(d, w=MID, dash=None, fill="none"):
    ds = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{ds}/>'

def circ(cx, cy, r, w=MID, fill="none"):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="{w}"/>'

def line(x1,y1,x2,y2,w=THIN,dash=None):
    ds = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="{w}" stroke-linecap="round"{ds}/>'

# --- garment silhouettes (front) ---------------------------------
def hoodie_front(ox, oy, sx=1, sy=1, hood=True):
    # coordinates in a ~180x260 local box, translated
    def X(x): return ox + x*sx
    def Y(y): return oy + y*sy
    d = []
    # body
    d.append(path(
        f"M{X(40)} {Y(86)} C{X(28)} {Y(100)},{X(22)} {Y(140)},{X(24)} {Y(200)} "
        f"L{X(48)} {Y(204)} L{X(52)} {Y(186)} L{X(128)} {Y(186)} L{X(132)} {Y(204)} "
        f"L{X(156)} {Y(200)} C{X(158)} {Y(140)},{X(152)} {Y(100)},{X(140)} {Y(86)} "
        f"C{X(128)} {Y(78)},{X(52)} {Y(78)},{X(40)} {Y(86)} Z"
    ))
    # sleeves
    d.append(path(
        f"M{X(40)} {Y(90)} C{X(10)} {Y(110)},{X(-4)} {Y(150)},{X(10)} {Y(200)} "
        f"L{X(36)} {Y(196)} C{X(28)} {Y(150)},{X(38)} {Y(118)},{X(50)} {Y(100)}"
    ))
    d.append(path(
        f"M{X(140)} {Y(90)} C{X(170)} {Y(110)},{X(184)} {Y(150)},{X(170)} {Y(200)} "
        f"L{X(144)} {Y(196)} C{X(152)} {Y(150)},{X(142)} {Y(118)},{X(130)} {Y(100)}"
    ))
    # rib hem + cuffs
    d.append(path(f"M{X(48)} {Y(198)} L{X(48)} {Y(214)} L{X(132)} {Y(214)} L{X(132)} {Y(198)}"))
    for x in range(52, 130, 6):
        d.append(line(X(x), Y(200), X(x), Y(212), 0.7))
    d.append(path(f"M{X(10)} {Y(196)} L{X(10)} {Y(210)} L{X(34)} {Y(208)} L{X(34)} {Y(196)}"))
    d.append(path(f"M{X(170)} {Y(196)} L{X(170)} {Y(210)} L{X(146)} {Y(208)} L{X(146)} {Y(196)}"))
    if hood:
        d.append(path(
            f"M{X(58)} {Y(86)} C{X(50)} {Y(50)},{X(58)} {Y(18)},{X(90)} {Y(12)} "
            f"C{X(122)} {Y(18)},{X(130)} {Y(50)},{X(122)} {Y(86)}"
        ))
        # opening
        d.append(path(
            f"M{X(70)} {Y(86)} C{X(72)} {Y(58)},{X(90)} {Y(42)},{X(90)} {Y(40)} "
            f"C{X(90)} {Y(42)},{X(108)} {Y(58)},{X(110)} {Y(86)}"
        ))
        # drawcords
        d.append(path(f"M{X(70)} {Y(86)} C{X(66)} {Y(110)},{X(62)} {Y(128)},{X(64)} {Y(140)}"))
        d.append(path(f"M{X(110)} {Y(86)} C{X(114)} {Y(110)},{X(118)} {Y(128)},{X(116)} {Y(140)}"))
        d.append(path(f"M{X(62)} {Y(138)} L{X(66)} {Y(138)} L{X(66)} {Y(150)} L{X(62)} {Y(150)} Z", w=THIN, fill="#fff"))
        d.append(path(f"M{X(114)} {Y(138)} L{X(118)} {Y(138)} L{X(118)} {Y(150)} L{X(114)} {Y(150)} Z", w=THIN, fill="#fff"))
    return "\n".join(d)

def jacket_front(ox, oy, sx=1, sy=1):
    def X(x): return ox + x*sx
    def Y(y): return oy + y*sy
    d = []
    d.append(path(
        f"M{X(42)} {Y(70)} C{X(28)} {Y(88)},{X(22)} {Y(130)},{X(24)} {Y(200)} "
        f"L{X(50)} {Y(204)} L{X(54)} {Y(188)} L{X(126)} {Y(188)} L{X(130)} {Y(204)} "
        f"L{X(156)} {Y(200)} C{X(158)} {Y(130)},{X(152)} {Y(88)},{X(138)} {Y(70)} "
        f"C{X(120)} {Y(58)},{X(60)} {Y(58)},{X(42)} {Y(70)} Z"
    ))
    d.append(path(f"M{X(42)} {Y(76)} C{X(8)} {Y(100)},{X(-2)} {Y(150)},{X(12)} {Y(200)} L{X(36)} {Y(196)} C{X(26)} {Y(148)},{X(36)} {Y(110)},{X(54)} {Y(86)}"))
    d.append(path(f"M{X(138)} {Y(76)} C{X(172)} {Y(100)},{X(182)} {Y(150)},{X(168)} {Y(200)} L{X(144)} {Y(196)} C{X(154)} {Y(148)},{X(144)} {Y(110)},{X(126)} {Y(86)}"))
    # collar
    d.append(path(f"M{X(70)} {Y(62)} C{X(66)} {Y(48)},{X(90)} {Y(40)},{X(90)} {Y(42)} C{X(90)} {Y(40)},{X(114)} {Y(48)},{X(110)} {Y(62)}"))
    # zipper
    d.append(line(X(90), Y(62), X(90), Y(188), 1.2))
    for y in range(70, 186, 6):
        d.append(line(X(87), Y(y), X(93), Y(y), 0.8))
    d.append(path(f"M{X(50)} {Y(198)} L{X(50)} {Y(214)} L{X(130)} {Y(214)} L{X(130)} {Y(198)}"))
    return "\n".join(d)

def pants_front(ox, oy, sx=1, sy=1):
    def X(x): return ox + x*sx
    def Y(y): return oy + y*sy
    d = []
    d.append(path(
        f"M{X(40)} {Y(20)} L{X(140)} {Y(20)} L{X(144)} {Y(50)} "
        f"C{X(148)} {Y(90)},{X(150)} {Y(160)},{X(142)} {Y(230)} "
        f"L{X(108)} {Y(230)} L{X(104)} {Y(120)} L{X(90)} {Y(70)} L{X(76)} {Y(120)} "
        f"L{X(72)} {Y(230)} L{X(38)} {Y(230)} "
        f"C{X(30)} {Y(160)},{X(32)} {Y(90)},{X(36)} {Y(50)} Z"
    ))
    d.append(path(f"M{X(40)} {Y(20)} L{X(40)} {Y(8)} L{X(140)} {Y(8)} L{X(140)} {Y(20)}"))
    for x in range(46, 136, 6):
        d.append(line(X(x), Y(10), X(x), Y(20), 0.7))
    d.append(path(f"M{X(38)} {Y(222)} L{X(38)} {Y(240)} L{X(72)} {Y(240)} L{X(72)} {Y(222)}"))
    d.append(path(f"M{X(108)} {Y(222)} L{X(108)} {Y(240)} L{X(142)} {Y(240)} L{X(142)} {Y(222)}"))
    return "\n".join(d)

def inner_front(ox, oy, sx=1, sy=1, show_pack=False):
    def X(x): return ox + x*sx
    def Y(y): return oy + y*sy
    d = []
    d.append(path(
        f"M{X(48)} {Y(80)} C{X(36)} {Y(96)},{X(32)} {Y(140)},{X(34)} {Y(196)} "
        f"L{X(54)} {Y(200)} L{X(58)} {Y(186)} L{X(122)} {Y(186)} L{X(126)} {Y(200)} "
        f"L{X(146)} {Y(196)} C{X(148)} {Y(140)},{X(144)} {Y(96)},{X(132)} {Y(80)} "
        f"C{X(118)} {Y(70)},{X(62)} {Y(70)},{X(48)} {Y(80)} Z",
        w=MID, dash="5 3"
    ))
    d.append(path(f"M{X(48)} {Y(86)} C{X(22)} {Y(110)},{X(14)} {Y(150)},{X(22)} {Y(196)} L{X(40)} {Y(192)}"))
    d.append(path(f"M{X(132)} {Y(86)} C{X(158)} {Y(110)},{X(166)} {Y(150)},{X(158)} {Y(196)} L{X(140)} {Y(192)}"))
    # neck
    d.append(path(f"M{X(70)} {Y(76)} C{X(78)} {Y(64)},{X(102)} {Y(64)},{X(110)} {Y(76)}"))
    # harness
    d.append(path(f"M{X(70)} {Y(100)} L{X(58)} {Y(160)} L{X(90)} {Y(168)} L{X(122)} {Y(160)} L{X(110)} {Y(100)}", w=THIN))
    d.append(path(f"M{X(70)} {Y(100)} L{X(110)} {Y(100)}", w=THIN))
    # dock plate upper back shown as a diamond on chest? front: small chest pads, dock is on back.
    d.append(path(f"M{X(82)} {Y(92)} L{X(98)} {Y(92)} L{X(98)} {Y(108)} L{X(82)} {Y(108)} Z", w=THIN))
    for ix in (86, 90, 94):
        for iy in (96, 100, 104):
            d.append(circ(X(ix), Y(iy), 1.3, 0.8, fill=INK))
    return "\n".join(d)

def pack_back(ox, oy, sx=1, sy=1):
    def X(x): return ox + x*sx
    def Y(y): return oy + y*sy
    d = []
    d.append(path(
        f"M{X(48)} {Y(80)} C{X(36)} {Y(96)},{X(32)} {Y(140)},{X(34)} {Y(196)} "
        f"L{X(146)} {Y(196)} C{X(148)} {Y(140)},{X(144)} {Y(96)},{X(132)} {Y(80)} "
        f"C{X(118)} {Y(70)},{X(62)} {Y(70)},{X(48)} {Y(80)} Z",
        dash="5 3"
    ))
    # spine pack
    d.append(path(f"M{X(78)} {Y(130)} L{X(102)} {Y(130)} L{X(102)} {Y(168)} L{X(78)} {Y(168)} Z"))
    for i, yy in enumerate((138, 146, 154, 162)):
        d.append(line(X(82), Y(yy), X(98), Y(yy), 0.8))
    d.append(circ(X(96), Y(136), 2.2, 0.9, fill="#fff"))
    # dock upper back
    d.append(path(f"M{X(80)} {Y(96)} L{X(100)} {Y(96)} L{X(100)} {Y(116)} L{X(80)} {Y(116)} Z"))
    for ix in (84, 90, 96):
        for iy in (100, 106, 112):
            d.append(circ(X(ix), Y(iy), 1.4, 0.8))
    # harness crossing back
    d.append(path(f"M{X(60)} {Y(100)} L{X(80)} {Y(130)} L{X(80)} {Y(168)}", w=THIN))
    d.append(path(f"M{X(120)} {Y(100)} L{X(100)} {Y(130)} L{X(100)} {Y(168)}", w=THIN))
    d.append(path(f"M{X(60)} {Y(148)} L{X(120)} {Y(148)}", w=THIN))
    return "\n".join(d)


def fig1():
    body = [
        hoodie_front(340, 80, 1.15, 1.15),
        # implied inner at hem / cuff as dashed
        path("M398 310 C390 330,390 345,392 360 L408 362", dash="4 3", w=THIN),
        lead(430, 200, 620, 120, 14),   # shell
        lead(500, 160, 620, 80, 22),    # display
        lead(445, 115, 260, 70, 46),    # hood
        lead(455, 325, 620, 340, 48),   # rib hem
        lead(355, 300, 200, 300, 44),   # cuff
        lead(455, 250, 200, 200, 10),   # system
        lead(428, 155, 200, 130, 88),   # drawcord
        t(450, 30, "Wearable display garment system, assembled", 16, "middle", "400"),
    ]
    return svg(900, 700, "FIG. 1 assembled two-piece garment system", "\n".join(body), 1)

def fig2():
    body = [
        t(450, 36, "Exploded view: outer shell separated from inner suit", 16, "middle", "400"),
        # outer raised
        hoodie_front(340, 20, 1.0, 1.0),
        # inner lower
        inner_front(348, 310, 1.0, 1.0),
        pack_back  # no, front view of inner is enough; add pack as a small back callout?
        ,
        # actually draw inner with pack to the side (back view)
        pack_back(80, 300, 0.9, 0.9),
        t(160, 560, "Inner suit, back", 12, "middle", "400"),
        t(450, 620, "Inner suit, front", 12, "middle", "400"),
        t(450, 40, "", 1),
        # dock on shell underside (small plate)
        path("M428 268 L452 268 L452 286 L428 286 Z", w=THIN),
        lead(430, 140, 680, 80, 14),
        lead(440, 250, 680, 200, 28),  # dock on shell
        lead(450, 430, 680, 400, 12),
        lead(140, 430, 60, 400, 34),  # pack
        lead(155, 400, 60, 340, 36),  # harness
        lead(155, 388, 60, 280, 28),  # dock inner
        lead(430, 70, 200, 50, 46),
    ]
    # pack_back returned into list incorrectly - I put a comment in the list. Fix by building cleanly.
    return None

def fig2_clean():
    parts = [
        t(450, 36, "Exploded view: outer shell separated from inner suit", 16, "middle", "400"),
        hoodie_front(340, 10, 1.0, 0.95),
        inner_front(348, 300, 1.0, 0.95),
        pack_back(70, 290, 0.95, 0.95),
        t(155, 560, "Inner suit, back", 12, "middle", "400"),
        t(450, 590, "Inner suit, front", 12, "middle", "400"),
        path("M428 248 L452 248 L452 266 L428 266 Z", w=THIN),
        lead(430, 120, 700, 70, 14),
        lead(440, 256, 700, 200, 28),
        lead(450, 410, 700, 390, 12),
        lead(155, 420, 40, 380, 34),
        lead(155, 400, 40, 320, 36),
        lead(160, 388, 40, 250, 28),
        lead(430, 50, 200, 40, 46),
        lead(430, 200, 200, 180, 22),
    ]
    return svg(900, 720, "FIG. 2 exploded two-piece assembly", "\n".join(parts), 2)

def fig3():
    parts = [
        t(450, 32, "Inner suit: thermal layer, harness, spine pack and dock", 16, "middle", "400"),
        inner_front(140, 80, 1.25, 1.25),
        pack_back(500, 80, 1.25, 1.25),
        t(250, 430, "Front", 13, "middle", "400"),
        t(610, 430, "Back", 13, "middle", "400"),
        # wiring along side
        path("M200 230 C210 250,210 280,200 310", w=THIN, dash="2 2"),
        lead(250, 200, 80, 80, 12),
        lead(250, 215, 80, 150, 28),
        lead(250, 250, 80, 230, 36),
        lead(200, 280, 80, 310, 40),
        lead(250, 330, 80, 400, 44),
        lead(620, 250, 820, 160, 34),
        lead(620, 200, 820, 80, 28),
        lead(620, 280, 820, 280, 38),
        lead(700, 230, 820, 360, 60),
        t(450, 470, "The spine pack (34) houses the battery (60) and controller. Wiring (40) follows the harness (36) to cuff interfaces (44) and the dock (28).", 12, "middle", "400"),
    ]
    return svg(900, 560, "FIG. 3 inner suit with pack, harness and dock", "\n".join(parts), 3)

def fig4():
    parts = [
        t(450, 32, "Outer display shell", 16, "middle", "400"),
        hoodie_front(200, 50, 1.3, 1.3),
        # panel seams suggested
        path("M280 200 L280 340", w=0.8, dash="3 3"),
        path("M430 200 L430 340", w=0.8, dash="3 3"),
        path("M250 250 L460 250", w=0.8, dash="3 3"),
        # shell-side dock
        path("M345 355 L385 355 L385 385 L345 385 Z", w=THIN),
        lead(350, 140, 80, 80, 14),
        lead(360, 220, 80, 180, 22),
        lead(360, 160, 80, 260, 24),
        lead(350, 100, 80, 40, 46),
        lead(360, 400, 80, 430, 48),
        lead(365, 370, 620, 400, 94),
        lead(300, 250, 620, 200, 70),
        lead(300, 200, 620, 120, 68),
        lead(250, 390, 620, 480, 88),
        t(680, 300, "The display layer (22) is mapped", 12, "start", "400"),
        t(680, 318, "across pattern pieces of the shell.", 12, "start", "400"),
        t(680, 336, "A clear coat (24) seals the surface.", 12, "start", "400"),
        t(680, 354, "The shell is not laundered.", 12, "start", "400"),
    ]
    return svg(900, 620, "FIG. 4 outer display shell", "\n".join(parts), 4)

def fig5():
    # enlarged dock cross-section
    parts = [t(450, 32, "Electromechanical dock, enlarged cross-section", 16, "middle", "400")]
    # two plates
    # outer shell plate on top
    parts.append(path("M200 160 L700 160 L700 230 L200 230 Z", w=THICK, fill="#f6f6f6"))
    parts.append(t(210, 150, "Shell-side dock (94)", 13, "start", "400"))
    parts.append(path("M200 320 L700 320 L700 390 L200 390 Z", w=THICK, fill="#f6f6f6"))
    parts.append(t(210, 415, "Inner-suit dock (28)", 13, "start", "400"))
    # gap
    parts.append(t(450, 285, "Separable interface", 12, "middle", "400"))
    # magnets (rect blocks facing)
    for x in (260, 600):
        parts.append(path(f"M{x} 190 L{x+40} 190 L{x+40} 230 L{x} 230 Z", w=MID, fill="#fff"))
        parts.append(path(f"M{x} 320 L{x+40} 320 L{x+40} 360 L{x} 360 Z", w=MID, fill="#fff"))
        parts.append(t(x+20, 218, "N", 11, "middle", "400"))
        parts.append(t(x+20, 348, "S", 11, "middle", "400"))
    # pogo pins
    for i, x in enumerate((360, 400, 440, 480, 520)):
        parts.append(path(f"M{x} 230 L{x} 250 L{x+8} 250 L{x+8} 230 Z", w=THIN, fill="#fff"))
        parts.append(circ(x+4, 258, 5, 1.1, fill="#fff"))  # spring bump
        parts.append(path(f"M{x} 320 L{x} 300 L{x+8} 300 L{x+8} 320 Z", w=THIN, fill="#fff"))
        parts.append(circ(x+4, 292, 4, 1.1, fill="#111"))  # pad
    # alignment pin / socket
    parts.append(path("M640 230 L650 230 L650 270 L640 270 Z", w=MID, fill="#fff"))
    parts.append(path("M636 320 L654 320 L654 285 L636 285 Z", w=MID, fill="#fff"))
    # gasket
    parts.append(path("M210 222 L690 222", w=3.2))
    parts.append(path("M210 328 L690 328", w=3.2))
    parts.append(lead(280, 200, 80, 80, 32))
    parts.append(lead(400, 255, 80, 180, 30))
    parts.append(lead(645, 250, 820, 120, 52))
    parts.append(lead(300, 222, 80, 280, 54))
    parts.append(lead(500, 300, 820, 280, 94))
    parts.append(lead(280, 350, 80, 430, 28))
    parts.append(t(450, 470, "Pogo pins (30) carry power and data. Magnets (32) retain the shell. An alignment feature (52) and a seal (54) close the interface.", 12, "middle", "400"))
    return svg(900, 540, "FIG. 5 dock cross-section with magnets and pogo pins", "\n".join(parts), 5)

def fig6():
    parts = [t(450, 32, "Layer cross-section through the torso (hoodie, jacket or pants)", 16, "middle", "400")]
    # stacked layers left to right, body on the left
    layers = [
        (80, "Body", None),
        (160, "Inner suit 12", 12),
        (230, "Thermal / cooling 38", 38),
        (300, "Wiring harness 40", 40),
        (370, "Dock 28", 28),
        (450, "Display 22", 22),
        (520, "Moisture barrier 50", 50),
        (590, "Clear coat 24", 24),
    ]
    y0, y1 = 90, 400
    # body
    parts.append(path(f"M40 {y0} C20 200,20 280,40 {y1} L90 {y1} L90 {y0} Z", w=MID, fill="#f3f3f3"))
    parts.append(t(65, 250, "body", 12, "middle", "400"))
    xs = [100, 170, 250, 330, 410, 500, 590, 680]
    labels = [
        (12, "Inner suit\n(knit, washable)"),
        (38, "Thermal /\ncooling channels"),
        (40, "Wiring\nharness"),
        (28, "Dock /\ninterface"),
        (22, "Flexible\ndisplay"),
        (50, "Moisture\nbarrier"),
        (24, "Clear\ncoat"),
    ]
    fills = ["#fff", "#fff", "#fff", "#eee", "#ddd", "#fff", "#fff"]
    for i, (num, lab) in enumerate(labels):
        x0, x1 = xs[i], xs[i+1]
        parts.append(path(f"M{x0} {y0} L{x1} {y0} L{x1} {y1} L{x0} {y1} Z", w=MID, fill=fills[i]))
        parts.append(t((x0+x1)/2, 250, str(num), 16, "middle"))
        for k, line_s in enumerate(lab.split("\n")):
            parts.append(t((x0+x1)/2, 430 + k*16, line_s, 11, "middle", "400"))
    # bracket for shell
    parts.append(path("M410 70 L410 58 L680 58 L680 70", w=THIN))
    parts.append(t(545, 52, "Outer shell 14  (never laundered)", 12, "middle", "400"))
    parts.append(path("M100 70 L100 58 L250 58 L250 70", w=THIN))
    parts.append(t(175, 52, "Inner suit 12  (washable)", 12, "middle", "400"))
    return svg(900, 520, "FIG. 6 layer cross-section", "\n".join(parts), 6)

def fig7():
    parts = [
        t(450, 32, "Embodiments across garment cuts", 16, "middle", "400"),
        hoodie_front(40, 80, 1.05, 1.05),
        jacket_front(340, 96, 1.05, 1.05),
        pants_front(640, 120, 1.0, 0.95),
        t(150, 430, "Hoodie 16", 14, "middle"),
        t(450, 430, "Jacket 18", 14, "middle"),
        t(740, 430, "Pants 20", 14, "middle"),
        lead(150, 200, 80, 80, 16),
        lead(450, 200, 450, 70, 18),
        lead(740, 200, 840, 80, 20),
        lead(450, 160, 280, 70, 90),  # zipper
        t(450, 470, "Each cut uses the same two-piece architecture: a washable inner suit (12) and a sealed display shell (14) joined at a dock (28).", 12, "middle", "400"),
    ]
    return svg(900, 540, "FIG. 7 hoodie, jacket and pants embodiments", "\n".join(parts), 7)

def fig8():
    # block diagram
    def box(x, y, w, h, label, num=None):
        s = path(f"M{x} {y} L{x+w} {y} L{x+w} {y+h} L{x} {y+h} Z", w=MID, fill="#fff")
        s += t(x+w/2, y+h/2+5, label, 13, "middle", "400")
        if num is not None:
            s += t(x+w-8, y+16, str(num), 11, "end")
        return s
    def arrow(x1,y1,x2,y2):
        return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="1.2" marker-end="url(#arr)"/>'
    parts = [
        '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111"/></marker></defs>',
        t(450, 32, "Electrical and control block diagram", 16, "middle", "400"),
        box(60, 80, 160, 56, "Battery", 60),
        box(60, 180, 160, 56, "Controller", 58),
        box(60, 280, 160, 56, "Sensors", 64),
        box(60, 380, 160, 56, "Transceiver", 62),
        box(360, 180, 160, 56, "Dock", 28),
        box(640, 80, 200, 56, "Display drivers", 66),
        box(640, 180, 200, 56, "Flexible display", 22),
        box(640, 280, 200, 56, "Shell contact pads", 94),
        # arrows
        arrow(220, 108, 360, 200),
        arrow(220, 208, 360, 208),
        arrow(220, 308, 360, 220),
        arrow(220, 408, 360, 230),
        arrow(520, 208, 640, 108),
        arrow(520, 208, 640, 208),
        arrow(520, 208, 640, 308),
        t(450, 470, "Power and data cross the separable dock (28) only. The inner suit carries the battery (60) and controller (58). The shell carries the display (22) and its drivers (66).", 12, "middle", "400"),
        t(140, 160, "Inner suit 12", 12, "middle", "400"),
        t(740, 60, "Outer shell 14", 12, "middle", "400"),
    ]
    return svg(900, 540, "FIG. 8 electrical block diagram", "\n".join(parts), 8)

def fig9():
    steps = [
        ("A", "Don the inner suit (12)"),
        ("B", "Don the outer shell (14) over the inner suit"),
        ("C", "Align the docks (28, 94) with feature (52)"),
        ("D", "Couple magnets (32); engage pogo pins (30)"),
        ("E", "Play mapped content (86) on the display (22)"),
        ("F", "Detach the shell (14) from the inner suit (12)"),
        ("G", "Launder the inner suit (12); wipe the shell (14)"),
    ]
    parts = [t(450, 32, "Method of using the two-piece garment", 16, "middle", "400")]
    y = 70
    for i, (let, lab) in enumerate(steps):
        parts.append(path(f"M180 {y} L720 {y} L720 {y+44} L180 {y+44} Z", w=MID, fill="#fff"))
        parts.append(circ(210, y+22, 14, 1.2, fill="#fff"))
        parts.append(t(210, y+27, let, 13, "middle"))
        parts.append(t(240, y+28, lab, 14, "start", "400"))
        if i < len(steps)-1:
            parts.append(f'<line x1="450" y1="{y+44}" x2="450" y2="{y+62}" stroke="{INK}" stroke-width="1.2" marker-end="url(#arr)"/>')
        y += 62
    parts.insert(0, '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111"/></marker></defs>')
    return svg(900, 560, "FIG. 9 method flowchart", "\n".join(parts), 9)

def fig10():
    def box(x,y,w,h,label,num=None):
        s = path(f"M{x} {y} L{x+w} {y} L{x+w} {y+h} L{x} {y+h} Z", w=MID, fill="#fff")
        s += t(x+w/2, y+h/2+5, label, 13, "middle", "400")
        if num is not None:
            s += t(x+w-8, y+16, str(num), 11, "end")
        return s
    def arrow(x1,y1,x2,y2):
        return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="1.2" marker-end="url(#arr)"/>'
    parts = [
        '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111"/></marker></defs>',
        t(450, 32, "Authoring, distribution and playback system", 16, "middle", "400"),
        box(40, 80, 180, 70, "Authoring studio", 72),
        box(40, 200, 180, 70, "Sandbox", 74),
        box(40, 320, 180, 70, "Safety checker", 76),
        box(320, 200, 200, 70, "Skin package", 80),
        box(320, 80, 200, 70, "Marketplace", 78),
        box(620, 140, 220, 90, "Garment system 10", 10),
        box(620, 280, 220, 70, "Pattern mapping", 86),
        arrow(220, 115, 320, 115),
        arrow(220, 235, 320, 235),
        arrow(130, 150, 130, 200),
        arrow(130, 270, 130, 320),
        arrow(130, 390, 320, 250),
        arrow(520, 235, 620, 185),
        arrow(520, 115, 620, 160),
        arrow(730, 230, 730, 280),
        t(450, 430, "Content is authored (72), executed in a sandbox (74), checked (76), packaged (80), optionally listed on a marketplace (78), and mapped (86) onto the display (22) of a garment system (10).", 12, "middle", "400"),
    ]
    return svg(900, 520, "FIG. 10 authoring and distribution system", "\n".join(parts), 10)

def main():
    figs = {
        "fig-1-assembled.svg": fig1(),
        "fig-2-exploded.svg": fig2_clean(),
        "fig-3-inner-suit.svg": fig3(),
        "fig-4-outer-shell.svg": fig4(),
        "fig-5-dock.svg": fig5(),
        "fig-6-section.svg": fig6(),
        "fig-7-embodiments.svg": fig7(),
        "fig-8-electrical.svg": fig8(),
        "fig-9-method.svg": fig9(),
        "fig-10-platform.svg": fig10(),
    }
    for name, s in figs.items():
        (OUT / name).write_text(s)
        print("wrote", name, "bytes", len(s))

if __name__ == "__main__":
    main()
