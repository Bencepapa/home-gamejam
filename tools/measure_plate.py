"""Measure the floor-diamond aspect ratio of a generated plate image."""
import sys
from PIL import Image
import colorsys

def analyze(path):
    img = Image.open(path).convert("RGB")
    W, H = img.size
    px = img.load()

    step = 2
    mask = {}
    for y in range(0, H, step):
        for x in range(0, W, step):
            r, g, b = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            hue_deg = h * 360
            if 20 <= hue_deg <= 50 and s > 0.25 and v > 0.35:
                mask[(x, y)] = True

    if not mask:
        print("no floor-colored pixels found")
        return

    # connected-component labeling (8-connectivity, on the sampled grid) so
    # window/door wood trim (disconnected from the floor) doesn't pollute it
    visited = set()
    best_comp = []
    for seed in mask:
        if seed in visited:
            continue
        comp = []
        stack = [seed]
        visited.add(seed)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for dx in (-step, 0, step):
                for dy in (-step, 0, step):
                    if dx == 0 and dy == 0:
                        continue
                    n = (cx + dx, cy + dy)
                    if n in mask and n not in visited:
                        visited.add(n)
                        stack.append(n)
        if len(comp) > len(best_comp):
            best_comp = comp

    floor_pts = best_comp
    print(f"largest connected floor-colored region: {len(floor_pts)} sample points")

    xs = [p[0] for p in floor_pts]
    ys = [p[1] for p in floor_pts]
    left = min(floor_pts, key=lambda p: p[0])
    right = max(floor_pts, key=lambda p: p[0])
    top = min(floor_pts, key=lambda p: p[1])
    bottom = max(floor_pts, key=lambda p: p[1])

    width = right[0] - left[0]
    height = bottom[1] - top[1]

    print(f"image size: {W}x{H}")
    print(f"floor-colored bbox: x[{min(xs)}..{max(xs)}] y[{min(ys)}..{max(ys)}]")
    print(f"left corner ~{left}  right corner ~{right}")
    print(f"top corner  ~{top}   bottom corner ~{bottom}")
    print(f"diamond width (left->right): {width}px")
    print(f"diamond height (top->bottom): {height}px")
    if height:
        ratio = width / height
        print(f"width/height ratio: {ratio:.3f}  (target for 2:1 iso = 2.000)")
        target_h = width / 2
        print(f"to hit 2:1 with this width, height should be ~{target_h:.0f}px")
        print(f"=> vertical compress factor needed: {target_h/height:.3f}x")

if __name__ == "__main__":
    analyze(sys.argv[1])
