import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
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
            self.drawString(54, 750, "LOOP FITNESS | HOME WORKOUT PROGRAM SPECIFICATION & EXERCISE DIRECTORY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — LOOP FITNESS ECOSYSTEM")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def create_report(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0B2238")
    c_accent = colors.HexColor("#1B6E99")
    c_accent_light = colors.HexColor("#EAF3F9")
    c_subtext = colors.HexColor("#486581")
    c_card_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#CBD5E1")
    c_highlight = colors.HexColor("#FF7043")

    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_accent,
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_subtext,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=c_primary
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    cell_style = ParagraphStyle(
        'Cell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_primary
    )

    cell_header = ParagraphStyle(
        'CellHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    # Title Banner
    story.append(Paragraph("LOOP FITNESS — WORKOUT SECTION", title_style))
    story.append(Paragraph("Comprehensive Program Specification, Exercise Directory & Progression Architecture", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceBefore=0, spaceAfter=12))

    # Executive Overview
    story.append(Paragraph("1. Executive Summary & Program Structure", h1_style))
    story.append(Paragraph(
        "The Loop Home Workout architecture is organized into a <b>progressive 3-tier periodized system</b>. "
        "It supports both <b>weekly schedules</b> (the active rotation of workouts within a given 7-day week) and <b>month-wise macrocycles</b> (4-week blocks transitioning from anatomical adaptation to functional hypertrophy and single-muscle specialization).",
        body_style
    ))

    # Structure Table: Weekly vs Month-Wise
    sched_data = [
        [
            Paragraph("<b>Tier / Phase</b>", cell_header),
            Paragraph("<b>Month-Wise Macrocycle</b>", cell_header),
            Paragraph("<b>Weekly Schedule Split</b>", cell_header),
            Paragraph("<b>Target Goal & Focus</b>", cell_header)
        ],
        [
            Paragraph("<b>Level 1<br/>Beginner</b>", cell_style),
            Paragraph("<b>Month 1</b><br/>(Weeks 1–4)", cell_style),
            Paragraph("<b>Upper / Lower Split</b><br/>• Day 1: Upper Body<br/>• Day 2: Rest / Light Walk<br/>• Day 3: Lower Body<br/>• Day 4: Rest<br/>• Day 5: Upper Body<br/>• Day 6: Lower Body<br/>• Day 7: Rest", cell_style),
            Paragraph("Anatomical adaptation, master 5 fundamental movement patterns (push, pull, squat, hinge, brace) in 3-round circuits.", cell_style)
        ],
        [
            Paragraph("<b>Level 2<br/>Intermediate</b>", cell_style),
            Paragraph("<b>Month 2</b><br/>(Weeks 5–8+)", cell_style),
            Paragraph("<b>Push / Pull / Legs Split</b><br/>• Day 1: Push Day<br/>• Day 2: Pull Day<br/>• Day 3: Legs Day<br/>• Day 4: Active Recovery<br/>• Day 5: Push/Pull Day<br/>• Day 6: Legs / Core<br/>• Day 7: Rest", cell_style),
            Paragraph("Functional muscle grouping, progressive overload with external resistance (dumbbells/backpack/bands), hypertrophy volume.", cell_style)
        ],
        [
            Paragraph("<b>Level 3<br/>Advanced</b>", cell_style),
            Paragraph("<b>Month 3+</b><br/>(Weeks 9+)", cell_style),
            Paragraph("<b>Single-Muscle Dedicated Split</b><br/>• Day 1: Chest Specialization<br/>• Day 2: Back & Lats<br/>• Day 3: Advanced Legs<br/>• Day 4: 3D Shoulders<br/>• Day 5: Arms (Bi/Tri)<br/>• Day 6: Core & Conditioning<br/>• Day 7: Full Rest", cell_style),
            Paragraph("Maximum focused volume per muscle group, high-intensity density, unilateral stability, 3-round power & endurance circuits.", cell_style)
        ]
    ]

    t_sched = Table(sched_data, colWidths=[65, 95, 175, 169])
    t_sched.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_sched)
    story.append(Spacer(1, 12))

    # Workout Completion & Next Action Behavior
    story.append(Paragraph("2. User Completion Flow & 'What Happens Next?'", h1_style))
    story.append(Paragraph(
        "<b>Does the user repeat the exercise for the next month, or does the app guide them to what is next?</b>",
        body_bold
    ))
    story.append(Paragraph(
        "1. <b>Immediate Post-Workout Response:</b> Upon finishing the final exercise of the 3rd circuit round, the app triggers a celebration audio chime and launches the <i>Workout Completed Modal</i>. It automatically compiles and records session metrics: total sets completed (e.g. 15 sets), active duration (e.g. 25–40 mins), score percentage, increments <code>workouts_completed</code> count, adds active minutes, and updates the consecutive daily streak.<br/>"
        "2. <b>Daily Progression & Next Session Guidance:</b> When the user returns to the Workout Dashboard, the app dynamically reflects their updated daily progress on the <b>Triple Circular Activity Rings</b> (Calories, Active Time, Sets Hit). The Dashboard showcases the upcoming scheduled workout for the week (e.g., following the weekly schedule from Upper to Lower Body).<br/>"
        "3. <b>Microcycle (Weekly) vs Macrocycle (Monthly) Progression:</b><br/>"
        "&nbsp;&nbsp;• <b>Within Month 1 (Weeks 1–4):</b> The user repeats the foundational Upper & Lower routines across their weekly scheduled days, but applies <i>Progressive Overload Toolkit</i>: aiming for cleaner reps, slowing the eccentric tempo (e.g. 3-second descent), or shortening rest intervals.<br/>"
        "&nbsp;&nbsp;• <b>Transition to Month 2 (Level 2):</b> Per the built-in <i>Level-Up Checklist</i>, once all Beginner exercises are completed with pristine form for 2 consecutive sessions (~4 weeks), the user is promoted to Level 2 (Push/Pull/Legs).<br/>"
        "&nbsp;&nbsp;• <b>Transition to Month 3+ (Level 3):</b> After 4 weeks in Level 2 with added resistance, the user advances to the 6-day dedicated single-muscle split.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # Page Break for the Exercise Directory
    story.append(PageBreak())

    # LEVEL 1 DETAILED DIRECTORY
    story.append(Paragraph("3. Level 1: Beginner Workouts (Weeks 1–4 / Month 1)", h1_style))
    story.append(Paragraph("<b>Split Structure:</b> 3 Rounds per Routine | 45s Rest between exercises | 15 Working Sets & 15 Rest Breaks per session.", body_style))
    story.append(Spacer(1, 4))

    # L1 Upper Table
    story.append(Paragraph("<b>Routine A: Beginner Upper Body Day</b> (25 Min | 220 Kcal | Days 1 & 5)", h2_style))
    l1_upper_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Incline / Knee Push-Ups", cell_style), Paragraph("Pectorals, Anterior Deltoids, Triceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("3s slow descent, 1s explosive push", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Chair-Supported Rows", cell_style), Paragraph("Rhomboids, Latissimus Dorsi, Biceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("1s scapular squeeze at contraction", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Wall / Incline Pike Push-Ups", cell_style), Paragraph("Anterior/Lateral Delts, Upper Traps", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Inverted V-shape; deltoid drive", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Standing Overhead Press", cell_style), Paragraph("Deltoids, Triceps, Serratus", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Brace glutes and core; avoid arching", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Plank Shoulder Taps", cell_style), Paragraph("Transverse Abs, Obliques, Shoulders", cell_style), Paragraph("3 Sets × 10 Reps/Side", cell_style), Paragraph("45s rest", cell_style), Paragraph("Anti-rotational; hips locked square", cell_style)]
    ]
    t_l1_u = Table(l1_upper_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l1_u.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l1_u)
    story.append(Spacer(1, 8))

    # L1 Lower Table
    story.append(Paragraph("<b>Routine B: Beginner Lower Body Day</b> (25 Min | 240 Kcal | Days 3 & 6)", h2_style))
    l1_lower_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Bodyweight Squats", cell_style), Paragraph("Quadriceps, Gluteus Max, Adductors", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Full depth, knees tracking over toes", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Chair Reverse Lunges", cell_style), Paragraph("Glutes, Quads, Hamstrings", cell_style), Paragraph("3 Sets × 10 Reps/Leg", cell_style), Paragraph("45s rest", cell_style), Paragraph("Lower to 90 deg; torso upright", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Glute Bridges", cell_style), Paragraph("Gluteus Maximus, Hamstrings", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("2s isometric squeeze at peak bridge", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Calf Raises", cell_style), Paragraph("Gastrocnemius, Soleus", cell_style), Paragraph("3 Sets × 15 Reps", cell_style), Paragraph("30s rest", cell_style), Paragraph("1s hold at peak ankle extension", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Dead Bug (Core Bracing)", cell_style), Paragraph("Deep Transverse Abs, Pelvic Floor", cell_style), Paragraph("3 Sets × 8 Reps/Side", cell_style), Paragraph("45s rest", cell_style), Paragraph("Press lumbar spine flat into floor", cell_style)]
    ]
    t_l1_l = Table(l1_lower_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l1_l.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l1_l)
    story.append(Spacer(1, 14))

    # LEVEL 2 DETAILED DIRECTORY
    story.append(Paragraph("4. Level 2: Intermediate Workouts (Weeks 5–8+ / Month 2)", h1_style))
    story.append(Paragraph("<b>Split Structure:</b> Push / Pull / Legs Split | 3 Rounds per Routine | 45–60s Rest between sets | 15 Working Sets per session.", body_style))
    story.append(Spacer(1, 4))

    # L2 Push Table
    story.append(Paragraph("<b>Routine A: Intermediate Push Day</b> (32 Min | 330 Kcal | Days 1 & 5)", h2_style))
    l2_push_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Standard Push-Ups", cell_style), Paragraph("Pectoralis Major, Triceps, Core", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Optionally add backpack load", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Pike Push-Ups", cell_style), Paragraph("Anterior Deltoids, Upper Traps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Lower head in front of hands", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("DB/Band Shoulder Press", cell_style), Paragraph("Deltoid Complex, Triceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("2s up, 2s controlled lowering", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Diamond Push-Ups", cell_style), Paragraph("Triceps Brachii, Inner Chest", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Thumbs & index fingers touching", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Lateral Raises (DB/Band)", cell_style), Paragraph("Lateral Deltoids", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Lead with elbows; pause at parallel", cell_style)]
    ]
    t_l2_pu = Table(l2_push_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l2_pu.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l2_pu)
    story.append(Spacer(1, 8))

    # Page Break for L2 Pull/Legs & L3
    story.append(PageBreak())

    # L2 Pull Table
    story.append(Paragraph("<b>Routine B: Intermediate Pull Day</b> (32 Min | 310 Kcal | Day 2)", h2_style))
    l2_pull_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Pull-Ups or Doorway Rows", cell_style), Paragraph("Latissimus Dorsi, Teres Major, Biceps", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Full scapular depression before pull", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Bent-Over DB / Band Rows", cell_style), Paragraph("Rhomboids, Mid/Lower Traps, Lats", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("45-deg hip hinge with flat back", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Superman Holds", cell_style), Paragraph("Erector Spinae, Glutes, Posture", cell_style), Paragraph("3 Sets × 30 Secs", cell_style), Paragraph("45s rest", cell_style), Paragraph("Lift thighs & chest; engage chain", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("DB / Band Bicep Curls", cell_style), Paragraph("Biceps Brachii, Brachialis", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Elbows pinned to sides; supinate", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Reverse Snow Angels", cell_style), Paragraph("Posterior Deltoids, Traps, Rotators", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Prone sweep without touching floor", cell_style)]
    ]
    t_l2_pl = Table(l2_pull_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l2_pl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l2_pl)
    story.append(Spacer(1, 8))

    # L2 Legs Table
    story.append(Paragraph("<b>Routine C: Intermediate Legs Day</b> (35 Min | 360 Kcal | Days 3 & 6)", h2_style))
    l2_legs_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Goblet Squats (DB/Bag)", cell_style), Paragraph("Quadriceps, Glutes, Core Bracing", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Hold load tight to sternum", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Bulgarian Split Squats", cell_style), Paragraph("Quadriceps, Glute Med/Max", cell_style), Paragraph("3 Sets × 10 Reps/Leg", cell_style), Paragraph("45s rest", cell_style), Paragraph("Rear foot on chair; lower straight", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Romanian Deadlifts (DB/Bag)", cell_style), Paragraph("Hamstrings, Gluteus Max, Spinae", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Deep hip hinge, feel hamstring pull", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Step-Ups (Chair / Step)", cell_style), Paragraph("Quadriceps, Gluteus Maximus", cell_style), Paragraph("3 Sets × 10 Reps/Leg", cell_style), Paragraph("45s rest", cell_style), Paragraph("Drive strictly through top lead foot", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Standing Calf Raises", cell_style), Paragraph("Gastrocnemius, Soleus", cell_style), Paragraph("3 Sets × 15 Reps", cell_style), Paragraph("30s rest", cell_style), Paragraph("2s pause at top extension", cell_style)]
    ]
    t_l2_lg = Table(l2_legs_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l2_lg.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l2_lg)
    story.append(Spacer(1, 14))

    # LEVEL 3 DETAILED DIRECTORY
    story.append(Paragraph("5. Level 3: Advanced Dedicated Split (Weeks 9+ / Month 3+)", h1_style))
    story.append(Paragraph("<b>Split Structure:</b> 6 Dedicated Single-Muscle Days | 3 Rounds per Routine | 45–60s Rest | 15–18 Sets per session.", body_style))
    story.append(Spacer(1, 4))

    # L3 Chest Table
    story.append(Paragraph("<b>Routine A: Advanced Chest Day</b> (35 Min | 380 Kcal | Day 1)", h2_style))
    l3_chest_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Weighted/Std Push-Ups", cell_style), Paragraph("Pectoralis Major, Anterior Delts", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("3s down eccentric, explosive push", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Decline Push-Ups (Elevated)", cell_style), Paragraph("Clavicular Pectoralis (Upper)", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Feet on chair; upper chest drive", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Wide Push-Ups", cell_style), Paragraph("Sternal Pectoralis, Serratus", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Hands wider than shoulders", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("DB Floor Press", cell_style), Paragraph("Pectoralis Major, Triceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("1s floor pause to eliminate bounce", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Chest Squeeze Press", cell_style), Paragraph("Inner Pectoralis Fibers", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Continuous inward isometric force", cell_style)]
    ]
    t_l3_ch = Table(l3_chest_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_ch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_ch)
    story.append(Spacer(1, 8))

    # Page Break for L3 Back, Legs, Shoulders, Arms, Core
    story.append(PageBreak())

    # L3 Back Table
    story.append(Paragraph("<b>Routine B: Advanced Back Day</b> (35 Min | 360 Kcal | Day 2)", h2_style))
    l3_back_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Pull-Ups (Wide Grip)", cell_style), Paragraph("Latissimus Dorsi, Teres Major", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Pull chest to bar; elbows down", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Chin-Ups (Close Grip)", cell_style), Paragraph("Biceps, Lower Latissimus", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Underhand palms facing you", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Single-Arm DB Rows", cell_style), Paragraph("Rhomboids, Lats, Mid Traps", cell_style), Paragraph("3 Sets × 10 Reps/Side", cell_style), Paragraph("45s rest", cell_style), Paragraph("Full stretch at bottom, elbow tucked", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Band Pull-Aparts", cell_style), Paragraph("Posterior Deltoids, Rhomboids", cell_style), Paragraph("3 Sets × 15 Reps", cell_style), Paragraph("30s rest", cell_style), Paragraph("Horizontal pull into sternum", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Supermans / Back Ext", cell_style), Paragraph("Erector Spinae, Gluteus Max", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("2s isometric hold at top", cell_style)]
    ]
    t_l3_bk = Table(l3_back_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_bk.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_bk)
    story.append(Spacer(1, 8))

    # L3 Legs Table
    story.append(Paragraph("<b>Routine C: Advanced Legs Day</b> (40 Min | 430 Kcal | Day 3)", h2_style))
    l3_legs_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Weighted Squats (DB/Bag)", cell_style), Paragraph("Quadriceps, Gluteus Maximus", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Below parallel, upright posture", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Walking Lunges", cell_style), Paragraph("Quadriceps, Glutes, Hamstrings", cell_style), Paragraph("3 Sets × 12 Reps/Leg", cell_style), Paragraph("45s rest", cell_style), Paragraph("Long dynamic strides with DBs", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Single-Leg RDLs", cell_style), Paragraph("Hamstrings, Glute Medius, Core", cell_style), Paragraph("3 Sets × 10 Reps/Leg", cell_style), Paragraph("45s rest", cell_style), Paragraph("Hip hinge balance lever", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Wall Sit", cell_style), Paragraph("Quadriceps, Core Isometric", cell_style), Paragraph("3 Sets × 30 Secs", cell_style), Paragraph("45s rest", cell_style), Paragraph("Thighs strictly parallel to ground", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Nordic Curl Negatives", cell_style), Paragraph("Hamstrings (Biceps Femoris)", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("4s slow eccentric descent to floor", cell_style)],
        [Paragraph("<b>06</b>", cell_style), Paragraph("Single-Leg Calf Raises", cell_style), Paragraph("Gastrocnemius, Soleus", cell_style), Paragraph("3 Sets × 15 Reps", cell_style), Paragraph("30s rest", cell_style), Paragraph("2s pause at top extension", cell_style)]
    ]
    t_l3_lg = Table(l3_legs_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_lg.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_lg)
    story.append(Spacer(1, 8))

    # L3 Shoulders Table
    story.append(Paragraph("<b>Routine D: Advanced Shoulders Day</b> (32 Min | 320 Kcal | Day 4)", h2_style))
    l3_sh_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Pike Push-Ups (Feet Elev)", cell_style), Paragraph("Anterior & Lateral Delts, Triceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Elevated feet for vertical overload", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("DB / Band Shoulder Press", cell_style), Paragraph("Deltoids, Upper Traps, Triceps", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("2s up, 2s down tempo", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Lateral Raises", cell_style), Paragraph("Lateral Deltoids", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Lead with elbows; no momentum", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Front Raises", cell_style), Paragraph("Anterior Deltoids", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Controlled raise to eye level", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Rear Delt Flys (Bent-Over)", cell_style), Paragraph("Posterior Deltoids, Rhomboids", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Hinge to parallel; pinkies up", cell_style)]
    ]
    t_l3_sh = Table(l3_sh_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_sh.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_sh)
    story.append(Spacer(1, 8))

    # Page Break for L3 Arms and Core + Summary Matrix
    story.append(PageBreak())

    # L3 Arms Table
    story.append(Paragraph("<b>Routine E: Advanced Arms Day</b> (32 Min | 310 Kcal | Day 5)", h2_style))
    l3_ar_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Diamond Push-Ups", cell_style), Paragraph("Triceps Brachii (Lateral/Medial)", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Elbows tight to ribs; hard lockout", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Close-Grip Floor Press", cell_style), Paragraph("Triceps Brachii, Sternal Chest", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Shoulder-width grip; tucked elbows", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Overhead Triceps Ext", cell_style), Paragraph("Triceps Brachii (Long Head)", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Deep overhead eccentric stretch", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("DB / Band Bicep Curls", cell_style), Paragraph("Biceps Brachii", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Strict supination at top", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Hammer Curls", cell_style), Paragraph("Brachialis, Brachioradialis", cell_style), Paragraph("3 Sets × 10 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Neutral grip; builds arm thickness", cell_style)],
        [Paragraph("<b>06</b>", cell_style), Paragraph("Chin-Ups (Close Underhand)", cell_style), Paragraph("Biceps Brachii, Latissimus", cell_style), Paragraph("3 Sets × 8 Reps", cell_style), Paragraph("60s rest", cell_style), Paragraph("Compound arm burnout finisher", cell_style)]
    ]
    t_l3_ar = Table(l3_ar_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_ar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_ar)
    story.append(Spacer(1, 8))

    # L3 Core Table
    story.append(Paragraph("<b>Routine F: Core & Conditioning Day</b> (28 Min | 300 Kcal | Day 6)", h2_style))
    l3_co_data = [
        [Paragraph("<b>#</b>", cell_header), Paragraph("<b>Exercise Name</b>", cell_header), Paragraph("<b>Target Muscles</b>", cell_header), Paragraph("<b>Sets x Reps</b>", cell_header), Paragraph("<b>Rest / Round</b>", cell_header), Paragraph("<b>Tempo & Execution Cue</b>", cell_header)],
        [Paragraph("<b>01</b>", cell_style), Paragraph("Lying / Hanging Leg Raises", cell_style), Paragraph("Lower Rectus Abdominis", cell_style), Paragraph("3 Sets × 12 Reps", cell_style), Paragraph("45s rest", cell_style), Paragraph("Pelvic upward tilt at top", cell_style)],
        [Paragraph("<b>02</b>", cell_style), Paragraph("Weighted Plank", cell_style), Paragraph("Transverse Abs, Core, Glutes", cell_style), Paragraph("3 Sets × 30 Secs", cell_style), Paragraph("45s rest", cell_style), Paragraph("Backpack on back for load", cell_style)],
        [Paragraph("<b>03</b>", cell_style), Paragraph("Bicycle Crunches", cell_style), Paragraph("Internal & External Obliques", cell_style), Paragraph("3 Sets × 15 Reps/Side", cell_style), Paragraph("30s rest", cell_style), Paragraph("Slow rotation; 1s hold per twist", cell_style)],
        [Paragraph("<b>04</b>", cell_style), Paragraph("Russian Twists (Weighted)", cell_style), Paragraph("Rotational Core, Obliques", cell_style), Paragraph("3 Sets × 15 Reps/Side", cell_style), Paragraph("30s rest", cell_style), Paragraph("Rotate shoulders & ribcage", cell_style)],
        [Paragraph("<b>05</b>", cell_style), Paragraph("Mountain Climbers", cell_style), Paragraph("Cardiovascular & Core Finisher", cell_style), Paragraph("3 Sets × 30 Secs", cell_style), Paragraph("30s rest", cell_style), Paragraph("Rapid rhythmic knees, low hips", cell_style)]
    ]
    t_l3_co = Table(l3_co_data, colWidths=[24, 110, 115, 75, 60, 120])
    t_l3_co.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_l3_co)
    story.append(Spacer(1, 14))

    # Summary Matrix & Key Takeaways
    story.append(Paragraph("6. Program Execution Summary Matrix", h1_style))
    matrix_data = [
        [Paragraph("<b>Level</b>", cell_header), Paragraph("<b>Duration</b>", cell_header), Paragraph("<b>Total Exercises</b>", cell_header), Paragraph("<b>Sets / Workout</b>", cell_header), Paragraph("<b>Rest Periods / Session</b>", cell_header), Paragraph("<b>Advancement Criteria</b>", cell_header)],
        [Paragraph("<b>Level 1 (Beginner)</b>", cell_style), Paragraph("4 Weeks (Month 1)", cell_style), Paragraph("10 (2 routines × 5)", cell_style), Paragraph("15 sets (3 rounds × 5)", cell_style), Paragraph("15 rests (30–45s each)", cell_style), Paragraph("Complete all reps cleanly for 2 straight sessions", cell_style)],
        [Paragraph("<b>Level 2 (Intermediate)</b>", cell_style), Paragraph("4 Weeks+ (Month 2)", cell_style), Paragraph("15 (3 routines × 5)", cell_style), Paragraph("15 sets (3 rounds × 5)", cell_style), Paragraph("15 rests (45–60s each)", cell_style), Paragraph("Complete all sets with external load for 2 straight sessions", cell_style)],
        [Paragraph("<b>Level 3 (Advanced)</b>", cell_style), Paragraph("Continuous (Month 3+)", cell_style), Paragraph("32 (6 routines × 5-6)", cell_style), Paragraph("15–18 sets (3 rounds × 5-6)", cell_style), Paragraph("15–18 rests (30–60s each)", cell_style), Paragraph("Progressive overload via load, tempo & density", cell_style)]
    ]
    t_mat = Table(matrix_data, colWidths=[80, 75, 75, 80, 80, 114])
    t_mat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_mat)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Report successfully written to {output_path}")

if __name__ == "__main__":
    out = "/Users/pavanaksshay/WalkBuddy/Loop_Workout_Program_Comprehensive_Report.pdf"
    create_report(out)
