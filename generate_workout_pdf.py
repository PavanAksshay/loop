import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#7A97B0"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "LOOP FITNESS | 10-SLOT INTELLIGENT WORKOUT ARCHITECTURE (2026)")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — LOOP FITNESS TRAINING ECOSYSTEM")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def create_report(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    
    c_primary = colors.HexColor("#0B2238")
    c_accent = colors.HexColor("#1B6E99")
    c_subtext = colors.HexColor("#486581")
    c_card_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=c_primary, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=c_accent, spaceAfter=10
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=c_primary, spaceBefore=10, spaceAfter=4
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=c_accent, spaceBefore=6, spaceAfter=3
    )
    body_style = ParagraphStyle(
        'Body_Custom', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12, textColor=c_subtext, spaceAfter=4
    )
    cell_style = ParagraphStyle(
        'Cell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=9.5, textColor=c_primary
    )
    cell_header = ParagraphStyle(
        'CellHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white
    )

    story = []

    # Title Banner
    story.append(Paragraph("LOOP FITNESS — INTELLIGENT WORKOUT SYSTEM", title_style))
    story.append(Paragraph("Upgraded 10-Exercise Slot Architecture, Dynamic Rest Periods & 24 Workout Catalog (ACSM 2026)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=0, spaceAfter=8))

    # Architecture Overview
    story.append(Paragraph("1. Core Programming Principles & 10-Slot Block Architecture", h1_style))
    story.append(Paragraph(
        "Loop Fitness is upgraded from fixed-rest circuits to an evidence-based <b>10-Slot Intelligent Training System</b>. "
        "Each session contains exactly 10 distinct movement slots distributed across 6 periodized blocks without redundant overlap: "
        "<b>Block 1:</b> Primary Compound (2 slots), <b>Block 2:</b> Superset A1+A2 (2 slots, 15s transition + 60s recovery), "
        "<b>Block 3:</b> Superset B1+B2 (2 slots), <b>Block 4:</b> Accessories (2 slots), <b>Block 5:</b> Core & Anti-Rotation (1 slot), "
        "and <b>Block 6:</b> High-Output Finisher (1 slot). Rest is context-aware: 90-180s for heavy strength, 60-90s for superset pairs, 30-45s for accessories, and work:rest ratios for conditioning.",
        body_style
    ))

    # 24 Catalog Summary Table
    story.append(Paragraph("2. Complete 24 Workout Plan Directory", h1_style))
    catalog_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Plan Title</b>", cell_header), Paragraph("<b>Level & Goal</b>", cell_header), Paragraph("<b>Structure (10 Slots)</b>", cell_header), Paragraph("<b>Target Equipment</b>", cell_header), Paragraph("<b>Duration / Burn</b>", cell_header)],
        [Paragraph("01", cell_style), Paragraph("Beginner Upper Day", cell_style), Paragraph("L1 • General Fitness", cell_style), Paragraph("Push/Pull compounds + Bi/Tri supersets", cell_style), Paragraph("Bodyweight, Chair, Band", cell_style), Paragraph("35 Min • 220 Kcal", cell_style)],
        [Paragraph("02", cell_style), Paragraph("Beginner Lower Day", cell_style), Paragraph("L1 • General Fitness", cell_style), Paragraph("Squat, Hinge, Step-up & Core Base", cell_style), Paragraph("Bodyweight, Chair", cell_style), Paragraph("35 Min • 240 Kcal", cell_style)],
        [Paragraph("03", cell_style), Paragraph("Intermediate Push Day", cell_style), Paragraph("L2 • Muscle Gain", cell_style), Paragraph("Chest mass, 3D Shoulders & Triceps", cell_style), Paragraph("Dumbbells, Bodyweight", cell_style), Paragraph("42 Min • 340 Kcal", cell_style)],
        [Paragraph("04", cell_style), Paragraph("Intermediate Pull Day", cell_style), Paragraph("L2 • Muscle Gain", cell_style), Paragraph("V-Taper Lats, Rows, Biceps & Erectors", cell_style), Paragraph("Pull-up Bar, DBs, Bands", cell_style), Paragraph("42 Min • 330 Kcal", cell_style)],
        [Paragraph("05", cell_style), Paragraph("Intermediate Legs Day", cell_style), Paragraph("L2 • Muscle Gain", cell_style), Paragraph("Goblet Squats, Bulgarians, RDLs", cell_style), Paragraph("Dumbbells, Chair", cell_style), Paragraph("45 Min • 380 Kcal", cell_style)],
        [Paragraph("06", cell_style), Paragraph("Advanced Chest Day", cell_style), Paragraph("L3 • Muscle Gain", cell_style), Paragraph("Weighted Push-Ups, Decline, DB Floor Press", cell_style), Paragraph("Backpack, DBs, Bands", cell_style), Paragraph("45 Min • 390 Kcal", cell_style)],
        [Paragraph("07", cell_style), Paragraph("Advanced Back Day", cell_style), Paragraph("L3 • Muscle Gain", cell_style), Paragraph("Wide Pull-Ups, Close Chins, DB Rows", cell_style), Paragraph("Pull-up Bar, Heavy DBs", cell_style), Paragraph("45 Min • 380 Kcal", cell_style)],
        [Paragraph("08", cell_style), Paragraph("Advanced Legs Day", cell_style), Paragraph("L3 • Muscle Gain", cell_style), Paragraph("Heavy Squats, Nordic Negatives, RDLs", cell_style), Paragraph("Heavy Load, Couch Anchor", cell_style), Paragraph("48 Min • 440 Kcal", cell_style)],
        [Paragraph("09", cell_style), Paragraph("Advanced Shoulders Day", cell_style), Paragraph("L3 • Muscle Gain", cell_style), Paragraph("Elevated Pike, Arnold Press, Delts", cell_style), Paragraph("Chair, Dumbbells", cell_style), Paragraph("42 Min • 340 Kcal", cell_style)],
        [Paragraph("10", cell_style), Paragraph("Advanced Arms Day", cell_style), Paragraph("L3 • Muscle Gain", cell_style), Paragraph("Antagonist Bicep/Tricep supersets", cell_style), Paragraph("Dumbbells, Pull-up Bar", cell_style), Paragraph("40 Min • 320 Kcal", cell_style)],
        [Paragraph("11", cell_style), Paragraph("Core & Conditioning", cell_style), Paragraph("L3 • Conditioning", cell_style), Paragraph("Weighted Plank, Leg Raises, Burpees", cell_style), Paragraph("Bodyweight, Backpack", cell_style), Paragraph("36 Min • 320 Kcal", cell_style)],
        [Paragraph("12", cell_style), Paragraph("Full Body Foundation", cell_style), Paragraph("L1 • General Fitness", cell_style), Paragraph("5 Fundamental patterns full body", cell_style), Paragraph("Bodyweight, Chair", cell_style), Paragraph("38 Min • 260 Kcal", cell_style)],
        [Paragraph("13", cell_style), Paragraph("Full Body Strength", cell_style), Paragraph("L2 • Strength", cell_style), Paragraph("Heavy compound squat, push, row, hinge", cell_style), Paragraph("Dumbbells, Backpack", cell_style), Paragraph("45 Min • 360 Kcal", cell_style)],
        [Paragraph("14", cell_style), Paragraph("Full Body Hypertrophy", cell_style), Paragraph("L2 • Muscle Gain", cell_style), Paragraph("Target volume, tempo & peak tension", cell_style), Paragraph("Dumbbells, Bands", cell_style), Paragraph("44 Min • 350 Kcal", cell_style)],
        [Paragraph("15", cell_style), Paragraph("Upper/Lower Hybrid", cell_style), Paragraph("L2 • Hybrid Fitness", cell_style), Paragraph("Upper strength + lower plyometrics", cell_style), Paragraph("Dumbbells, Bodyweight", cell_style), Paragraph("42 Min • 370 Kcal", cell_style)],
        [Paragraph("16", cell_style), Paragraph("Athletic Performance", cell_style), Paragraph("L3 • Athletic Power", cell_style), Paragraph("Jump squats, skater bounds, agility", cell_style), Paragraph("Bodyweight, Pull-up Bar", cell_style), Paragraph("40 Min • 400 Kcal", cell_style)],
        [Paragraph("17", cell_style), Paragraph("Functional Fitness", cell_style), Paragraph("L2 • General Fitness", cell_style), Paragraph("Carries, step-ups, floor press, posture", cell_style), Paragraph("Dumbbells, Chair", cell_style), Paragraph("40 Min • 310 Kcal", cell_style)],
        [Paragraph("18", cell_style), Paragraph("Calisthenics Mastery", cell_style), Paragraph("L3 • Strength", cell_style), Paragraph("Bodyweight levers, dips, pull-ups", cell_style), Paragraph("Pull-up Bar, Floor", cell_style), Paragraph("44 Min • 350 Kcal", cell_style)],
        [Paragraph("19", cell_style), Paragraph("Home DB Strength", cell_style), Paragraph("L2 • Strength", cell_style), Paragraph("Full dumbbell overload & hypertrophy", cell_style), Paragraph("Dumbbells", cell_style), Paragraph("44 Min • 340 Kcal", cell_style)],
        [Paragraph("20", cell_style), Paragraph("Fat-Loss Conditioning", cell_style), Paragraph("L2 • Fat Loss", cell_style), Paragraph("High-density EPOC metabolic circuit", cell_style), Paragraph("Bodyweight", cell_style), Paragraph("36 Min • 390 Kcal", cell_style)],
        [Paragraph("21", cell_style), Paragraph("Mobility + Core", cell_style), Paragraph("L1 • Mobility", cell_style), Paragraph("Thoracic, 90/90 hip flow & deep core", cell_style), Paragraph("Bodyweight", cell_style), Paragraph("30 Min • 180 Kcal", cell_style)],
        [Paragraph("22", cell_style), Paragraph("Minimal Equipment", cell_style), Paragraph("L1 • General Fitness", cell_style), Paragraph("Zero gear chair & floor express", cell_style), Paragraph("Chair, Floor", cell_style), Paragraph("34 Min • 250 Kcal", cell_style)],
        [Paragraph("23", cell_style), Paragraph("Resistance Band Power", cell_style), Paragraph("L2 • Muscle Gain", cell_style), Paragraph("Elastic resistance variable hypertrophy", cell_style), Paragraph("Resistance Bands", cell_style), Paragraph("38 Min • 290 Kcal", cell_style)],
        [Paragraph("24", cell_style), Paragraph("Hybrid Athlete", cell_style), Paragraph("L3 • Hybrid Fitness", cell_style), Paragraph("Compound strength + high pacing engine", cell_style), Paragraph("Dumbbells, Pull-up Bar", cell_style), Paragraph("45 Min • 420 Kcal", cell_style)],
    ]

    t_cat = Table(catalog_data, colWidths=[18, 115, 85, 145, 95, 64])
    t_cat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_cat)
    story.append(Spacer(1, 10))

    # Page Break for Detailed 10-Slot Examples
    story.append(PageBreak())

    # Detailed 10-Slot Routine Breakdowns
    story.append(Paragraph("3. Detailed 10-Slot Workout Architecture Samples", h1_style))
    story.append(Paragraph("<b>Sample A: Beginner Upper Body Day (Level 1 • Weeks 1–4)</b>", h2_style))
    
    ex_l1_data = [
        [Paragraph("<b>Slot #</b>", cell_header), Paragraph("<b>Block Category</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>RPE / Tempo</b>", cell_header), Paragraph("<b>Rest Interval</b>", cell_header)],
        [Paragraph("Slot 01", cell_style), Paragraph("Primary Push", cell_style), Paragraph("Incline Push-Ups (Hands Elevated)", cell_style), Paragraph("3 × 10-12", cell_style), Paragraph("RPE 6-7 | 3-0-1-0", cell_style), Paragraph("75s Rest", cell_style)],
        [Paragraph("Slot 02", cell_style), Paragraph("Primary Pull", cell_style), Paragraph("Chair-Supported Rows (Towel/Band)", cell_style), Paragraph("3 × 10-12", cell_style), Paragraph("RPE 6-7 | 2-1-1-0", cell_style), Paragraph("75s Rest", cell_style)],
        [Paragraph("Slot 03", cell_style), Paragraph("Superset A1", cell_style), Paragraph("Incline Pike Push-Ups", cell_style), Paragraph("3 × 8-10", cell_style), Paragraph("RPE 7 | 2-1-1-0", cell_style), Paragraph("15s (To A2)", cell_style)],
        [Paragraph("Slot 04", cell_style), Paragraph("Superset A2", cell_style), Paragraph("Resistance Band Pull-Aparts", cell_style), Paragraph("3 × 15", cell_style), Paragraph("RPE 7-8 | 1-1-1-1", cell_style), Paragraph("60s (After Pair)", cell_style)],
        [Paragraph("Slot 05", cell_style), Paragraph("Superset B1", cell_style), Paragraph("Dumbbell / Band Bicep Curls", cell_style), Paragraph("2 × 10-12", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("15s (To B2)", cell_style)],
        [Paragraph("Slot 06", cell_style), Paragraph("Superset B2", cell_style), Paragraph("Overhead Triceps Extension", cell_style), Paragraph("2 × 12", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("60s (After Pair)", cell_style)],
        [Paragraph("Slot 07", cell_style), Paragraph("Accessory", cell_style), Paragraph("Lateral Raises (Dumbbells/Band)", cell_style), Paragraph("2 × 12-15", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("45s Rest", cell_style)],
        [Paragraph("Slot 08", cell_style), Paragraph("Postural", cell_style), Paragraph("Prone Reverse Snow Angels", cell_style), Paragraph("2 × 12", cell_style), Paragraph("RPE 6 | 3-1-3-0", cell_style), Paragraph("45s Rest", cell_style)],
        [Paragraph("Slot 09", cell_style), Paragraph("Core Stability", cell_style), Paragraph("Dead Bug (Deep Transverse Abs)", cell_style), Paragraph("2 × 8 / Side", cell_style), Paragraph("RPE 6-7 | 2-1-2-0", cell_style), Paragraph("45s Rest", cell_style)],
        [Paragraph("Slot 10", cell_style), Paragraph("Finisher", cell_style), Paragraph("Jumping Jacks (Aerobic Burn)", cell_style), Paragraph("2 × 40s", cell_style), Paragraph("RPE 7 | Interval", cell_style), Paragraph("30s Rest", cell_style)],
    ]
    t_ex_l1 = Table(ex_l1_data, colWidths=[38, 75, 160, 70, 95, 84])
    t_ex_l1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_ex_l1)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Sample B: Intermediate Push Day (Level 2 • Weeks 5–8+)</b>", h2_style))
    ex_l2_data = [
        [Paragraph("<b>Slot #</b>", cell_header), Paragraph("<b>Block Category</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>RPE / Tempo</b>", cell_header), Paragraph("<b>Rest Interval</b>", cell_header)],
        [Paragraph("Slot 01", cell_style), Paragraph("Primary Push", cell_style), Paragraph("Standard Push-Ups (Weighted Option)", cell_style), Paragraph("3 × 12-15", cell_style), Paragraph("RPE 7-8 | 2-0-1-0", cell_style), Paragraph("90s Rest", cell_style)],
        [Paragraph("Slot 02", cell_style), Paragraph("Vertical Push", cell_style), Paragraph("DB / Backpack Overhead Press", cell_style), Paragraph("3 × 10-12", cell_style), Paragraph("RPE 7-8 | 2-0-1-0", cell_style), Paragraph("90s Rest", cell_style)],
        [Paragraph("Slot 03", cell_style), Paragraph("Superset A1", cell_style), Paragraph("Dumbbell Floor Press", cell_style), Paragraph("3 × 10-12", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("15s (To A2)", cell_style)],
        [Paragraph("Slot 04", cell_style), Paragraph("Superset A2", cell_style), Paragraph("Lateral Raises (Side Delts)", cell_style), Paragraph("3 × 12-15", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("60s (After Pair)", cell_style)],
        [Paragraph("Slot 05", cell_style), Paragraph("Superset B1", cell_style), Paragraph("Diamond Push-Ups (Triceps)", cell_style), Paragraph("3 × 8-10", cell_style), Paragraph("RPE 8 | 3-0-1-0", cell_style), Paragraph("15s (To B2)", cell_style)],
        [Paragraph("Slot 06", cell_style), Paragraph("Superset B2", cell_style), Paragraph("Hex / Squeeze Press (Inner Pecs)", cell_style), Paragraph("2 × 12", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("60s (After Pair)", cell_style)],
        [Paragraph("Slot 07", cell_style), Paragraph("Triceps", cell_style), Paragraph("Overhead Triceps Extension", cell_style), Paragraph("2 × 12", cell_style), Paragraph("RPE 8 | 2-1-1-0", cell_style), Paragraph("60s Rest", cell_style)],
        [Paragraph("Slot 08", cell_style), Paragraph("Scapular", cell_style), Paragraph("Prone Reverse Snow Angels", cell_style), Paragraph("2 × 12", cell_style), Paragraph("RPE 6 | 3-1-3-0", cell_style), Paragraph("45s Rest", cell_style)],
        [Paragraph("Slot 09", cell_style), Paragraph("Anti-Rotation", cell_style), Paragraph("Plank Shoulder Taps", cell_style), Paragraph("2 × 10 / Side", cell_style), Paragraph("RPE 7 | 2-1-2-0", cell_style), Paragraph("45s Rest", cell_style)],
        [Paragraph("Slot 10", cell_style), Paragraph("HIIT Finisher", cell_style), Paragraph("Mountain Climbers", cell_style), Paragraph("2 × 30s", cell_style), Paragraph("RPE 8-9 | Interval", cell_style), Paragraph("30s Rest", cell_style)],
    ]
    t_ex_l2 = Table(ex_l2_data, colWidths=[38, 75, 160, 70, 95, 84])
    t_ex_l2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_ex_l2)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Upgraded 10-Slot PDF report successfully written to {output_path}")

if __name__ == "__main__":
    out = "/Users/pavanaksshay/WalkBuddy/Loop_Workout_Program_Comprehensive_Report.pdf"
    create_report(out)
