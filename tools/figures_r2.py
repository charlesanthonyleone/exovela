"""Exovela r2 figures. One geometry, two themes: 'site' (light lines on dark) and 'patent' (black on white, numerals + lead lines).
Usage: python3 tools/figures_r2.py  -> assets/figures/r2-*.svg and poc/figures/FIG-*.svg"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TH = {
 'site': dict(bg='none', ln='#c9ced6', dim='#6f7682', acc='#8fd8ff', txt='#a6acb7', font='Inter, sans-serif', fill='#0f1217', fill2='#161a21', num='#eef0f3', lw=1.4),
 'patent': dict(bg='#ffffff', ln='#000000', dim='#000000', acc='#000000', txt='#000000', font='Times New Roman, serif', fill='#ffffff', fill2='#ffffff', num='#000000', lw=1.6),
}
def svg(w, h, body, t, title, x0=-110, y0=0, x1=None, y1=None):
    x1 = w + 130 if x1 is None else x1; y1 = h if y1 is None else y1
    bg = '' if t['bg'] == 'none' else f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="{t["bg"]}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}" role="img" aria-label="{title}" font-family="{t["font"]}">{bg}{body}</svg>'
def lead(t, x, y, lx, ly, n, label=None, site=True):
    s = f'<path d="M{x} {y}L{lx} {ly}" stroke="{t["dim"]}" stroke-width="0.9" fill="none"/>'
    s += f'<circle cx="{x}" cy="{y}" r="2" fill="{t["dim"]}"/>'
    anchor = 'start' if lx >= x else 'end'
    dx = 6 if lx >= x else -6
    txt = f'{n}' + (f'  {label}' if (label and site) else '')
    s += f'<text x="{lx+dx}" y="{ly+4}" font-size="13" fill="{t["num"]}" text-anchor="{anchor}">{txt}</text>'
    return s

# ---------- hoodie outline (front), origin top-left of a 300x320 box ----------
def hoodie(t, ox, oy, sc=1.0, dashed=False, lit=False, pocket=True):
    d = 'M150 18 C112 18 92 46 90 78 L58 96 C40 104 34 120 32 140 L22 268 L58 272 L66 168 L72 300 L228 300 L234 168 L242 272 L278 268 L268 140 C266 120 260 104 242 96 L210 78 C208 46 188 18 150 18 Z'
    face = 'M118 78 C120 52 132 40 150 40 C168 40 180 52 182 78 C172 98 162 106 150 106 C138 106 128 98 118 78 Z'
    st = f'stroke="{t["ln"]}" stroke-width="{t["lw"]/sc:.2f}" fill="{t["fill2"] if lit else t["fill"]}"' + (' stroke-dasharray="6 5"' if dashed else '')
    g = f'<g transform="translate({ox} {oy}) scale({sc})"><path d="{d}" {st}/>'
    g += f'<path d="{face}" stroke="{t["ln"]}" stroke-width="{t["lw"]/sc:.2f}" fill="{t["bg"] if t["bg"]!="none" else "#07080a"}"/>'
    if not dashed:
        g += f'<path d="M72 286H228M22 256l36 4M242 260l36-4" stroke="{t["ln"]}" stroke-width="{t["lw"]/sc:.2f}" fill="none"/>'
        g += ''.join(f'<path d="M{x} 287V299" stroke="{t["dim"]}" stroke-width="0.8"/>' for x in range(80, 225, 8))
        g += f'<path d="M136 104V170M164 104V170" stroke="{t["ln"]}" stroke-width="{t["lw"]/sc:.2f}"/><rect x="132" y="168" width="8" height="12" rx="2" fill="none" stroke="{t["ln"]}"/><rect x="160" y="168" width="8" height="12" rx="2" fill="none" stroke="{t["ln"]}"/>'
        g += f'<path d="M84 140 L84 250 M216 140 L216 250 M84 196H216" stroke="{t["dim"]}" stroke-width="0.8" stroke-dasharray="2 4" fill="none"/>'
        if pocket: g += f'<path d="M104 222 L196 222 L210 276 L90 276 Z" stroke="{t["ln"]}" stroke-width="{t["lw"]/sc:.2f}" fill="none"/>'
    return g + '</g>'

def inner_suit(t, ox, oy, back=False):
    d = 'M150 30 C134 30 126 34 120 40 L74 60 C58 68 52 82 50 100 L40 262 L66 266 L76 150 L84 296 L216 296 L224 150 L234 266 L260 262 L250 100 C248 82 242 68 226 60 L180 40 C174 34 166 30 150 30 Z'
    g = f'<g transform="translate({ox} {oy})"><path d="{d}" stroke="{t["ln"]}" stroke-width="{t["lw"]}" fill="{t["fill"]}"/>'
    g += f'<path d="M126 40 C134 50 166 50 174 40" stroke="{t["ln"]}" stroke-width="{t["lw"]}" fill="none"/>'
    g += f'<path d="M92 120 L92 280 M208 120 L208 280" stroke="{t["dim"]}" stroke-width="0.9" stroke-dasharray="3 3"/>'
    if back:
        g += f'<rect x="131" y="66" width="38" height="20" rx="4" stroke="{t["ln"]}" stroke-width="{t["lw"]}" fill="{t["fill2"]}"/>'
        g += ''.join(f'<circle cx="{138+i*8}" cy="{72+j*8}" r="1.6" fill="{t["acc"]}"/>' for i in range(4) for j in range(2))
        g += f'<path d="M150 86V104" stroke="{t["ln"]}" stroke-width="2"/>'
        g += f'<rect x="126" y="104" width="48" height="98" rx="10" stroke="{t["ln"]}" stroke-width="{t["lw"]}" fill="{t["fill2"]}"/>'
    return g + '</g>'

def fig_exploded(t, site):
    W, H = 900, 760
    b = f'<text x="450" y="34" text-anchor="middle" font-size="15" fill="{t["txt"]}">{"Exploded view: display shell lifted off the inner suit" if site else ""}</text>'
    b += hoodie(t, 300, 50, lit=True)
    b += f'<path d="M450 370 V410" stroke="{t["dim"]}" stroke-width="1" stroke-dasharray="4 4"/><path d="M444 402 L450 412 L456 402" fill="none" stroke="{t["dim"]}"/>'
    b += inner_suit(t, 160, 420)          # front
    b += inner_suit(t, 440, 420, back=True)  # back
    if site:
        b += f'<text x="310" y="740" text-anchor="middle" font-size="13" fill="{t["txt"]}">Inner suit, front</text><text x="590" y="740" text-anchor="middle" font-size="13" fill="{t["txt"]}">Inner suit, back</text>'
    L = [ (450,90,640,70,'46','Hood'), (436,190,640,150,'88','Drawcords'), (520,250,690,230,'22','Display surface'), (455,280,700,300,'68','Display tiles'),
          (352,322,210,320,'48','Rib hem'), (338,300,200,280,'44','Cuff'), (420,300,200,240,'92','Pocket'), (540,170,700,110,'14','Display shell'),
          (590,496,790,470,'28','Inner-suit dock'), (590,570,790,560,'34','Spine pack'), (590,515,790,515,'36','Harness'), (230,560,110,560,'12','Inner suit'),
          (252,620,110,640,'38','Spacer-mesh channels') ]
    for x,y,lx,ly,n,lab in L: b += lead(t,x,y,lx,ly,n,lab,site)
    if not site: b += f'<text x="450" y="748" text-anchor="middle" font-size="18" font-weight="bold">FIG. 1</text>'
    return svg(W, H, b, t, 'Exploded view of the Exovela display shell and inner suit')

def fig_section(t, site):
    W, H = 900, 560
    layers = [  # name, numeral, thickness px, fill style key, side
      ('Body', '', 30, 'skin', 'body'),
      ('Inner suit knit (washable)', '12', 26, 'knit', 'suit'),
      ('Spacer mesh / air channels', '38', 46, 'mesh', 'suit'),
      ('Harness and wiring', '40', 14, 'wire', 'suit'),
      ('Structural backing textile', '82', 18, 'knit', 'shell'),
      ('Encapsulation, rear (moisture barrier)', '50', 12, 'solid', 'shell'),
      ('Interconnect (flex circuit)', '84', 10, 'wire', 'shell'),
      ('Flexible display tiles', '22 / 68', 22, 'disp', 'shell'),
      ('Optical bond / diffuser', '26', 10, 'solid', 'shell'),
      ('Clear hard-coated cover film', '24', 12, 'clear', 'shell'),
    ]
    x0, x1, y = 120, 600, 500
    b = ''
    if site: b += f'<text x="40" y="34" font-size="15" fill="{t["txt"]}">Layer section through the torso, body at the bottom</text>'
    ys = []
    for name, n, th, kind, side in layers:
        y2 = y - th
        fill = t['fill'] if kind in ('skin','clear','solid') else t['fill2']
        stroke = t['ln'] if kind != 'skin' else t['dim']
        dash = ' stroke-dasharray="4 4"' if kind == 'skin' else ''
        b += f'<rect x="{x0}" y="{y2}" width="{x1-x0}" height="{th}" fill="{fill}" stroke="{stroke}" stroke-width="1"{dash}/>'
        if kind == 'mesh':
            b += ''.join(f'<path d="M{xx} {y2+4} L{xx+12} {y-4} L{xx+24} {y2+4}" fill="none" stroke="{t["dim"]}" stroke-width="0.8"/>' for xx in range(x0+6, x1-24, 24))
        if kind == 'knit':
            b += ''.join(f'<path d="M{xx} {y2+th/2} q6 -5 12 0 t12 0" fill="none" stroke="{t["dim"]}" stroke-width="0.7"/>' for xx in range(x0+4, x1-24, 24))
        if kind == 'disp':
            b += ''.join(f'<rect x="{xx}" y="{y2+3}" width="54" height="{th-6}" fill="{t["acc"] if site else "#000"}" opacity="{0.35 if site else 1}"/>' for xx in range(x0+6, x1-54, 60))
        if kind == 'wire':
            b += ''.join(f'<rect x="{xx}" y="{y2+th/2-1.5}" width="20" height="3" fill="{t["ln"]}"/>' for xx in range(x0+10, x1-20, 40))
        ys.append((y2 + th / 2, name, n))
        y = y2
    # boundary between suit and shell
    yb = 500 - 30 - 26 - 46 - 14
    b += f'<path d="M{x0-30} {yb} H{x1+20}" stroke="{t["ln"]}" stroke-width="1.6" stroke-dasharray="10 5"/>'
    b += f'<text x="{x0-36}" y="{yb+16}" font-size="12" fill="{t["txt"]}" text-anchor="end">Inner suit 12</text><text x="{x0-36}" y="{yb-8}" font-size="12" fill="{t["txt"]}" text-anchor="end">Shell 14</text>'
    prev = 1e9
    adj = []
    for (yy,name,n) in ys:
        ly = min(yy, prev - 19); adj.append((yy, ly, name, n)); prev = ly
    for i,(yy,ly,name,n) in enumerate(adj):
        if not n: 
            if site: b += f'<text x="{x1+30}" y="{yy+4}" font-size="13" fill="{t["dim"]}">Body</text>'
            continue
        b += lead(t, x1-10, yy, x1+30, ly, n, name, site)
    b += f'<text x="{x0}" y="{yb+40-6}" font-size="0"></text>'
    if not site: b += f'<text x="450" y="545" text-anchor="middle" font-size="18" font-weight="bold">FIG. 3</text>'
    else: b += f'<text x="40" y="540" font-size="12.5" fill="{t["dim"]}">Not to scale. The shell is sealed at its edges, so layers 22–84 are fully enclosed between 24 and 50.</text>'
    if site: b = b.replace('y="34" font-size="15"', 'y="250" font-size="15"')
    return svg(W, H, b, t, 'Layer cross-section of the Exovela shell and inner suit', y0=220)

def fig_dock(t, site):
    W, H = 900, 520
    b = ''
    if site: b += f'<text x="40" y="34" font-size="15" fill="{t["txt"]}">Dock, section through the pin row (mated, shown separated by 6 mm)</text>'
    # shell side (top)
    b += f'<rect x="200" y="90" width="500" height="18" fill="{t["fill2"]}" stroke="{t["ln"]}"/>'  # laminate
    b += f'<rect x="300" y="108" width="300" height="46" rx="6" fill="{t["fill"]}" stroke="{t["ln"]}" stroke-width="{t["lw"]}"/>'  # potted pad block
    for i in range(4):
        x = 360 + i*50; b += f'<rect x="{x-11}" y="148" width="22" height="6" fill="{t["acc"] if site else "#000"}"/>'
    b += f'<rect x="318" y="118" width="22" height="16" fill="none" stroke="{t["ln"]}"/><rect x="560" y="118" width="22" height="16" fill="none" stroke="{t["ln"]}"/>'  # magnets
    b += f'<path d="M600 130 h-10 v24 h10" fill="none" stroke="{t["ln"]}"/>'  # socket hint
    b += f'<rect x="586" y="128" width="12" height="26" fill="{t["bg"] if t["bg"]!="none" else "#07080a"}" stroke="{t["ln"]}"/>'
    # suit side (bottom)
    b += f'<rect x="290" y="176" width="320" height="64" rx="8" fill="{t["fill"]}" stroke="{t["ln"]}" stroke-width="{t["lw"]}"/>'
    b += f'<rect x="200" y="240" width="500" height="16" fill="{t["fill2"]}" stroke="{t["ln"]}"/>'  # knit
    for i in range(4):
        x = 360 + i*50
        b += f'<rect x="{x-7}" y="172" width="14" height="26" rx="3" fill="{t["fill2"]}" stroke="{t["ln"]}"/><path d="M{x} 198 v30" stroke="{t["ln"]}" stroke-dasharray="2 2"/>'
    b += f'<rect x="318" y="186" width="22" height="16" fill="none" stroke="{t["ln"]}"/><rect x="560" y="186" width="22" height="16" fill="none" stroke="{t["ln"]}"/>'
    b += f'<rect x="587" y="160" width="10" height="30" rx="4" fill="{t["fill2"]}" stroke="{t["ln"]}"/>'  # alignment pin
    b += f'<path d="M300 176 h300" stroke="{t["ln"]}" stroke-width="3" stroke-dasharray="1 0" opacity=".6"/>'
    b += f'<path d="M296 180 C296 172 300 170 306 170 H594 C600 170 604 172 604 180" fill="none" stroke="{t["ln"]}" stroke-width="2.5"/>'  # gasket
    b += f'<path d="M450 256 V300 H200 V330" fill="none" stroke="{t["ln"]}" stroke-width="2"/>'  # cable to spine pack
    b += f'<rect x="140" y="330" width="120" height="80" rx="12" fill="{t["fill2"]}" stroke="{t["ln"]}" stroke-width="{t["lw"]}"/>'
    L = [(250,99,120,80,'14','Display shell laminate'),(450,130,760,90,'94','Shell-side dock, flush potted pads'),(410,151,760,130,'30a','Contact pads'),
         (329,126,120,130,'32','Magnets (shell side)'),(592,140,760,170,'52','Alignment socket / pin'),(300,178,120,180,'54','Compressible gasket'),
         (460,186,760,210,'30','Spring-loaded pins'),(450,236,760,250,'28','Inner-suit dock'),(250,248,120,250,'12','Inner suit'),(200,370,120,440,'34','Spine pack'),(330,300,120,300,'36','Harness')]
    for x,y,lx,ly,n,lab in L: b += lead(t,x,y,lx,ly,n,lab,site)
    if site: b += f'<text x="40" y="500" font-size="12.5" fill="{t["dim"]}">Pins are energised only after the controller confirms a keyed, seated connection. Concept geometry, not to scale.</text>'
    else: b += f'<text x="450" y="505" text-anchor="middle" font-size="18" font-weight="bold">FIG. 4</text>'
    return svg(W, H, b, t, 'Cross-section of the Exovela dock', x0=-120, x1=1130)

def box(t, x, y, w, h, title, n, site, sub=''):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{t["fill2"]}" stroke="{t["ln"]}" stroke-width="1.2"/>'
    s += f'<text x="{x+w/2}" y="{y+h/2+(0 if sub else 4)}" text-anchor="middle" font-size="13" fill="{t["num"]}">{title} {n}</text>'
    if sub: s += f'<text x="{x+w/2}" y="{y+h/2+18}" text-anchor="middle" font-size="11" fill="{t["dim"]}">{sub}</text>'
    return s
def arrow(t, x1, y1, x2, y2, lab=''):
    s = f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{t["ln"]}" stroke-width="1.2" marker-end="url(#ah)"/>'
    if lab: s += f'<text x="{(x1+x2)/2+6}" y="{(y1+y2)/2-6}" font-size="11" fill="{t["dim"]}">{lab}</text>'
    return s
def fig_system(t, site):
    W, H = 900, 600
    b = f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["ln"]}"/></marker></defs>'
    if site: b += f'<text x="40" y="34" font-size="15" fill="{t["txt"]}">System: garment electronics and content platform</text>'
    b += f'<rect x="30" y="60" width="380" height="300" rx="12" fill="none" stroke="{t["dim"]}" stroke-dasharray="6 5"/><text x="44" y="82" font-size="12" fill="{t["dim"]}">Inner suit 12 (spine pack 34)</text>'
    b += f'<rect x="490" y="60" width="380" height="300" rx="12" fill="none" stroke="{t["dim"]}" stroke-dasharray="6 5"/><text x="504" y="82" font-size="12" fill="{t["dim"]}">Display shell 14</text>'
    b += box(t,60,100,150,50,'Battery','60',site,'Li-ion, BMS, < 100 Wh')
    b += box(t,230,100,150,50,'Controller','58',site,'MCU + frame buffer')
    b += box(t,60,180,150,50,'Sensors','64',site,'temp, humidity, motion')
    b += box(t,230,180,150,50,'Radio','62',site,'BLE / Wi-Fi')
    b += box(t,140,270,180,60,'Inner-suit dock','28',site,'pins, magnets, gasket')
    b += box(t,560,270,180,60,'Shell-side dock','94',site,'flush sealed pads')
    b += box(t,520,180,150,50,'Identity chip','98',site,'cut, size, tile map')
    b += box(t,690,180,150,50,'Display drivers','66',site,'per-tile')
    b += box(t,600,100,220,50,'Display tiles','22 / 68',site,'flexible OLED or LED film')
    b += arrow(t,135,150,135,180) + arrow(t,210,125,230,125) + arrow(t,210,205,230,205) + arrow(t,305,150,250,270)
    b += arrow(t,320,300,560,300) + f'<text x="440" y="322" text-anchor="middle" font-size="11" fill="{t["dim"]}">power + data</text><text x="440" y="337" text-anchor="middle" font-size="11" fill="{t["dim"]}">only electrical path</text>'
    b += arrow(t,650,270,600,230) + arrow(t,690,270,765,230) + arrow(t,765,180,740,150)
    # platform
    b += f'<rect x="30" y="400" width="840" height="170" rx="12" fill="none" stroke="{t["dim"]}" stroke-dasharray="6 5"/><text x="44" y="422" font-size="12" fill="{t["dim"]}">Content platform (phone app and cloud)</text>'
    xs = [50,215,380,545,710]
    names = [('Studio','72','HTML/CSS, AI'),('Sandbox','74','no network'),('Checker','76','flash, power, fit'),('Mapping','86','cut canvas'),('Package','80','to controller')]
    for x,(nm,n,sub) in zip(xs,names): b += box(t,x,440,145,50,nm,n,site,sub)
    for i in range(4): b += arrow(t,xs[i]+145,465,xs[i+1],465)
    b += box(t,380,510,145,44,'Marketplace','78',site,'licenses, remix')
    b += arrow(t,452,510,452,490) 
    b += f'<path d="M782 440 V384 H395 V205 H384" fill="none" stroke="{t["ln"]}" stroke-width="1.2" marker-end="url(#ah)"/><text x="600" y="378" font-size="11" fill="{t["dim"]}">wireless transfer to the garment</text>'
    if not site: b += f'<text x="450" y="592" text-anchor="middle" font-size="18" font-weight="bold">FIG. 5</text>'
    return svg(W, H, b, t, 'System block diagram', x0=0, x1=900)

def fig_method(t, site):
    W, H = 900, 520
    b = f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["ln"]}"/></marker></defs>'
    steps = [('S1','Don inner suit 12, spine pack 34 fitted'),('S2','Don display shell 14 over it'),('S3','Align at 52, magnets 32 pull docks 28/94 together'),
             ('S4','Controller 58 verifies keyed seat and shell ID, then energises pins 30'),('S5','Play content mapped 86 to this shell'),
             ('S6','Separate shell at dock and perimeter attachment'),('S7','Remove spine pack; launder inner suit'),('S8','Wipe shell; hang on charger')]
    for i,(k,txt) in enumerate(steps):
        col, row = i // 4, i % 4
        x = 60 + col * 420; y = 50 + row * 110
        b += f'<rect x="{x}" y="{y}" width="360" height="64" rx="8" fill="{t["fill2"]}" stroke="{t["ln"]}" stroke-width="1.2"/>'
        b += f'<text x="{x+16}" y="{y+38}" font-size="13" fill="{t["num"]}">{k}  {txt}</text>'
        if row < 3: b += f'<path d="M{x+180} {y+64} V{y+106}" stroke="{t["ln"]}" stroke-width="1.2" marker-end="url(#ah)"/>'
    b += f'<path d="M420 412 H450 V82 H476" fill="none" stroke="{t["ln"]}" stroke-width="1.2" marker-end="url(#ah)"/>'
    if not site: b += f'<text x="450" y="505" text-anchor="middle" font-size="18" font-weight="bold">FIG. 2</text>'
    return svg(W, H, b, t, 'Method of use', x0=0, x1=900)

def write(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'w').write(s)
figs = [('exploded', fig_exploded, 1), ('method', fig_method, 2), ('section', fig_section, 3), ('dock', fig_dock, 4), ('system', fig_system, 5)]
for name, fn, n in figs:
    write(f'{ROOT}/assets/figures/r2-{name}.svg', fn(TH['site'], True))
    write(f'{ROOT}/poc/figures/FIG-{n}-{name}.svg', fn(TH['patent'], False))
print('figures written')
