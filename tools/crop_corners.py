import sys, os
from PIL import Image, ImageDraw

img = Image.open(sys.argv[1]).convert("RGB")
W, H = img.size

crops = {
    "top":    (550, 250, 950, 450),
    "left":   (0, 550, 300, 780),
    "right":  (1150, 500, W, 780),
    "bottom": (550, 900, 950, H),
}

outdir = sys.argv[2]
os.makedirs(outdir, exist_ok=True)

STEP = 20
for name, box in crops.items():
    c = img.crop(box).convert("RGB")
    cw, ch = c.size
    big = c.resize((cw * 2, ch * 2), Image.NEAREST)
    d = ImageDraw.Draw(big)
    for x in range(0, cw, STEP):
        d.line([(x*2, 0), (x*2, ch*2)], fill=(0, 255, 255), width=1)
        d.text((x*2+2, 2), str(box[0]+x), fill=(0, 255, 255))
    for y in range(0, ch, STEP):
        d.line([(0, y*2), (cw*2, y*2)], fill=(0, 255, 255), width=1)
        d.text((2, y*2+2), str(box[1]+y), fill=(255, 0, 255))
    big.save(os.path.join(outdir, f"grid_{name}.png"))
    print(name, box, "->", big.size)
