"""
Iso grid reference generator for AI image-gen prompting.
2:1 dimetric grid matching game.js: TW=64, TH=32.

Produces:
  - iso_grid_reference.png   transparent, just the grid + axis labels
  - iso_grid_reference_solid.png   same grid on a flat gray bg (some
    image tools handle solid backgrounds better than alpha)
  - iso_grid_cube.png        grid + one 1x1x1 reference cube, to pin
    down wall/furniture height (ZH) as well as floor spacing
"""

from PIL import Image, ImageDraw, ImageFont
import math

TW, TH = 64, 32   # tile width / height (px)
ZH = 24            # one z-level height, per DESIGN.md
GRID_N = 7         # 7x7 walkable floor, per DESIGN.md bedroom sample

MARGIN = 80

def iso(x, y, z=0):
    sx = (x - y) * TW / 2
    sy = (x + y) * TH / 2 - z * ZH
    return sx, sy

def bounds(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)

def build(filename, draw_cube=False, solid_bg=False):
    # collect all floor-grid corner points first to size the canvas
    corners = [iso(x, y) for x in range(GRID_N + 1) for y in range(GRID_N + 1)]
    minx, miny, maxx, maxy = bounds(corners)

    # extra headroom for a cube standing on the grid (height reference)
    top_pad = ZH * 3 if draw_cube else 20

    W = int(maxx - minx) + MARGIN * 2
    H = int(maxy - miny) + MARGIN * 2 + top_pad

    mode = "RGB" if solid_bg else "RGBA"
    bg = (235, 235, 235, 255) if solid_bg else (0, 0, 0, 0)
    img = Image.new(mode, (W, H), bg)
    d = ImageDraw.Draw(img)

    ox = MARGIN - minx
    oy = MARGIN - miny + top_pad

    def px(pt):
        return (pt[0] + ox, pt[1] + oy)

    line_col = (255, 60, 180, 255) if not solid_bg else (255, 60, 180, 255)
    axis_col_x = (60, 140, 255, 255)
    axis_col_y = (60, 220, 120, 255)

    # grid lines along each axis direction
    for x in range(GRID_N + 1):
        a = px(iso(x, 0))
        b = px(iso(x, GRID_N))
        d.line([a, b], fill=line_col, width=2)
    for y in range(GRID_N + 1):
        a = px(iso(0, y))
        b = px(iso(GRID_N, y))
        d.line([a, b], fill=line_col, width=2)

    # highlighted +x and +y axes from origin, with arrowheads
    def arrow(p0, p1, col):
        d.line([px(p0), px(p1)], fill=col, width=4)
        ax, ay = px(p1)
        bx, by = px(p0)
        ang = math.atan2(ay - by, ax - bx)
        for s in (0.5, -0.5):
            wx = ax - 14 * math.cos(ang - s * 0.5)
            wy = ay - 14 * math.sin(ang - s * 0.5)
            d.line([(ax, ay), (wx, wy)], fill=col, width=4)

    arrow((0, 0), (3, 0), axis_col_x)
    arrow((0, 0), (0, 3), axis_col_y)

    try:
        font = ImageFont.truetype("arial.ttf", 20)
        font_s = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
        font_s = font

    ox_pt = px(iso(3.3, 0))
    oy_pt = px(iso(0, 3.3))
    d.text(ox_pt, "+x", fill=axis_col_x, font=font)
    d.text(oy_pt, "+y", fill=axis_col_y, font=font)

    origin = px(iso(0, 0))
    d.ellipse([origin[0]-4, origin[1]-4, origin[0]+4, origin[1]+4], fill=(20,20,20,255))
    d.text((origin[0]-30, origin[1]+8), "origin (0,0)", fill=(20,20,20,255), font=font_s)

    corner = px(iso(GRID_N, GRID_N))
    d.text((corner[0]-40, corner[1]+8), f"({GRID_N},{GRID_N})", fill=(20,20,20,255), font=font_s)

    label = f"tile {TW}x{TH}px  |  2:1 dimetric  |  {GRID_N}x{GRID_N} floor"
    d.text((MARGIN, 10), label, fill=(20,20,20,255), font=font_s)

    if draw_cube:
        # a 1x1x1 reference box sitting at grid cell (2,2), to calibrate
        # vertical (ZH) scale for furniture/wall height alongside floor tiles
        cx, cy = 2, 2
        top = [iso(cx, cy, 1), iso(cx+1, cy, 1), iso(cx+1, cy+1, 1), iso(cx, cy+1, 1)]
        left = [iso(cx, cy+1, 0), iso(cx, cy+1, 1), iso(cx+1, cy+1, 1), iso(cx+1, cy+1, 0)]
        right = [iso(cx+1, cy, 0), iso(cx+1, cy, 1), iso(cx+1, cy+1, 1), iso(cx+1, cy+1, 0)]

        d.polygon([px(p) for p in right], fill=(120, 170, 255, 180), outline=(20,20,20,255))
        d.polygon([px(p) for p in left], fill=(90, 140, 230, 180), outline=(20,20,20,255))
        d.polygon([px(p) for p in top], fill=(170, 200, 255, 200), outline=(20,20,20,255))

        cap = px(iso(cx+0.5, cy+0.5, 1))
        d.text((cap[0]-60, cap[1]-30), f"1x1x1 cube, ZH={ZH}px", fill=(20,20,20,255), font=font_s)

    img.save(filename)
    print("wrote", filename, img.size)


build("assets/art/reference/iso_grid_reference.png", draw_cube=False, solid_bg=False)
build("assets/art/reference/iso_grid_reference_solid.png", draw_cube=False, solid_bg=True)
build("assets/art/reference/iso_grid_cube.png", draw_cube=True, solid_bg=True)
