#!/usr/bin/env python3
"""
The portfolio's link preview (spec §15.1): the title and a grid of pizzas,
1200 x 630, written to public/portfolio-preview.jpg.

It reads the live portfolio, which is public, so it needs no token: the
first pizzas on the grid, their photos, in the page's colours and the
title's heavy capitals. Run it by hand when the grid's first pizzas change,
then commit the image; a deploy serves it at /portfolio-preview.jpg.

    python3 scripts/portfolio-preview.py
    python3 scripts/portfolio-preview.py --site http://localhost:8788

Needs Pillow, and macOS for Helvetica Neue (Condensed Black for the title,
the nearest the system has to the page's heavy system font).
"""

from __future__ import annotations

import argparse
import html
import io
import re
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H = 1200, 630
BG = (233, 230, 225)  # --bg
INK = (21, 19, 17)  # --ink
MUTED = (93, 87, 81)  # --muted
ACCENT = (194, 65, 12)  # --accent
FRAME = (255, 255, 255)  # --frame
FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
CONDENSED_BLACK, MEDIUM = 9, 10

COLS, ROWS = 3, 2
TILE, GAP, PAD = 216, 24, 9


def fetch(url: str) -> bytes:
    """By curl, which uses the system's certificates; some Python installs on macOS have none."""
    return subprocess.run(['curl', '-fsS', '--max-time', '30', url], check=True, capture_output=True).stdout


def first_pizzas(site: str, count: int) -> list[tuple[str, str]]:
    """(name, photo path) for the first pizzas on the grid, dessert pizzas left out."""
    page = fetch(f'{site}/portfolio').decode()
    page = page.split('class="kind"')[0]
    tiles = re.findall(r'<img src="(/portfolio/photos/[\w-]+\.jpg)"[^>]*><span>([^<]*)</span>', page)
    if len(tiles) < count:
        raise SystemExit(f'the grid lists {len(tiles)} pizzas; the preview needs {count}')
    return [(html.unescape(name), src) for src, name in tiles[:count]]


def font(index: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size, index=index)


def fitted(text: str, index: int, width: int) -> ImageFont.FreeTypeFont:
    """The largest size at which `text` is no wider than `width`."""
    size = 20
    while font(index, size + 2).getlength(text) <= width:
        size += 2
    return font(index, size)


def compose(photos: list[Image.Image]) -> Image.Image:
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # The photos: white print frames with a soft shadow, as on the grid.
    grid_w = COLS * TILE + (COLS - 1) * GAP
    grid_h = ROWS * TILE + (ROWS - 1) * GAP
    gx, gy = W - 40 - grid_w, (H - grid_h) // 2
    shadow = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(shadow)
    boxes = []
    for k in range(COLS * ROWS):
        x = gx + (k % COLS) * (TILE + GAP)
        y = gy + (k // COLS) * (TILE + GAP)
        boxes.append((x, y))
        sd.rectangle((x, y + 6, x + TILE, y + TILE + 6), fill=60)
    img.paste((0, 0, 0), (0, 0), shadow.filter(ImageFilter.GaussianBlur(10)))
    for (x, y), photo in zip(boxes, photos):
        draw.rectangle((x, y, x + TILE - 1, y + TILE - 1), fill=FRAME)
        inner = TILE - 2 * PAD
        img.paste(ImageOps.fit(photo, (inner, inner), Image.LANCZOS), (x + PAD, y + PAD))

    # The title, as the page's header has it: DAVE'S over PIZZAS, a thick rule, the line under.
    left, right = 56, gx - 48
    width = right - left
    title = fitted('PIZZAS', CONDENSED_BLACK, width)
    sub = font(MEDIUM, 34)
    a1, d1 = title.getmetrics()
    line = int(a1 * 0.86)
    block = line * 2 + 34 + 8 + 30 + 40
    top = (H - block) // 2
    draw.text((left, top), "DAVE'S", font=title, fill=INK)
    draw.text((left, top + line), 'PIZZAS', font=title, fill=ACCENT)
    rule_y = top + line * 2 + 34
    draw.rectangle((left, rule_y, right, rule_y + 7), fill=INK)
    draw.text((left, rule_y + 30), 'Neo-Neapolitan style', font=sub, fill=MUTED)
    return img


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--site', default='https://pizza.dave-becker.com')
    p.add_argument('--out', default='public/portfolio-preview.jpg')
    args = p.parse_args()
    pizzas = first_pizzas(args.site.rstrip('/'), COLS * ROWS)
    photos = [Image.open(io.BytesIO(fetch(args.site.rstrip('/') + src))).convert('RGB') for _, src in pizzas]
    compose(photos).save(args.out, 'JPEG', quality=86, optimize=True, progressive=True)
    print(f'{args.out}: ' + ', '.join(name for name, _ in pizzas))


if __name__ == '__main__':
    main()
