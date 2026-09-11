import sys
from PIL import Image

PLATE = "assets/room/halo.png"
CRIB = "assets/sprites/bolcso.png"
OUT = sys.argv[1] if len(sys.argv) > 1 else "composite_test.png"

# measured by hand from the labeled corner crops (see conversation)
ORIGIN = (720, 395)   # back apex, grid (0,0)
N = 7
DIAMOND_W = 1205      # left(95,650) -> right(1300,655)
DIAMOND_H = 605       # top(720,395) -> bottom(724,1000)
TW = DIAMOND_W / N
TH = DIAMOND_H / N

def grid_to_px(gx, gy):
    sx = ORIGIN[0] + (gx - gy) * TW / 2
    sy = ORIGIN[1] + (gx + gy) * TH / 2
    return sx, sy

def chroma_key(img, tol=18):
    img = img.convert("RGBA")
    px = img.load()
    W, H = img.size
    bg = px[2, 2][:3]
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if abs(r - bg[0]) <= tol and abs(g - bg[1]) <= tol and abs(b - bg[2]) <= tol:
                px[x, y] = (r, g, b, 0)
    return img

def autocrop(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img

plate = Image.open(PLATE).convert("RGBA")
crib = Image.open(CRIB)
crib = chroma_key(crib)
crib = autocrop(crib)

# place crib footprint at grid cell (3,3), long axis roughly along +x,
# scale so its on-screen width ~= 2.2 tiles (crib is a bit longer than 1 tile)
target_w = TW * 2.2
scale = target_w / crib.width
crib_scaled = crib.resize((int(crib.width * scale), int(crib.height * scale)), Image.LANCZOS)

anchor_x, anchor_y = grid_to_px(3, 3)
paste_x = int(anchor_x - crib_scaled.width / 2)
paste_y = int(anchor_y - crib_scaled.height * 0.92)  # base of crib near its bottom

composite = plate.copy()
composite.alpha_composite(crib_scaled, (paste_x, paste_y))

# draw the grid used for placement, for reference
from PIL import ImageDraw
d = ImageDraw.Draw(composite)
for gx in range(N + 1):
    a = grid_to_px(gx, 0)
    b = grid_to_px(gx, N)
    d.line([a, b], fill=(0, 255, 255, 120), width=1)
for gy in range(N + 1):
    a = grid_to_px(0, gy)
    b = grid_to_px(N, gy)
    d.line([a, b], fill=(0, 255, 255, 120), width=1)

composite.save(OUT)
print("saved", OUT, composite.size, "crib scaled to", crib_scaled.size, "anchor", (anchor_x, anchor_y))
