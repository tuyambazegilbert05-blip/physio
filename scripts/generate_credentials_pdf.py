import json
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
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
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "PHYSIO FUND CIRCLE — MEMBER ACCOUNT PROVISIONING & CREDENTIALS ROSTER")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL — FOR GROUP DISTRIBUTION ONLY • PHYSIO FUND CIRCLE")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def generate_pdf(output_path="public/PHYSIO_FUND_CIRCLE_LOGIN_CREDENTIALS.pdf"):
    with open(".gemini/scratch/physio_fund_credentials_roster.json", "r") as f:
        roster = json.load(f)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1E1B4B")
    accent_blue = colors.HexColor("#2437F5")
    accent_purple = colors.HexColor("#7B3FF2")
    slate_dark = colors.HexColor("#0F172A")
    slate_muted = colors.HexColor("#475569")
    emerald_badge = colors.HexColor("#065F46")
    emerald_bg = colors.HexColor("#D1FAE5")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=slate_muted,
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=slate_dark,
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=slate_dark,
    )

    mono_style = ParagraphStyle(
        'Mono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E293B"),
    )

    mono_bold = ParagraphStyle(
        'MonoBold',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    tag_admin = ParagraphStyle(
        'AdminTag',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#6D28D9"),
    )

    tag_member = ParagraphStyle(
        'MemberTag',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#475569"),
    )

    elements = []

    # Header Banner
    elements.append(Paragraph("PHYSIO FUND CIRCLE", title_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("MEMBER ACCOUNT PROVISIONING & TEMPORARY CREDENTIALS ROSTER", ParagraphStyle(
        'HeaderBanner', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=accent_blue
    )))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph(
        "Platform Migration Roster • Cycle 1 (2025 – 2027) • Generated on October 6, 2026",
        subtitle_style
    ))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E2E8F0"), spaceAfter=14))

    # Executive Overview Callout
    overview_html = """
    <b>Migration Notice:</b> Operational records for <b>Physio Fund Circle</b> have been successfully transferred from Google Sheet ledgers into the Physio Cycle platform. 
    A total of <b>11 members</b>, <b>24 shares</b>, <b>165 monthly contribution rows (9,891,000 RWF)</b>, and <b>21 loan records (22,980,000 RWF)</b> have been reconciled with 100% exact parity (zero discrepancy).
    <br/><br/>
    <b>Group Administrator:</b> <b>Aimable BIZIMUNGU</b> has been designated as the founding Group Administrator (Chairperson / System Administrator / Committee Member).
    """
    callout_data = [[Paragraph(overview_html, body_style)]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(callout_table)
    elements.append(Spacer(1, 12))

    # Instructions Section
    elements.append(Paragraph("First-Time Sign In & Account Activation Instructions", h2_style))
    instructions_text = """
    Every member has been provisioned with a secure temporary identifier to claim their historical records without duplicating membership profiles:
    <br/>
    <b>1. Visit the Platform:</b> Navigate to the Physio Cycle login page (<b>/login</b>).<br/>
    <b>2. Enter Temporary Credentials:</b> Use the Temporary Identifier and Password listed in the table below.<br/>
    <b>3. Automated Activation Prompt:</b> The system will recognize your migrated status and redirect you to <b>/activate-account</b>.<br/>
    <b>4. Supply Real Details:</b> Enter your <b>real personal email address</b>, your <b>mobile phone number</b> (for Mobile Money verification), and set your <b>permanent secure password</b>. You may also provide an optional photo/avatar link.<br/>
    <b>5. 6-Digit Email Verification:</b> A 6-digit confirmation code will be dispatched to your personal email. Enter the code to prove ownership.<br/>
    <b>6. Permanent Access:</b> Once activated, all historical records, shares, and loans are permanently bound to your personal credentials.
    """
    elements.append(Paragraph(instructions_text, body_style))
    elements.append(Spacer(1, 14))

    # Credentials Table
    elements.append(Paragraph("Member Credentials Roster", h2_style))

    table_data = [
        [
            Paragraph("<b>Member ID</b>", body_style),
            Paragraph("<b>Full Name</b>", body_style),
            Paragraph("<b>Temporary Identifier (Email)</b>", body_style),
            Paragraph("<b>Temporary Password</b>", body_style),
            Paragraph("<b>Shares</b>", body_style),
            Paragraph("<b>Role</b>", body_style),
        ]
    ]

    for m in roster['credentials']:
        is_admin = m['role'] == 'admin'
        name_cell = Paragraph(f"<b>{m['full_name']}</b>" + (" <font color='#6D28D9'>[ADMIN]</font>" if is_admin else ""), body_style)
        id_cell = Paragraph(m['legacy_id'], mono_bold)
        email_cell = Paragraph(m['temporary_email'], mono_style)
        pass_cell = Paragraph(m['temporary_password'], mono_bold)
        shares_cell = Paragraph(str(m['shares']), body_style)
        role_cell = Paragraph("<b>Chairperson / Admin</b>" if is_admin else "Member", tag_admin if is_admin else tag_member)

        table_data.append([id_cell, name_cell, email_cell, pass_cell, shares_cell, role_cell])

    cred_table = Table(table_data, colWidths=[68, 110, 166, 80, 36, 44])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E1B4B")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('ALIGN', (4, 1), (4, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(cred_table)
    elements.append(Spacer(1, 14))

    # Financial Reconciliation Summary Table
    elements.append(Paragraph("Financial Truth & Verification Summary", h2_style))
    recon_data = [
        [
            Paragraph("<b>Entity</b>", body_style),
            Paragraph("<b>Spreadsheet Source Value</b>", body_style),
            Paragraph("<b>Physio Cycle Database Value</b>", body_style),
            Paragraph("<b>Variance</b>", body_style),
            Paragraph("<b>Status</b>", body_style),
        ],
        [
            Paragraph("Canonical Members", body_style),
            Paragraph("11 persons", body_style),
            Paragraph("11 verified profiles", body_style),
            Paragraph("0", body_style),
            Paragraph("<font color='#059669'><b>EXACT MATCH ✓</b></font>", body_style),
        ],
        [
            Paragraph("Total Shares", body_style),
            Paragraph("24 shares", body_style),
            Paragraph("24 active shares", body_style),
            Paragraph("0", body_style),
            Paragraph("<font color='#059669'><b>EXACT MATCH ✓</b></font>", body_style),
        ],
        [
            Paragraph("Total Contributions", body_style),
            Paragraph("9,891,000 RWF (165 rows)", body_style),
            Paragraph("9,891,000 RWF (165 rows)", body_style),
            Paragraph("0 RWF", body_style),
            Paragraph("<font color='#059669'><b>EXACT MATCH ✓</b></font>", body_style),
        ],
        [
            Paragraph("Total Loan Principal Disbursed", body_style),
            Paragraph("22,980,000 RWF (21 loans)", body_style),
            Paragraph("22,980,000 RWF (21 loans)", body_style),
            Paragraph("0 RWF", body_style),
            Paragraph("<font color='#059669'><b>EXACT MATCH ✓</b></font>", body_style),
        ],
        [
            Paragraph("Active Loans Outstanding", body_style),
            Paragraph("5,130,000 RWF (5 active)", body_style),
            Paragraph("5,130,000 RWF (5 active)", body_style),
            Paragraph("0 RWF", body_style),
            Paragraph("<font color='#059669'><b>EXACT MATCH ✓</b></font>", body_style),
        ],
    ]
    recon_table = Table(recon_data, colWidths=[130, 110, 120, 54, 90])
    recon_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(recon_table)
    elements.append(Spacer(1, 14))

    # Security Best Practices
    security_notice = """
    <b>Security Best Practices:</b><br/>
    • These temporary credentials are confidential single-use activation keys.<br/>
    • Distribute each temporary credential only to the respective named person.<br/>
    • Each user will immediately set their own confidential password upon activation.<br/>
    • Group Administrator authority is restricted strictly to governance and administrative capabilities per the security architecture.
    """
    elements.append(Paragraph(security_notice, ParagraphStyle('Sec', parent=body_style, fontSize=8, leading=11, textColor=slate_muted)))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Successfully generated credentials PDF at: {output_path}")

if __name__ == "__main__":
    generate_pdf()
