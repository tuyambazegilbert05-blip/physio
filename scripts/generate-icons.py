from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "icons"
NAVY = (23, 39, 90, 255)
PALE = (220, 229, 255, 255)
WHITE = (255, 255, 255, 255)
GREEN = (157, 216, 184, 255)


def render_mark(size: int) -> Image.Image:
    scale = size / 128
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(28 * scale), fill=NAVY)

    points = [(36, 46), (62, 32), (92, 49), (36, 81), (64, 97), (92, 81), (64, 64)]
    links = [(0, 1), (1, 2), (0, 3), (0, 6), (1, 6), (2, 6), (2, 5), (3, 6), (3, 4), (4, 6), (5, 6), (4, 5)]
    width = max(1, round(8 * scale))
    for start, end in links:
        draw.line(
            tuple(round(value * scale) for value in (*points[start], *points[end])),
            fill=PALE,
            width=width,
        )

    for index, (x, y) in enumerate(points):
        radius = round((11 if index == 6 else 10) * scale)
        color = GREEN if index == 6 else WHITE
        center_x, center_y = round(x * scale), round(y * scale)
        draw.ellipse(
            (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
            fill=color,
        )
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    render_mark(16).save(OUTPUT / "favicon-16x16.png", optimize=True)
    render_mark(32).save(OUTPUT / "favicon-32x32.png", optimize=True)
    render_mark(180).save(OUTPUT / "apple-touch-icon.png", optimize=True)
    render_mark(192).save(OUTPUT / "icon-192.png", optimize=True)
    render_mark(32).save(OUTPUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])


if __name__ == "__main__":
    main()
