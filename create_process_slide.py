"""
Generate a BCG/McKinsey-style process flow slide with findings.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# --- Constants ---
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

# Color palette (dark, muted consulting style)
DARK_NAVY = RGBColor(0x1B, 0x2A, 0x4A)
MEDIUM_BLUE = RGBColor(0x2C, 0x5F, 0x8A)
ACCENT_BLUE = RGBColor(0x3A, 0x7C, 0xBD)
LIGHT_BLUE_BG = RGBColor(0xE8, 0xF0, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK_GRAY = RGBColor(0x33, 0x33, 0x33)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
FINDING_RED = RGBColor(0xC0, 0x39, 0x2B)
FINDING_BG = RGBColor(0xFD, 0xF2, 0xF0)
ARROW_GRAY = RGBColor(0xB0, 0xB8, 0xC4)
BORDER_LINE = RGBColor(0xD5, 0xDB, 0xE1)
CONNECTOR_RED = RGBColor(0xE7, 0x6F, 0x51)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H

slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank layout

# --- Background ---
bg = slide.background
fill = bg.fill
fill.solid()
fill.fore_color.rgb = WHITE


def add_rounded_rect(slide, left, top, width, height, fill_color, border_color=None, border_width=Pt(0)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = border_width
    else:
        shape.line.fill.background()
    # Smaller corner radius
    shape.adjustments[0] = 0.08
    return shape


def add_text_box(slide, left, top, width, height, text, font_size=10, font_color=DARK_GRAY, bold=False, alignment=PP_ALIGN.LEFT, font_name="Calibri"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox


def add_arrow(slide, left, top, width, height):
    """Add a right-pointing chevron arrow."""
    shape = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = ARROW_GRAY
    shape.line.fill.background()
    shape.rotation = 0
    return shape


# ============================================================
# HEADER SECTION
# ============================================================
# Top accent line
accent_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_W, Inches(0.06))
accent_line.fill.solid()
accent_line.fill.fore_color.rgb = DARK_NAVY
accent_line.line.fill.background()

# Title
add_text_box(slide, Inches(0.7), Inches(0.25), Inches(10), Inches(0.55),
             "Processkarta: Inköp-till-betalning (P2P)", font_size=22, font_color=DARK_NAVY, bold=True)

# Subtitle
add_text_box(slide, Inches(0.7), Inches(0.72), Inches(10), Inches(0.35),
             "Identifierade findings och deras koppling till processflödet", font_size=12, font_color=MED_GRAY)

# Thin separator line
sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), Inches(1.1), Inches(11.93), Pt(1))
sep.fill.solid()
sep.fill.fore_color.rgb = BORDER_LINE
sep.line.fill.background()

# ============================================================
# PROCESS FLOW (horizontal chain)
# ============================================================
process_steps = [
    "Behov\nuppstår",
    "Upphandling\n/ avtal",
    "Beställning",
    "Mottagning",
    "Faktura",
    "Attest",
    "Betalning",
    "Uppföljning",
]

num_steps = len(process_steps)
flow_top = Inches(1.45)
step_w = Inches(1.22)
step_h = Inches(0.72)
arrow_w = Inches(0.32)
arrow_h = Inches(0.28)
total_flow_w = num_steps * step_w + (num_steps - 1) * arrow_w
flow_left_start = (SLIDE_W - total_flow_w) / 2

step_positions = []  # store (left_center, right_edge) for connector drawing

for i, step_text in enumerate(process_steps):
    x = flow_left_start + i * (step_w + arrow_w)

    # Step box
    box = add_rounded_rect(slide, x, flow_top, step_w, step_h, DARK_NAVY, border_color=None)
    box.adjustments[0] = 0.12
    tf = box.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    p = tf.paragraphs[0]
    p.text = step_text
    p.font.size = Pt(9)
    p.font.color.rgb = WHITE
    p.font.bold = True
    p.font.name = "Calibri"
    # Vertical center
    from pptx.oxml.ns import qn
    txBody = tf._txBody
    bodyPr = txBody.find(qn('a:bodyPr'))
    bodyPr.set('anchor', 'ctr')

    center_x = x + step_w / 2
    step_positions.append((x, center_x, x + step_w))

    # Arrow between steps
    if i < num_steps - 1:
        arrow_x = x + step_w + Emu(2000)
        arrow_y = flow_top + (step_h - arrow_h) / 2
        arr = add_arrow(slide, arrow_x, arrow_y, arrow_w - Emu(4000), arrow_h)


# ============================================================
# STEP NUMBER LABELS (1-8 beneath process boxes)
# ============================================================
for i in range(num_steps):
    x = step_positions[i][0]
    num_label = add_text_box(slide, x, flow_top + step_h + Inches(0.02), step_w, Inches(0.2),
                              str(i + 1), font_size=7, font_color=MED_GRAY, alignment=PP_ALIGN.CENTER)


# ============================================================
# FINDINGS SECTION
# ============================================================
findings = [
    {
        "title": "Ingen styrd väg från behov till köp",
        "steps": (0, 2),  # Behov → Beställning (indices 0-2)
        "desc": "Det finns en ingång för behov, men inte ett styrt beställningsflöde som leder till rätt leverantör, rätt avtal och rätt pris.",
        "num": "1",
    },
    {
        "title": "Svagt stöd för köp på avtal",
        "steps": (1, 2),  # Upphandling → Beställning
        "desc": "Det är svårt att hitta och använda rätt avtal i vardagen, vilket driver köp utanför avtal.",
        "num": "2",
    },
    {
        "title": "Splittrad avtals- och leverantörsinformation",
        "steps": (1, 7),  # Upphandling → Uppföljning (spanning wide)
        "desc": "Ingen sammanhållen koppling mellan inköp, avtal och ekonomi försvårar spårbarhet och uppföljning.",
        "num": "3",
    },
    {
        "title": "Manuella och svårt överblickbara arbetsflöden",
        "steps": (2, 6),  # Beställning → Betalning
        "desc": "Excel, mejl, Teams och personberoende arbetssätt försvårar översikt, status och skalbarhet.",
        "num": "4",
    },
    {
        "title": "Otydliga ansvar och varierande arbetssätt",
        "steps": (3, 7),  # Mottagning → Uppföljning
        "desc": "Roller arbetar olika och ansvar är inte alltid tydligt definierade, vilket försvårar återkoppling och konsekvent hantering.",
        "num": "5",
    },
    {
        "title": "Kontrollen kommer först vid fakturan",
        "steps": (4, 7),  # Faktura → Uppföljning
        "desc": "Avvikelser och fel upptäcks sent, vilket gör kontrollen reaktiv och försvårar internkontroll och tidig felupptäckt.",
        "num": "6",
    },
    {
        "title": "Splittrad data för budget, prognos och uppföljning",
        "steps": (7, 7),  # Uppföljning only
        "desc": "Utfall, personal, verksamhet och planering finns i flera system och i Excel, vilket försvårar analys, prognoser och scenarier.",
        "num": "7",
    },
]

# Layout: finding cards span the width of the relevant process steps
findings_start_y = Inches(2.45)
finding_row_h = Inches(0.58)
finding_gap = Inches(0.08)

# Number circle left margin
NUM_MARGIN_LEFT = Inches(0.25)
num_circle_size = Inches(0.32)

for idx, f in enumerate(findings):
    y = findings_start_y + idx * (finding_row_h + finding_gap)
    start_step = f["steps"][0]
    end_step = f["steps"][1]

    # Card spans from left edge of first step to right edge of last step
    card_left = step_positions[start_step][0]
    card_right = step_positions[end_step][2]
    card_width = card_right - card_left
    card_h = finding_row_h

    # Finding card (the card width itself shows which steps are covered)
    card = add_rounded_rect(slide, card_left, y, card_width, card_h,
                            LIGHT_GRAY, border_color=DARK_NAVY, border_width=Pt(1.2))
    card.adjustments[0] = 0.06

    # Number circle (positioned to the left of the card, in the margin)
    num_x = NUM_MARGIN_LEFT
    num_y = y + (card_h - num_circle_size) / 2

    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, num_x, num_y, num_circle_size, num_circle_size)
    circle.fill.solid()
    circle.fill.fore_color.rgb = DARK_NAVY
    circle.line.fill.background()
    tf = circle.text_frame
    tf.paragraphs[0].text = f["num"]
    tf.paragraphs[0].font.size = Pt(10)
    tf.paragraphs[0].font.color.rgb = WHITE
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].font.name = "Calibri"
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    bodyPr = tf._txBody.find(qn('a:bodyPr'))
    bodyPr.set('anchor', 'ctr')
    bodyPr.set('lIns', '0')
    bodyPr.set('rIns', '0')
    bodyPr.set('tIns', '0')
    bodyPr.set('bIns', '0')

    # Text inside card: title (bold) + description
    inner_pad = Inches(0.15)
    text_left = card_left + inner_pad
    text_top = y + Inches(0.06)
    text_h = card_h - Inches(0.12)

    # For narrow cards, stack title above description
    # For wide cards, title left + description right
    if card_width < Inches(4.0):
        # Narrow card: title and desc stacked vertically inside
        txBox = slide.shapes.add_textbox(text_left, text_top, card_width - 2 * inner_pad, text_h)
        tf = txBox.text_frame
        tf.word_wrap = True
        # Title paragraph
        p1 = tf.paragraphs[0]
        p1.text = f["title"]
        p1.font.size = Pt(9)
        p1.font.color.rgb = DARK_NAVY
        p1.font.bold = True
        p1.font.name = "Calibri"
        p1.space_after = Pt(2)
        # Description paragraph
        p2 = tf.add_paragraph()
        p2.text = f["desc"]
        p2.font.size = Pt(7.5)
        p2.font.color.rgb = MED_GRAY
        p2.font.name = "Calibri"
    else:
        # Wide card: title left, description right
        title_w = min(Inches(3.6), card_width * 0.35)
        tb = add_text_box(slide, text_left, text_top, title_w, text_h,
                           f["title"], font_size=9, font_color=DARK_NAVY, bold=True)

        desc_left = text_left + title_w + Inches(0.15)
        desc_w = card_width - title_w - 2 * inner_pad - Inches(0.15)
        tb2 = add_text_box(slide, desc_left, text_top, desc_w, text_h,
                            f["desc"], font_size=8, font_color=MED_GRAY)


# ============================================================
# FOOTER
# ============================================================
footer_y = Inches(7.1)
sep2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), footer_y, Inches(11.93), Pt(0.75))
sep2.fill.solid()
sep2.fill.fore_color.rgb = BORDER_LINE
sep2.line.fill.background()

add_text_box(slide, Inches(0.7), footer_y + Inches(0.05), Inches(4), Inches(0.25),
             "Konfidentiellt  |  Processkartläggning P2P", font_size=7, font_color=MED_GRAY)

add_text_box(slide, Inches(10.5), footer_y + Inches(0.05), Inches(2.2), Inches(0.25),
             "Källa: Intern analys", font_size=7, font_color=MED_GRAY, alignment=PP_ALIGN.RIGHT)


# ============================================================
# SAVE
# ============================================================
output_path = "/home/user/coachcraft-app/P2P_Processkarta_Findings.pptx"
prs.save(output_path)
print(f"Saved to {output_path}")
