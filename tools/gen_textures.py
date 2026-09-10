"""Procedural, tileable texture generator for the CSE4204 Three.js project.
Generates diffuse maps + matching normal maps, fully offline (numpy + Pillow).
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = "/data/build/project/assets/textures"
os.makedirs(OUT, exist_ok=True)
S = 512
rng = np.random.default_rng(4204)


# ----------------------------------------------------------------- noise utils
def _lerp(a, b, t):
    return a + (b - a) * t


def smooth_noise(res, size=S, seed=None):
    """Tileable value noise at `res` x `res` control points, bilinear+smoothstep."""
    r = rng if seed is None else np.random.default_rng(seed)
    grid = r.random((res, res))
    xs = np.linspace(0, res, size, endpoint=False)
    x0 = np.floor(xs).astype(int) % res
    x1 = (x0 + 1) % res
    tx = xs - np.floor(xs)
    tx = tx * tx * (3 - 2 * tx)
    g = grid[np.ix_(x0, x0)]
    gx = grid[np.ix_(x0, x1)]
    gy = grid[np.ix_(x1, x0)]
    gxy = grid[np.ix_(x1, x1)]
    TX = tx[None, :]
    TY = tx[:, None]
    top = _lerp(g, gx, TX)
    bot = _lerp(gy, gxy, TX)
    return _lerp(top, bot, TY)


def fbm(octaves=5, res0=4, size=S, seed=0, gain=0.5):
    total = np.zeros((size, size))
    amp = 1.0
    norm = 0.0
    res = res0
    for i in range(octaves):
        total += amp * smooth_noise(res, size, seed=seed * 131 + i * 17 + 3)
        norm += amp
        amp *= gain
        res *= 2
    return total / norm


def normalize01(a):
    lo, hi = float(a.min()), float(a.max())
    return (a - lo) / (hi - lo + 1e-9)


def save_rgb(arr, name):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    img.save(os.path.join(OUT, name), optimize=True)
    return img


def save_normal_from_height(height, name, strength=2.2):
    """Tileable tangent-space normal map from a height field in [0,1]."""
    h = height.astype(np.float64)
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    nx, ny, nz = -dx, -dy, np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    out = np.stack([nx / ln, ny / ln, nz / ln], axis=-1)
    out = (out * 0.5 + 0.5) * 255.0
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB").save(
        os.path.join(OUT, name), optimize=True
    )


def tint(base_rgb, mono, lo=0.72, hi=1.14):
    """Colourise a mono [0,1] field with an RGB base colour."""
    shade = (lo + (hi - lo) * mono)[..., None]
    return np.array(base_rgb, dtype=np.float64)[None, None, :] * shade


# ------------------------------------------------------------------ 1. bricks
def bricks(name, base, mortar, rows=8, cols=4, jitter=0.10, mortar_px=6):
    """Tileable running-bond brick wall. Returns (rgb, height)."""
    bh = S // rows
    bw = S // cols
    height = np.zeros((S, S))
    idx = np.zeros((S, S), dtype=np.int32)
    yy = np.arange(S)[:, None].repeat(S, 1)
    xx = np.arange(S)[None, :].repeat(S, 0)
    row = yy // bh
    offset = np.where(row % 2 == 0, 0, bw // 2)
    bx = ((xx + offset) // bw) % cols
    idx = row * 97 + bx
    ly = yy % bh
    lx = (xx + offset) % bw
    m = mortar_px
    inside = (ly > m) & (ly < bh - m) & (lx > m) & (lx < bw - m)
    # rounded bevel towards mortar lines
    d = np.minimum(np.minimum(ly - m, bh - m - ly), np.minimum(lx - m, bw - m - lx))
    bevel = np.clip(d / 7.0, 0, 1)
    height = np.where(inside, 0.45 + 0.55 * bevel, 0.06)
    grain = fbm(5, 8, seed=11) * 0.10
    height = np.clip(height + grain - 0.05, 0, 1)

    r = np.random.default_rng(77)
    per = r.normal(0.0, jitter, size=(idx.max() + 2,))
    var = per[idx]
    mono = np.clip(0.55 + var + fbm(6, 6, seed=5) * 0.45, 0, 1)
    rgb = tint(base, mono, 0.70, 1.20)
    mortar_rgb = np.array(mortar, dtype=np.float64)[None, None, :] * (
        0.85 + 0.3 * fbm(5, 16, seed=8)
    )[..., None]
    rgb = np.where(inside[..., None], rgb, mortar_rgb)
    # baked ambient occlusion in the joints
    ao = np.clip(0.55 + 0.45 * np.clip(d / 9.0, 0, 1), 0, 1)
    ao = np.where(inside, ao, 0.62)
    rgb = rgb * ao[..., None]
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 3.0)
    return rgb, height


# ------------------------------------------------------------- 2. wood planks
def wood_planks(name, base, planks=6, vertical=True, gap=4):
    pw = S // planks
    coord = np.arange(S)
    xx = coord[None, :].repeat(S, 0)
    yy = coord[:, None].repeat(S, 1)
    across, along = (xx, yy) if vertical else (yy, xx)
    pid = across // pw
    lx = across % pw
    inside = (lx > gap) & (lx < pw - gap)
    d = np.minimum(lx - gap, pw - gap - lx)
    bevel = np.clip(d / 6.0, 0, 1)

    r = np.random.default_rng(303)
    per = r.normal(0, 0.12, size=(planks + 1,))
    warp = fbm(4, 4, seed=21) * 26.0
    rings = 0.5 + 0.5 * np.sin((along + warp + per[pid] * 260) * 0.16)
    rings = rings ** 1.7
    fine = fbm(6, 24, seed=31)
    knots = np.clip(1.0 - normalize01(fbm(3, 3, seed=44)) * 1.35, 0, 1)
    mono = np.clip(0.42 + 0.34 * rings + 0.22 * fine - 0.18 * knots + per[pid], 0, 1)
    rgb = tint(base, mono, 0.60, 1.22)
    rgb = np.where(inside[..., None], rgb, rgb * 0.30)
    ao = np.where(inside, 0.72 + 0.28 * bevel, 0.42)
    rgb = rgb * ao[..., None]

    height = np.where(inside, 0.40 + 0.45 * bevel, 0.02)
    height = np.clip(height + rings * 0.10 + fine * 0.08, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 2.6)
    return rgb, height


# --------------------------------------------------------------- 3. stone wall
def stone_wall(name, base):
    img = Image.new("L", (S, S), 12)
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(909)
    rows = 6
    rh = S / rows
    for ry in range(rows):
        x = -r.integers(20, 80)
        y0 = ry * rh
        while x < S + 20:
            w = int(r.integers(48, 108))
            h = int(rh - r.integers(6, 14))
            for ox in (0, S, -S):
                d.rounded_rectangle(
                    [x + ox + 3, y0 + 4, x + ox + w - 3, y0 + h],
                    radius=int(r.integers(6, 14)),
                    fill=int(r.integers(165, 240)),
                )
            x += w + int(r.integers(4, 9))
    img = img.filter(ImageFilter.GaussianBlur(1.6))
    stones = np.asarray(img, dtype=np.float64) / 255.0
    mask = stones > 0.30
    grain = fbm(6, 10, seed=61)
    height = np.clip(stones * (0.72 + 0.28 * grain), 0, 1)
    mono = np.clip(0.40 + 0.50 * stones + 0.28 * grain, 0, 1)
    rgb = tint(base, mono, 0.62, 1.18)
    rgb = np.where(mask[..., None], rgb, np.array(base) * 0.30)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 3.2)
    return rgb, height


# ----------------------------------------------------------------- 4. plaster
def plaster(name, base):
    coarse = fbm(6, 5, seed=71)
    fine = fbm(7, 40, seed=72)
    stain = np.clip(normalize01(fbm(3, 3, seed=73)) * 1.2 - 0.35, 0, 1)
    mono = np.clip(0.66 + 0.16 * coarse + 0.20 * fine - 0.22 * stain, 0, 1)
    rgb = tint(base, mono, 0.80, 1.10)
    height = np.clip(0.5 + 0.30 * fine + 0.18 * coarse, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 1.5)
    return rgb, height


# -------------------------------------------------------------- 5. roof tiles
def roof_tiles(name, base):
    img = Image.new("L", (S, S), 20)
    d = ImageDraw.Draw(img)
    rows, cols = 8, 8
    rh, cw = S / rows, S / cols
    for ry in range(rows + 1):
        y = ry * rh
        off = 0 if ry % 2 == 0 else cw / 2
        for cx in range(-1, cols + 2):
            x = cx * cw + off
            d.ellipse([x, y - rh * 0.15, x + cw, y + rh * 1.25], fill=235)
            d.ellipse([x + 3, y - rh * 0.05, x + cw - 3, y + rh * 1.1], fill=150)
    img = img.filter(ImageFilter.GaussianBlur(1.3))
    t = np.asarray(img, dtype=np.float64) / 255.0
    grain = fbm(6, 12, seed=81)
    mono = np.clip(0.34 + 0.52 * t + 0.24 * grain, 0, 1)
    rgb = tint(base, mono, 0.60, 1.20)
    height = np.clip(t * 0.85 + grain * 0.15, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 3.4)
    return rgb, height


# ------------------------------------------------------------------- 6. grass
def grass(name):
    patch = fbm(5, 6, seed=91)
    blades = fbm(7, 64, seed=92)
    micro = fbm(7, 128, seed=93)
    mono = np.clip(0.34 + 0.34 * patch + 0.34 * blades + 0.16 * micro, 0, 1)
    dark = np.array([46.0, 84.0, 42.0])
    light = np.array([126.0, 168.0, 78.0])
    t = mono[..., None]
    rgb = dark * (1 - t) + light * t
    dryness = np.clip(normalize01(fbm(3, 4, seed=94)) * 1.1 - 0.45, 0, 1)[..., None]
    rgb = rgb * (1 - dryness) + np.array([150.0, 148.0, 92.0]) * dryness
    height = np.clip(0.4 + 0.4 * blades + 0.2 * micro, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 1.8)


# -------------------------------------------------------------- 7. cobblestone
def cobbles(name):
    img = Image.new("L", (S, S), 16)
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(1212)
    step = 64
    for gy in range(S // step + 1):
        for gx in range(S // step + 1):
            cx = gx * step + r.integers(-7, 8)
            cy = gy * step + r.integers(-7, 8)
            rad = int(r.integers(22, 31))
            for ox in (0, S, -S):
                for oy in (0, S, -S):
                    d.ellipse(
                        [cx + ox - rad, cy + oy - rad, cx + ox + rad, cy + oy + rad],
                        fill=int(r.integers(170, 245)),
                    )
    img = img.filter(ImageFilter.GaussianBlur(2.0))
    t = np.asarray(img, dtype=np.float64) / 255.0
    grain = fbm(6, 14, seed=101)
    mono = np.clip(0.30 + 0.55 * t + 0.22 * grain, 0, 1)
    rgb = tint((150, 146, 140), mono, 0.55, 1.22)
    height = np.clip(t * 0.9 + grain * 0.1, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 3.0)


# ---------------------------------------------------------------- 8. tree bark
def bark(name):
    warp = fbm(4, 3, seed=111) * 30
    xx = np.arange(S)[None, :].repeat(S, 0)
    ridges = 0.5 + 0.5 * np.sin((xx + warp) * 0.32)
    ridges = ridges ** 2.2
    cracks = np.clip(1 - normalize01(fbm(6, 10, seed=112)) * 1.5, 0, 1)
    fine = fbm(7, 48, seed=113)
    mono = np.clip(0.30 + 0.40 * ridges + 0.22 * fine - 0.30 * cracks, 0, 1)
    rgb = tint((104, 78, 56), mono, 0.55, 1.25)
    height = np.clip(0.35 + 0.45 * ridges + 0.20 * fine - 0.30 * cracks, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 3.6)


# ------------------------------------------------------------------ 9. foliage
def leaves(name):
    img = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(1313)
    for _ in range(1400):
        cx, cy = r.integers(0, S), r.integers(0, S)
        w, h = int(r.integers(12, 30)), int(r.integers(7, 16))
        v = int(r.integers(90, 255))
        for ox in (0, S, -S):
            for oy in (0, S, -S):
                d.ellipse([cx + ox - w, cy + oy - h, cx + ox + w, cy + oy + h], fill=v)
    img = img.filter(ImageFilter.GaussianBlur(1.0))
    t = np.asarray(img, dtype=np.float64) / 255.0
    shade = fbm(5, 8, seed=121)
    mono = np.clip(0.28 + 0.55 * t + 0.25 * shade, 0, 1)
    dark = np.array([28.0, 62.0, 32.0])
    light = np.array([118.0, 176.0, 74.0])
    tt = mono[..., None]
    rgb = dark * (1 - tt) + light * tt
    height = np.clip(t * 0.85 + shade * 0.15, 0, 1)
    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 2.4)


# ------------------------------------------------- 10. building facade (1 bay)
def facade(name, wall_rgb, wall_height, frame=(52, 46, 42), glass=(96, 128, 152)):
    """One tileable bay: wall + a recessed window with frame, sill and glass.
    Also writes `<name>_mask.png` marking the glass area (for night emission).
    """
    rgb = wall_rgb.copy()
    height = wall_height.copy()
    mask = np.zeros((S, S))

    x0, x1 = 128, 384
    y0, y1 = 118, 356
    yy = np.arange(S)[:, None].repeat(S, 1)
    xx = np.arange(S)[None, :].repeat(S, 0)

    outer = (xx >= x0 - 22) & (xx <= x1 + 22) & (yy >= y0 - 22) & (yy <= y1 + 22)
    win = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)

    # frame
    rgb = np.where(outer[..., None], np.array(frame, dtype=np.float64), rgb)
    height = np.where(outer, 0.90, height)

    # glass with a soft vertical sky gradient + a diagonal highlight
    grad = np.clip((yy - y0) / max(1, (y1 - y0)), 0, 1)
    g = np.array(glass, dtype=np.float64)[None, None, :] * (
        1.28 - 0.62 * grad
    )[..., None]
    streak = np.clip(np.sin((xx * 0.9 + yy * 1.5) * 0.012) * 0.5 + 0.5, 0, 1)
    g = g * (0.86 + 0.26 * streak)[..., None]
    g = g * (0.90 + 0.20 * fbm(5, 9, seed=131))[..., None]
    rgb = np.where(win[..., None], g, rgb)
    height = np.where(win, 0.34, height)
    mask = np.where(win, 1.0, mask)

    # mullions (glazing bars)
    barx = (np.abs(xx - (x0 + x1) // 2) < 7) & win
    bary = (np.abs(yy - (y0 + y1) // 2) < 7) & win
    bars = barx | bary
    rgb = np.where(bars[..., None], np.array(frame, dtype=np.float64) * 1.12, rgb)
    height = np.where(bars, 0.80, height)
    mask = np.where(bars, 0.18, mask)

    # concrete sill below the window
    sill = (xx >= x0 - 34) & (xx <= x1 + 34) & (yy > y1 + 22) & (yy <= y1 + 52)
    rgb = np.where(sill[..., None], np.array([172.0, 168.0, 160.0]), rgb)
    height = np.where(sill, 1.0, height)
    # AO smear under the sill
    under = (xx >= x0 - 34) & (xx <= x1 + 34) & (yy > y1 + 52) & (yy <= y1 + 96)
    fade = np.clip(1 - (yy - (y1 + 52)) / 44.0, 0, 1)
    rgb = np.where(under[..., None], rgb * (0.60 + 0.40 * (1 - fade))[..., None], rgb)

    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 2.8)
    m = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(m, "L").convert("RGB").save(
        os.path.join(OUT, name + "_mask.png"), optimize=True
    )


# ------------------------------------------------------------------- 11. doors
def door(name, base=(96, 62, 38)):
    rgb, height = None, None
    coord = np.arange(S)
    xx = coord[None, :].repeat(S, 0)
    yy = coord[:, None].repeat(S, 1)
    warp = fbm(4, 4, seed=141) * 20
    grain = 0.5 + 0.5 * np.sin((yy + warp) * 0.10)
    fine = fbm(6, 30, seed=142)
    mono = np.clip(0.45 + 0.30 * grain + 0.25 * fine, 0, 1)
    rgb = tint(base, mono, 0.62, 1.20)
    height = np.clip(0.45 + 0.25 * grain + 0.20 * fine, 0, 1)

    # two recessed panels
    for (py0, py1) in ((70, 232), (280, 442)):
        panel = (xx > 86) & (xx < S - 86) & (yy > py0) & (yy < py1)
        edge = (
            (xx > 66) & (xx < S - 66) & (yy > py0 - 20) & (yy < py1 + 20) & ~panel
        )
        rgb = np.where(panel[..., None], rgb * 0.86, rgb)
        rgb = np.where(edge[..., None], rgb * 1.10, rgb)
        height = np.where(panel, 0.22, height)
        height = np.where(edge, 0.85, height)

    # brass knob
    kn = ((xx - 428) ** 2 + (yy - 256) ** 2) < 18 ** 2
    rgb = np.where(kn[..., None], np.array([206.0, 168.0, 78.0]), rgb)
    height = np.where(kn, 1.0, height)

    save_rgb(rgb, name + ".png")
    save_normal_from_height(height, name + "_n.png", 2.4)


# ------------------------------------------------------- 12. soft shadow decal
def shadow_blob(name="shadow_blob.png"):
    yy, xx = np.mgrid[0:S, 0:S]
    d = np.sqrt((xx - S / 2) ** 2 + (yy - S / 2) ** 2) / (S / 2)
    a = np.clip(1.0 - d, 0, 1) ** 1.9
    img = np.zeros((S, S, 4), dtype=np.uint8)
    img[..., 3] = (a * 190).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(os.path.join(OUT, name), optimize=True)


# --------------------------------------------------------------------- 13. run
if __name__ == "__main__":
    print("generating textures ...")
    br_rgb, br_h = bricks("brick_red", (176, 82, 60), (206, 202, 192), rows=8, cols=4)
    bg_rgb, bg_h = bricks(
        "brick_beige", (206, 178, 138), (232, 228, 218), rows=8, cols=4
    )
    wd_rgb, wd_h = wood_planks("wood_planks", (150, 104, 62), planks=6, vertical=True)
    st_rgb, st_h = stone_wall("stone_wall", (154, 150, 142))
    pl_rgb, pl_h = plaster("plaster_white", (226, 220, 208))
    roof_tiles("roof_tiles", (150, 62, 48))
    roof_tiles("roof_shingle", (92, 88, 92))
    grass("grass")
    cobbles("cobble_path")
    bark("bark")
    leaves("leaves")
    door("door_wood")
    shadow_blob()

    # facades reuse the wall fields so the bay lines up perfectly
    facade("facade_brick", br_rgb, br_h)
    facade(
        "facade_concrete",
        tint((186, 184, 178), np.clip(0.55 + 0.45 * fbm(6, 6, seed=151), 0, 1), 0.82, 1.10),
        np.clip(0.5 + 0.25 * fbm(6, 20, seed=152), 0, 1),
        frame=(38, 42, 48),
        glass=(104, 140, 166),
    )

    files = sorted(os.listdir(OUT))
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print(f"{len(files)} files, {total/1024:.0f} KB")
    for f in files:
        print(" ", f, f"{os.path.getsize(os.path.join(OUT, f))/1024:.0f}K")
