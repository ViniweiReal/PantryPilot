from pathlib import Path
from math import cos, sin, pi

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
FONT_ROOT = Path(r"C:\Users\Vinni\.codex\skills\canvas-design\canvas-fonts")

INK = "#222019"
CREAM = "#F4F0E6"
PAPER = "#FFFDF8"
MUTED = "#726E62"
TOMATO = "#D94B34"
BASIL = "#356B45"
YOLK = "#F0B33C"
AUBERGINE = "#5A2D45"


def font(name: str, size: int):
    return ImageFont.truetype(str(FONT_ROOT / name), size)


def cubic(p0, p1, p2, p3, steps=60):
    points = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u*u*t * p1[0] + 3 * u*t*t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u*u*t * p1[1] + 3 * u*t*t * p2[1] + t**3 * p3[1],
        ))
    return points


def centered_wordmark(draw, x, center_y, first, second, face, size, second_color=TOMATO, tracking=0):
    f = font(face, size)
    y = center_y - (draw.textbbox((0, 0), "Ag", font=f)[3] // 2) - size * 0.05
    draw.text((x, y), first, font=f, fill=INK)
    first_w = draw.textlength(first, font=f)
    draw.text((x + first_w + tracking, y), second, font=f, fill=second_color)


def save_logo(img, slug):
    path = ROOT / f"{slug}.png"
    img.save(path, dpi=(300, 300), optimize=True)
    return path


def logo_01():
    img = Image.new("RGBA", (3000, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy, r = 560, 600, 310
    d.ellipse((cx-r, cy-r, cx+r, cy+r), outline=TOMATO, width=34)
    d.ellipse((cx-r+72, cy-r+72, cx+r-72, cy+r-72), outline="#D9D2C3", width=9)
    route = cubic((400, 690), (425, 455), (625, 750), (720, 448), 90)
    d.line(route, fill=BASIL, width=37, joint="curve")
    d.ellipse((378, 668, 422, 712), fill=YOLK)
    tip = route[-1]
    d.polygon([(tip[0], tip[1]-46), (tip[0]+49, tip[1]+51), (tip[0]-43, tip[1]+27)], fill=BASIL)
    d.ellipse((495, 534, 618, 657), fill=TOMATO)
    d.ellipse((524, 562, 589, 627), fill=PAPER)
    centered_wordmark(d, 1020, 600, "Pantry", "Pilot", "YoungSerif-Regular.ttf", 315)
    return img


def logo_02():
    img = Image.new("RGBA", (3000, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((235, 275, 885, 925), radius=150, fill=AUBERGINE)
    # Two interlocking P-shaped pantry bays.
    d.line((385, 760, 385, 432), fill=PAPER, width=46)
    d.line(cubic((385, 434), (610, 300), (676, 624), (392, 596), 70), fill=PAPER, width=46, joint="curve")
    d.line((590, 742, 590, 493), fill=TOMATO, width=42)
    d.line(cubic((590, 495), (790, 385), (824, 661), (598, 640), 70), fill=TOMATO, width=42, joint="curve")
    d.ellipse((345, 348, 414, 417), fill=YOLK)
    d.ellipse((712, 489, 760, 537), fill=BASIL)
    centered_wordmark(d, 1025, 600, "Pantry", "Pilot", "BricolageGrotesque-Bold.ttf", 275)
    return img


def logo_03():
    img = Image.new("RGBA", (3000, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Open pantry / doorway, with shelves becoming a forward path.
    d.rounded_rectangle((270, 240, 850, 952), radius=286, fill=BASIL)
    d.rounded_rectangle((358, 332, 762, 952), radius=201, fill=(0, 0, 0, 0))
    d.rounded_rectangle((407, 510, 714, 546), radius=18, fill=TOMATO)
    d.rounded_rectangle((407, 652, 714, 688), radius=18, fill=TOMATO)
    d.ellipse((454, 430, 528, 504), fill=YOLK)
    d.rounded_rectangle((568, 444, 655, 510), radius=25, fill=PAPER)
    d.polygon([(497, 952), (629, 952), (697, 726), (430, 726)], fill=PAPER)
    d.line((563, 916, 563, 774), fill=TOMATO, width=24)
    d.polygon([(563, 748), (531, 800), (595, 800)], fill=TOMATO)
    centered_wordmark(d, 1010, 600, "Pantry", "Pilot", "Outfit-Bold.ttf", 282)
    return img


def logo_04():
    img = Image.new("RGBA", (3000, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # A cooking flame whose counterform is a guiding spoon.
    flame = []
    flame += cubic((560, 250), (515, 390), (308, 480), (315, 690), 60)
    flame += cubic((315, 690), (320, 920), (595, 1000), (770, 815), 60)[1:]
    flame += cubic((770, 815), (908, 670), (759, 447), (650, 330), 60)[1:]
    flame += cubic((650, 330), (635, 460), (560, 468), (560, 250), 60)[1:]
    d.polygon(flame, fill=TOMATO)
    leaf = []
    leaf += cubic((526, 710), (432, 607), (509, 501), (618, 476), 45)
    leaf += cubic((618, 476), (650, 603), (609, 692), (526, 710), 45)[1:]
    d.polygon(leaf, fill=BASIL)
    d.line((530, 720, 620, 520), fill=PAPER, width=29)
    d.ellipse((486, 698, 568, 804), fill=PAPER)
    d.ellipse((498, 713, 556, 781), fill=YOLK)
    centered_wordmark(d, 1015, 600, "Pantry", "Pilot", "InstrumentSerif-Regular.ttf", 320)
    return img


def logo_05():
    img = Image.new("RGBA", (3000, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = 560, 600
    d.ellipse((275, 315, 845, 885), fill=INK)
    d.ellipse((397, 437, 723, 763), outline=PAPER, width=31)
    # Compass/route P as an intelligent system glyph.
    d.line((488, 736, 488, 495), fill=PAPER, width=38)
    d.arc((470, 456, 668, 647), start=252, end=110, fill=PAPER, width=38)
    d.line((654, 490, 730, 404), fill=TOMATO, width=29)
    d.polygon([(746, 385), (724, 449), (684, 410)], fill=TOMATO)
    # Orbital ingredient signal.
    d.arc((220, 260, 900, 940), start=198, end=342, fill=BASIL, width=18)
    angle = 342 * pi / 180
    ox, oy = cx + 340*cos(angle), cy + 340*sin(angle)
    d.ellipse((ox-34, oy-34, ox+34, oy+34), fill=YOLK)
    centered_wordmark(d, 1010, 600, "PANTRY", "PILOT", "Tektur-Medium.ttf", 255, second_color=TOMATO, tracking=14)
    return img


def comparison(logos):
    width, height = 3000, 4300
    img = Image.new("RGB", (width, height), CREAM)
    d = ImageDraw.Draw(img)
    d.text((190, 150), "PANTRYPILOT", font=font("WorkSans-Bold.ttf", 76), fill=TOMATO)
    d.text((190, 250), "FIVE NEW IDENTITY DIRECTIONS", font=font("YoungSerif-Regular.ttf", 144), fill=INK)
    d.text((195, 430), "Choose the mark that should guide the next version of the website.", font=font("WorkSans-Regular.ttf", 48), fill=MUTED)
    d.line((190, 545, 2810, 545), fill="#D7D0C2", width=4)

    names = [
        ("01", "TABLE COMPASS", "warm · editorial · guided"),
        ("02", "PANTRY MONOGRAM", "bold · memorable · premium"),
        ("03", "OPEN PANTRY", "clear · welcoming · product-led"),
        ("04", "FLAME ROUTE", "culinary · expressive · crafted"),
        ("05", "KITCHEN SIGNAL", "smart · precise · agentic"),
    ]
    y0, row_h = 610, 708
    for i, (logo, meta) in enumerate(zip(logos, names)):
        y = y0 + i * row_h
        d.rounded_rectangle((150, y, 2850, y + 620), radius=54, fill=PAPER, outline="#E1DACD", width=3)
        number, name, note = meta
        d.text((220, y + 60), number, font=font("DMMono-Regular.ttf", 48), fill=TOMATO)
        d.text((220, y + 130), name, font=font("WorkSans-Bold.ttf", 43), fill=INK)
        d.text((220, y + 188), note.upper(), font=font("WorkSans-Regular.ttf", 25), fill=MUTED)
        preview = logo.resize((2100, 840), Image.Resampling.LANCZOS)
        alpha = preview.getchannel("A")
        bbox = alpha.getbbox()
        if bbox:
            preview = preview.crop(bbox)
            max_w, max_h = 2240, 380
            ratio = min(max_w / preview.width, max_h / preview.height)
            preview = preview.resize((int(preview.width * ratio), int(preview.height * ratio)), Image.Resampling.LANCZOS)
            px = 220 + (2520 - preview.width) // 2
            py = y + 220 + (360 - preview.height) // 2
            img.paste(preview, (px, py), preview)

    d.text((190, 4182), "PANTRY → PLAN → PLATE", font=font("DMMono-Regular.ttf", 28), fill=BASIL)
    d.text((2810, 4182), "2026", anchor="ra", font=font("DMMono-Regular.ttf", 28), fill=MUTED)
    path = ROOT / "pantrypilot-logo-variants.png"
    img.save(path, dpi=(300, 300), optimize=True)
    return path


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    logos = [logo_01(), logo_02(), logo_03(), logo_04(), logo_05()]
    slugs = [
        "01-table-compass",
        "02-pantry-monogram",
        "03-open-pantry",
        "04-flame-route",
        "05-kitchen-signal",
    ]
    for logo, slug in zip(logos, slugs):
        save_logo(logo, slug)
    comparison(logos)


if __name__ == "__main__":
    main()
