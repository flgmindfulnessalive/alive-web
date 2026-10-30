"""Prepara los recursos de marca a partir de los originales entregados.

Uso: python3 scripts/process-brand.py <banner.webp>

- Elimina del banner el wordmark y los textos, dejando solo la escultura.
- Convierte el fondo negro en transparencia (color-to-alpha), para que la
  escultura se funda con cualquier fondo oscuro de la web.
- Genera los recortes del hero y del cierre en WebP, y la imagen Open Graph.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/visual'

# Zonas de texto del banner original (2000×741): wordmark + firma, titular + servicios.
TEXT_BOXES = [(220, 240, 800, 430), (1300, 250, 1860, 530)]
BLACK_FLOOR = 30  # el fondo del banner (hasta ~RGB 4,12,21 con viñeteado) pasa a transparente


def remove_text(rgb: np.ndarray, boxes) -> np.ndarray:
    out = rgb.copy()
    for x0, y0, x1, y1 in boxes:
        region = out[y0:y1, x0:x1].astype(np.int16)
        mx, mn = region.max(axis=2), region.min(axis=2)
        # Texto blanco/gris: poco saturado y más claro que el fondo.
        text = ((mx - mn) < 70) & (mx > 22)
        mask = Image.fromarray((text * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
        m = np.array(mask) > 0
        bg = np.median(region[~m], axis=0)
        region[m] = bg
        out[y0:y1, x0:x1] = region.astype(np.uint8)
    return out


def color_to_alpha(rgb: np.ndarray) -> Image.Image:
    v = np.clip((rgb.astype(np.float32) - BLACK_FLOOR) / (255 - BLACK_FLOOR), 0, 1)
    alpha = v.max(axis=2)
    color = np.where(alpha[..., None] > 0, v / np.maximum(alpha[..., None], 1e-6), 0)
    rgba = np.dstack([color * 255, alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def main(banner_path: str) -> None:
    banner = np.array(Image.open(banner_path).convert('RGB'))
    clean = remove_text(banner, TEXT_BOXES)
    sculpture = color_to_alpha(clean)

    hero = sculpture.crop((640, 0, 1560, 741))
    hero.save(OUT / 'sculpture-hero.webp', quality=86, method=6)
    closing = sculpture.crop((440, 0, 2000, 741))
    closing.save(OUT / 'sculpture-closing.webp', quality=84, method=6)

    # Open Graph: banner sin titular derecho, conservando wordmark y firma.
    og_src = remove_text(banner, TEXT_BOXES[1:])
    og = Image.fromarray(og_src).resize((1701, 630), Image.LANCZOS).crop((90, 0, 1290, 630))
    og.save(ROOT / 'public/og-image.jpg', quality=88)

    for name, im in [('hero', hero), ('closing', closing)]:
        print(name, im.size)


if __name__ == '__main__':
    main(sys.argv[1])
