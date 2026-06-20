"""Generate the PWA PNG icons from a simple drawn design (no SVG rasterizer needed).

Run with:  npm run icons   (or)   python scripts/make_icons.py

Produces, in public/:
  pwa-192.png        Android / manifest
  pwa-512.png        Android / manifest
  maskable-512.png   Android adaptive (safe-zone aware)
  apple-touch-icon.png (180x180)  iOS home screen
"""
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Pillow is required. Install it with:  python -m pip install pillow")

TEAL = (15, 118, 110, 255)      # #0f766e
WHITE = (255, 255, 255, 242)
LIGHT = (94, 234, 212, 217)     # #5eead4

PUBLIC = Path(__file__).resolve().parent.parent / "public"


def draw_icon(size: int, *, maskable: bool = False) -> Image.Image:
    # Render large then downscale for crisp anti-aliased edges.
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Maskable icons must keep their content inside an 80% safe zone, so the
    # rounded square fills the whole canvas (it can be cropped to a circle).
    if maskable:
        d.rectangle([0, 0, s, s], fill=TEAL)
        content = 0.80
    else:
        radius = int(s * 0.22)
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=TEAL)
        content = 0.92

    # Two overlapping circles = two people sharing.
    r = int(s * 0.23 * content)
    cy = s // 2
    gap = int(r * 0.42)
    left = (s // 2 - gap, cy)
    right = (s // 2 + gap, cy)
    d.ellipse([left[0] - r, left[1] - r, left[0] + r, left[1] + r], fill=WHITE)
    d.ellipse([right[0] - r, right[1] - r, right[0] + r, right[1] + r], fill=LIGHT)

    return img.resize((size, size), Image.LANCZOS)


def draw_badge(size: int = 72) -> Image.Image:
    # Android status-bar icon must be a transparent silhouette (it gets tinted),
    # otherwise a full-color image renders as a white square. White glyph here.
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(s * 0.27)
    cy = s // 2
    gap = int(r * 0.45)
    for cx in (s // 2 - gap, s // 2 + gap):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    draw_badge(72).save(PUBLIC / "badge-72.png")
    draw_icon(192).save(PUBLIC / "pwa-192.png")
    draw_icon(512).save(PUBLIC / "pwa-512.png")
    draw_icon(512, maskable=True).save(PUBLIC / "maskable-512.png")
    draw_icon(180).save(PUBLIC / "apple-touch-icon.png")
    print("Wrote icons to", PUBLIC)


if __name__ == "__main__":
    main()
