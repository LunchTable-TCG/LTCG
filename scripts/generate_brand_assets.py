#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = REPO_ROOT / "apps/web/public/assets"
OUT_DIR = REPO_ROOT / "output/brand"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def _save_png(img: Image.Image, path: Path) -> None:
    _ensure_dir(path.parent)
    img.save(path, format="PNG", optimize=True)


def _cover(im: Image.Image, size: Tuple[int, int], *, anchor: Tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    target_w, target_h = size
    if target_w <= 0 or target_h <= 0:
        raise ValueError("invalid target size")

    src_w, src_h = im.size
    if src_w <= 0 or src_h <= 0:
        raise ValueError("invalid source size")

    scale = max(target_w / src_w, target_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    resized = im.resize((new_w, new_h), Image.LANCZOS)

    ax, ay = anchor
    ax = max(0.0, min(1.0, ax))
    ay = max(0.0, min(1.0, ay))

    left = int(round((new_w - target_w) * ax))
    top = int(round((new_h - target_h) * ay))
    left = max(0, min(left, new_w - target_w))
    top = max(0, min(top, new_h - target_h))
    return resized.crop((left, top, left + target_w, top + target_h))


def _soft_vignette_mask(size: Tuple[int, int], *, strength: float = 0.85) -> Image.Image:
    # Build at lower resolution for speed, then upscale.
    w, h = size
    sw, sh = max(128, w // 6), max(128, h // 6)
    cx, cy = (sw - 1) / 2.0, (sh - 1) / 2.0
    max_r = math.sqrt(cx * cx + cy * cy)

    mask = Image.new("L", (sw, sh), 0)
    pix = mask.load()
    for y in range(sh):
        for x in range(sw):
            dx = x - cx
            dy = y - cy
            r = math.sqrt(dx * dx + dy * dy) / max_r
            # Keep center clear, darken edges with eased curve.
            t = max(0.0, min(1.0, (r - 0.25) / 0.75))
            t = t * t * (3 - 2 * t)  # smoothstep
            a = int(round(255 * strength * t))
            pix[x, y] = a
    return mask.resize((w, h), Image.BILINEAR)


def _apply_vignette(img: Image.Image, *, strength: float = 0.85) -> Image.Image:
    base = img.convert("RGBA")
    mask = _soft_vignette_mask(base.size, strength=strength)
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 255))
    overlay.putalpha(mask)
    return Image.alpha_composite(base, overlay)


def _add_grain(img: Image.Image, *, amount: float = 0.10, seed: int = 1337) -> Image.Image:
    # Deterministic low-frequency noise.
    rnd = random.Random(seed)
    w, h = img.size
    sw, sh = max(64, w // 8), max(64, h // 8)
    noise = Image.new("L", (sw, sh), 0)
    px = noise.load()
    for y in range(sh):
        for x in range(sw):
            px[x, y] = rnd.randint(0, 255)
    noise = noise.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(radius=1.2))

    # Convert to RGB and blend.
    noise_rgb = Image.merge("RGB", (noise, noise, noise)).convert("RGBA")
    alpha = int(round(255 * max(0.0, min(1.0, amount))))
    noise_rgb.putalpha(alpha)
    return Image.alpha_composite(img.convert("RGBA"), noise_rgb)


def _overlay_color(img: Image.Image, rgb: Tuple[int, int, int], *, opacity: float) -> Image.Image:
    base = img.convert("RGBA")
    a = int(round(255 * max(0.0, min(1.0, opacity))))
    layer = Image.new("RGBA", base.size, (rgb[0], rgb[1], rgb[2], a))
    return Image.alpha_composite(base, layer)


def _generate_particles(
    size: Tuple[int, int],
    *,
    n: int,
    colors: Iterable[Tuple[int, int, int]],
    seed: int,
    blur: float = 1.2,
) -> Image.Image:
    rnd = random.Random(seed)
    w, h = size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    palette = list(colors)
    if not palette:
        palette = [(212, 175, 55)]

    for _ in range(n):
        x = rnd.random() * w
        y = rnd.random() * h
        r = rnd.uniform(1.0, 3.8)
        rgb = palette[rnd.randrange(len(palette))]
        a = int(rnd.uniform(40, 130))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(rgb[0], rgb[1], rgb[2], a))

    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(radius=blur))
    return layer


def _load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/NewYork.ttf",
        "/System/Library/Fonts/Palatino.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Geneva.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def _gold_gradient(size: Tuple[int, int]) -> Image.Image:
    w, h = size
    top = (249, 238, 176)
    mid = (212, 175, 55)
    bot = (139, 105, 20)
    grad = Image.new("RGBA", (1, h), (0, 0, 0, 0))
    px = grad.load()
    for y in range(h):
        t = 0.0 if h <= 1 else y / (h - 1)
        if t < 0.45:
            k = t / 0.45
            r = int(round(top[0] + (mid[0] - top[0]) * k))
            g = int(round(top[1] + (mid[1] - top[1]) * k))
            b = int(round(top[2] + (mid[2] - top[2]) * k))
        else:
            k = (t - 0.45) / 0.55
            r = int(round(mid[0] + (bot[0] - mid[0]) * k))
            g = int(round(mid[1] + (bot[1] - mid[1]) * k))
            b = int(round(mid[2] + (bot[2] - mid[2]) * k))
        px[0, y] = (r, g, b, 255)
    return grad.resize((w, h), Image.BILINEAR)


def _draw_gold_text(
    base: Image.Image,
    text: str,
    *,
    center: Tuple[int, int],
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    shadow: bool = True,
    stroke: int = 0,
) -> Image.Image:
    img = base.convert("RGBA")
    w, h = img.size

    mask = Image.new("L", (w, h), 0)
    mdraw = ImageDraw.Draw(mask)
    bbox = mdraw.textbbox(center, text, font=font, anchor="mm", stroke_width=stroke)
    mdraw.text(center, text, font=font, fill=255, anchor="mm", stroke_width=stroke)

    left, top, right, bottom = bbox
    tw, th = max(1, right - left), max(1, bottom - top)
    grad = _gold_gradient((tw, th))
    text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    text_layer.paste(grad, (left, top), mask.crop((left, top, right, bottom)))

    if shadow:
        shadow_mask = mask.filter(ImageFilter.GaussianBlur(radius=6))
        shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        shadow_color = Image.new("RGBA", (w, h), (0, 0, 0, 200))
        shadow_layer = Image.composite(shadow_color, shadow_layer, shadow_mask)
        shadow_layer = ImageChops.offset(shadow_layer, 0, 4)
        img = Image.alpha_composite(img, shadow_layer)

    img = Image.alpha_composite(img, text_layer)
    return img


def _key_black_to_alpha(img: Image.Image, *, threshold: int = 14, softness: int = 60) -> Image.Image:
    # Build alpha from brightness so near-black becomes transparent.
    rgba = img.convert("RGBA")
    r, g, b, a = rgba.split()
    brightness = ImageChops.lighter(ImageChops.lighter(r, g), b)  # max(r,g,b)
    # Map: [0..threshold] -> 0, [threshold..threshold+softness] -> ramp, rest -> 255
    lut = []
    for i in range(256):
        if i <= threshold:
            lut.append(0)
        elif i >= threshold + softness:
            lut.append(255)
        else:
            t = (i - threshold) / max(1, softness)
            lut.append(int(round(255 * t)))
    new_alpha = brightness.point(lut)
    rgba.putalpha(new_alpha)
    return rgba


def _mirror_tile(im: Image.Image) -> Image.Image:
    # 2x2 mirrored tile that repeats seamlessly as a single unit.
    base = im.convert("RGBA")
    w, h = base.size
    out = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    out.paste(base, (0, 0))
    out.paste(ImageOps.mirror(base), (w, 0))
    out.paste(ImageOps.flip(base), (0, h))
    out.paste(ImageOps.flip(ImageOps.mirror(base)), (w, h))
    return out


@dataclass(frozen=True)
class ArchetypeSpec:
    key: str
    label: str
    glow_rgb: Tuple[int, int, int]


ARCHETYPES: list[ArchetypeSpec] = [
    ArchetypeSpec("infernal_dragons", "Infernal Dragons", (255, 107, 53)),
    ArchetypeSpec("abyssal_horrors", "Abyssal Horrors", (30, 144, 255)),
    ArchetypeSpec("nature_spirits", "Nature Spirits", (16, 185, 129)),
    ArchetypeSpec("storm_elementals", "Storm Elementals", (139, 92, 246)),
    ArchetypeSpec("shadow_assassins", "Shadow Assassins", (75, 85, 99)),
    ArchetypeSpec("celestial_guardians", "Celestial Guardians", (212, 175, 55)),
    ArchetypeSpec("undead_legion", "Undead Legion", (147, 51, 234)),
    ArchetypeSpec("divine_knights", "Divine Knights", (245, 158, 11)),
    ArchetypeSpec("arcane_mages", "Arcane Mages", (236, 72, 153)),
    ArchetypeSpec("mechanical_constructs", "Mechanical Constructs", (20, 184, 166)),
]


def _make_archetype_icon(src: Image.Image, *, size: int, glow_rgb: Tuple[int, int, int], seed: int) -> Image.Image:
    # Circular crop of art + gold ring + subtle glow.
    base = _cover(src.convert("RGBA"), (size, size), anchor=(0.5, 0.35))
    rnd = random.Random(seed)

    # Mild contrast/saturation boost to pop in small size.
    base = ImageEnhance.Contrast(base).enhance(1.08)
    base = ImageEnhance.Color(base).enhance(1.05)

    # Circle mask.
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    pad = int(round(size * 0.04))
    draw.ellipse((pad, pad, size - pad, size - pad), fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)

    # Glow behind.
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    glow_r = int(round(size * 0.48))
    cx = cy = size // 2
    gdraw.ellipse(
        (cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r),
        fill=(glow_rgb[0], glow_rgb[1], glow_rgb[2], 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.06))
    out = Image.alpha_composite(glow, out)

    # Gold ring.
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    ring_w = max(6, int(round(size * 0.035)))
    ring_box = (pad, pad, size - pad, size - pad)
    rdraw.ellipse(ring_box, outline=(212, 175, 55, 255), width=ring_w)
    ring = ring.filter(ImageFilter.GaussianBlur(radius=0.3))

    # Small gem at bottom.
    gem = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(gem)
    gem_w = max(12, int(round(size * 0.11)))
    gx = size // 2
    gy = int(round(size * 0.86))
    points = [
        (gx, gy - gem_w // 2),
        (gx + gem_w // 2, gy),
        (gx, gy + gem_w // 2),
        (gx - gem_w // 2, gy),
    ]
    g.polygon(points, fill=(66, 211, 238, 220), outline=(255, 255, 255, 160))
    g.polygon(
        [
            (gx, gy - gem_w // 2),
            (gx + gem_w // 4, gy),
            (gx, gy + gem_w // 2),
            (gx - gem_w // 4, gy),
        ],
        fill=(255, 255, 255, 70),
    )
    gem = gem.filter(ImageFilter.GaussianBlur(radius=0.6))

    out = Image.alpha_composite(out, ring)
    out = Image.alpha_composite(out, gem)

    # Subtle sparkles.
    particles = _generate_particles(
        (size, size),
        n=max(10, size // 18),
        colors=[(212, 175, 55), glow_rgb, (255, 255, 255)],
        seed=rnd.randint(0, 10_000_000),
        blur=1.0,
    )
    out = Image.alpha_composite(out, particles)
    return out


def generate() -> None:
    _ensure_dir(OUT_DIR)

    logo_lockup = _load_rgba(ASSETS_DIR / "logo-main.png")
    logo_icon = _load_rgba(ASSETS_DIR / "logo-icon.png")

    bg_hero_src = _load_rgba(ASSETS_DIR / "backgrounds/game_arena_background.png")
    bg_story_src = _load_rgba(ASSETS_DIR / "backgrounds/story-bg.png")
    leather = _load_rgba(ASSETS_DIR / "textures/leather.png")
    parchment = _load_rgba(ASSETS_DIR / "textures/parchment.png")
    panel_bg = _load_rgba(ASSETS_DIR / "ui/fantasy_panel_bg.png")

    # -------------------------------------------------------------------------
    # Textures (tileable mirrored variants)
    # -------------------------------------------------------------------------
    textures_out = OUT_DIR / "textures"
    for name, img in [
        ("parchment-seamless-1024.png", parchment),
        ("leather-seamless-1024.png", leather),
        ("gold-metal-seamless-1024.png", _load_rgba(ASSETS_DIR / "ui/fantasy_gold_metal.png")),
        ("arcane-stone-seamless-1024.png", panel_bg),
    ]:
        tile = _mirror_tile(img).resize((1024, 1024), Image.LANCZOS)
        tile = _add_grain(tile, amount=0.06, seed=2026)
        _save_png(tile, textures_out / name)

    # -------------------------------------------------------------------------
    # UI alpha conversions (key black background to transparency)
    # -------------------------------------------------------------------------
    ui_out = OUT_DIR / "ui"
    for src_name in [
        "corner_ornament.png",
        "header_banner.png",
        "buttons_fantasy.png",
        "fantasy_panel_bg.png",
        "fantasy_wood_btn.png",
        "button-bg.png",
        "panel_grimoire.png",
    ]:
        src = _load_rgba(ASSETS_DIR / "ui" / src_name)
        keyed = _key_black_to_alpha(src, threshold=12, softness=70)
        _save_png(keyed, ui_out / src_name.replace(".png", ".alpha.png"))

    # -------------------------------------------------------------------------
    # Backgrounds (textless + branded variants)
    # -------------------------------------------------------------------------
    backgrounds_out = OUT_DIR / "backgrounds"

    hero = _cover(bg_hero_src, (1536, 1024), anchor=(0.5, 0.45))
    hero = _overlay_color(hero, (15, 10, 9), opacity=0.12)
    hero = _overlay_color(hero, (212, 175, 55), opacity=0.06)
    hero = _add_grain(hero, amount=0.08, seed=101)
    hero = _apply_vignette(hero, strength=0.90)
    particles = _generate_particles(
        hero.size,
        n=260,
        colors=[(212, 175, 55), (255, 107, 53), (6, 182, 212)],
        seed=555,
        blur=1.6,
    )
    hero = Image.alpha_composite(hero, particles)
    _save_png(hero, backgrounds_out / "ltcg-hero-1536x1024.png")

    hero_branded = hero.copy()
    # Logo with soft glow behind.
    glow = Image.new("RGBA", hero_branded.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    cx, cy = hero_branded.size[0] // 2, int(hero_branded.size[1] * 0.28)
    r = int(hero_branded.size[0] * 0.22)
    gdraw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(212, 175, 55, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=90))
    hero_branded = Image.alpha_composite(hero_branded, glow)

    lockup = logo_lockup.resize((560, 560), Image.LANCZOS)
    lockup_shadow = Image.new("RGBA", lockup.size, (0, 0, 0, 0))
    lockup_shadow.paste((0, 0, 0, 200), (0, 0, lockup.size[0], lockup.size[1]), lockup.split()[3])
    lockup_shadow = lockup_shadow.filter(ImageFilter.GaussianBlur(radius=10))
    lx = hero_branded.size[0] // 2 - lockup.size[0] // 2
    ly = int(hero_branded.size[1] * 0.10)
    hero_branded.alpha_composite(lockup_shadow, (lx, ly + 8))
    hero_branded.alpha_composite(lockup, (lx, ly))

    tagline_font = _load_font(54)
    hero_branded = _draw_gold_text(
        hero_branded,
        "Command Legendary Powers. Forge Your Destiny.",
        center=(hero_branded.size[0] // 2, int(hero_branded.size[1] * 0.70)),
        font=tagline_font,
        shadow=True,
        stroke=0,
    )
    _save_png(hero_branded, backgrounds_out / "ltcg-hero-1536x1024.branded.png")

    vertical = _cover(bg_story_src, (1024, 1536), anchor=(0.5, 0.35))
    vertical = _overlay_color(vertical, (0, 0, 0), opacity=0.18)
    vertical = _apply_vignette(vertical, strength=0.92)
    vertical = _add_grain(vertical, amount=0.08, seed=303)
    vertical = Image.alpha_composite(
        vertical,
        _generate_particles(
            vertical.size,
            n=240,
            colors=[(212, 175, 55), (255, 107, 53), (147, 51, 234)],
            seed=777,
            blur=1.8,
        ),
    )
    _save_png(vertical, backgrounds_out / "ltcg-vertical-1024x1536.png")

    # -------------------------------------------------------------------------
    # Social / marketing images (with logo)
    # -------------------------------------------------------------------------
    social_out = OUT_DIR / "social"

    og = _cover(hero, (1200, 630), anchor=(0.5, 0.42))
    og = _overlay_color(og, (0, 0, 0), opacity=0.12)
    og = _apply_vignette(og, strength=0.85)

    icon = logo_icon.resize((220, 220), Image.LANCZOS)
    ix = 70
    iy = og.size[1] // 2 - icon.size[1] // 2
    icon_shadow = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    icon_shadow.paste((0, 0, 0, 220), (0, 0, icon.size[0], icon.size[1]), icon.split()[3])
    icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(radius=10))
    og.alpha_composite(icon_shadow, (ix, iy + 8))
    og.alpha_composite(icon, (ix, iy))

    title_font = _load_font(72)
    og = _draw_gold_text(
        og,
        "Lunchtable Chronicles",
        center=(ix + 220 + 340, og.size[1] // 2 - 35),
        font=title_font,
        shadow=True,
        stroke=0,
    )
    sub_font = _load_font(42)
    draw = ImageDraw.Draw(og)
    sub = "A fantasy multiplayer trading card game"
    # Soft off-white subhead.
    draw.text(
        (ix + 220 + 340, og.size[1] // 2 + 38),
        sub,
        font=sub_font,
        fill=(232, 224, 213, 230),
        anchor="mm",
    )
    _save_png(og, social_out / "og-1200x630.png")

    square = _cover(hero, (1024, 1024), anchor=(0.5, 0.40))
    square = _apply_vignette(square, strength=0.88)
    square = _overlay_color(square, (212, 175, 55), opacity=0.06)
    sq_icon = logo_icon.resize((320, 320), Image.LANCZOS)
    sx = square.size[0] // 2 - sq_icon.size[0] // 2
    sy = int(square.size[1] * 0.15)
    square.alpha_composite(sq_icon, (sx, sy))
    square = _draw_gold_text(
        square,
        "Play Free Now",
        center=(square.size[0] // 2, int(square.size[1] * 0.78)),
        font=_load_font(64),
        shadow=True,
    )
    _save_png(square, social_out / "square-1024.png")

    reels = _cover(vertical, (1080, 1920), anchor=(0.5, 0.48))
    reels = _overlay_color(reels, (0, 0, 0), opacity=0.10)
    reels = _apply_vignette(reels, strength=0.90)
    r_lock = logo_icon.resize((280, 280), Image.LANCZOS)
    reels.alpha_composite(r_lock, (reels.size[0] // 2 - 140, 140))
    reels = _draw_gold_text(
        reels,
        "Build Your Legend",
        center=(reels.size[0] // 2, 520),
        font=_load_font(72),
        shadow=True,
    )
    _save_png(reels, social_out / "reels-1080x1920.png")

    # -------------------------------------------------------------------------
    # Archetype icons (from story art)
    # -------------------------------------------------------------------------
    icons_out = OUT_DIR / "icons/archetypes"
    for i, spec in enumerate(ARCHETYPES, start=1):
        story_path = ASSETS_DIR / "story" / f"{spec.key}.png"
        if not story_path.exists():
            continue
        src = _load_rgba(story_path)
        icon_512 = _make_archetype_icon(src, size=512, glow_rgb=spec.glow_rgb, seed=9000 + i)
        _save_png(icon_512, icons_out / f"{spec.key}.png")


if __name__ == "__main__":
    generate()
