import json
import os
import sys

def escape_pdf(text):
    text = str(text)
    text = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    return text

class SimplePDFBuilder:
    def __init__(self, filename):
        self.filename = filename
        self.objects = []
        self.pages = []

    def add_object(self, content):
        self.objects.append(content)
        return len(self.objects)

    def build_page_stream(self, commands):
        stream_bytes = '\n'.join(commands).encode('utf-8')
        length = len(stream_bytes)
        obj_id = self.add_object(f"<< /Length {length} >>\nstream\n{stream_bytes.decode('latin1')}\nendstream")
        return obj_id

    def add_page(self, stream_obj_id):
        # We will reference page objects after we know their IDs
        self.pages.append(stream_obj_id)

    def save(self):
        # Reserve object slots
        # 1: Catalog
        # 2: Pages
        # 3: Helvetica Font
        # 4: Helvetica-Bold Font
        # 5: Courier Font
        # 6: Courier-Bold Font
        # Then page objects, then stream objects
        total_pages = len(self.pages)
        page_obj_ids = []
        
        # We compute offsets
        output = ["%PDF-1.4\n%âãÏÓ\n"]
        offsets = {}

        def write_obj(num, content):
            offsets[num] = sum(len(x.encode('latin1')) for x in output)
            output.append(f"{num} 0 obj\n{content}\nendobj\n")

        # Fonts
        font_h = 3
        font_hb = 4
        font_c = 5
        font_cb = 6

        # Allocate page object numbers starting after pages catalog
        next_num = 7
        page_nums = []
        stream_nums = []
        for i in range(total_pages):
            p_num = next_num
            s_num = next_num + 1
            next_num += 2
            page_nums.append(p_num)
            stream_nums.append(s_num)

        # 1: Catalog
        write_obj(1, "<< /Type /Catalog /Pages 2 0 R >>")

        # 2: Pages
        kids_str = " ".join([f"{p} 0 R" for p in page_nums])
        write_obj(2, f"<< /Type /Pages /Kids [ {kids_str} ] /Count {total_pages} >>")

        # Fonts
        write_obj(font_h, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        write_obj(font_hb, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        write_obj(font_c, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
        write_obj(font_cb, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>")

        # Write pages and streams
        for i in range(total_pages):
            p_num = page_nums[i]
            s_num = stream_nums[i]
            stream_content = self.pages[i]
            stream_bytes = stream_content.encode('utf-8')

            # Page object
            write_obj(p_num, f"""<< /Type /Page /Parent 2 0 R
/MediaBox [ 0 0 612 792 ]
/Resources <<
  /Font <<
    /F1 {font_h} 0 R
    /F2 {font_hb} 0 R
    /F3 {font_c} 0 R
    /F4 {font_cb} 0 R
  >>
>>
/Contents {s_num} 0 R
>>""")

            # Stream object
            write_obj(s_num, f"<< /Length {len(stream_bytes)} >>\nstream\n{stream_content}\nendstream")

        xref_offset = sum(len(x.encode('latin1')) for x in output)
        output.append(f"xref\n0 {next_num}\n0000000000 65535 f \n")
        for num in range(1, next_num):
            off = offsets[num]
            output.append(f"{off:010d} 00000 n \n")

        output.append(f"trailer\n<< /Size {next_num} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n")

        with open(self.filename, 'wb') as f:
            f.write("".join(output).encode('latin1'))
        print(f"Generated PDF successfully: {self.filename} ({len(output)} parts)")

def build_credentials_pdf():
    with open(".gemini/scratch/physio_fund_credentials_roster.json", "r") as f:
        roster = json.load(f)

    pdf = SimplePDFBuilder("public/PHYSIO_FUND_CIRCLE_LOGIN_CREDENTIALS.pdf")

    # ================= PAGE 1 =================
    p1 = []
    
    # Background accent bar at top
    p1.append("0.141 0.215 0.960 rg") # #2437F5 blue
    p1.append("0 786 612 6 re f")

    # Header title
    p1.append("0.117 0.105 0.294 rg") # Dark navy #1E1B4B
    p1.append("BT /F2 20 Tf 40 748 Td (PHYSIO FUND CIRCLE) Tj ET")
    
    # Subtitle
    p1.append("0.141 0.215 0.960 rg")
    p1.append("BT /F2 10.5 Tf 40 732 Td (MEMBER ACCOUNT PROVISIONING & LOGIN CREDENTIALS ROSTER) Tj ET")

    p1.append("0.392 0.455 0.545 rg") # Slate #64748B
    p1.append("BT /F1 8.5 Tf 40 718 Td (Platform Migration Roster  |  Cycle 1 \\(2025 - 2027\\)  |  Official Release: October 6, 2026) Tj ET")

    # Horizontal divider
    p1.append("0.898 0.917 0.941 RG 1 w") # Border gray
    p1.append("40 708 m 572 708 l S")

    # Callout Box (Executive Summary)
    p1.append("0.949 0.961 0.984 rg 40 626 532 72 re f") # Slate-50 bg
    p1.append("0.800 0.835 0.882 RG 1 w 40 626 532 72 re S") # Slate-300 border
    
    # Left accent indicator inside callout
    p1.append("0.482 0.247 0.949 rg 40 626 4 72 re f") # Purple accent #7B3FF2

    p1.append("0.058 0.090 0.164 rg") # Text dark
    p1.append("BT /F2 9.5 Tf 54 682 Td (MIGRATION & VERIFICATION NOTICE) Tj ET")
    p1.append("BT /F1 8.5 Tf 54 668 Td (Operational records for Physio Fund Circle have been successfully transferred into Physio Cycle.) Tj ET")
    p1.append("BT /F1 8.5 Tf 54 654 Td (A total of 11 members, 24 shares, 165 monthly contributions \\(9,891,000 RWF\\), and 21 loans \\(22,980,000 RWF\\)) Tj ET")
    p1.append("BT /F1 8.5 Tf 54 640 Td (have been reconciled with 100% exact parity \\(zero discrepancy\\). Designee Aimable Bizimungu is Group Admin.) Tj ET")

    # Section 1: Activation Instructions
    p1.append("0.117 0.105 0.294 rg")
    p1.append("BT /F2 11 Tf 40 604 Td (First-Time Login & Account Activation Steps) Tj ET")

    instructions = [
        ("Step 1: Sign In", "Visit the platform login page (/login) and enter the Temporary Identifier and Password below."),
        ("Step 2: Auto-Redirect", "The system detects your migrated profile and opens the Account Activation view (/activate-account)."),
        ("Step 3: Personal Details", "Enter your real personal email, personal phone number (for Mobile Money), and set a new password."),
        ("Step 4: Verify Email OTP", "A 6-digit confirmation code is sent to your real email. Enter the code to verify ownership."),
        ("Step 5: Permanent Workspace", "Your account is activated with full access to your historical contributions, shares, and loans."),
    ]

    curr_y = 586
    for title, desc in instructions:
        p1.append("0.141 0.215 0.960 rg")
        p1.append(f"BT /F2 8.5 Tf 48 {curr_y} Td ({escape_pdf(title)}:) Tj ET")
        p1.append("0.278 0.333 0.412 rg")
        p1.append(f"BT /F1 8.5 Tf 145 {curr_y} Td ({escape_pdf(desc)}) Tj ET")
        curr_y -= 14

    # Section 2: Table Header
    curr_y -= 8
    p1.append("0.117 0.105 0.294 rg")
    p1.append(f"BT /F2 11 Tf 40 {curr_y} Td (Member Credentials Roster \\(11 Migrated Accounts\\)) Tj ET")

    curr_y -= 18
    # Table Header Row
    p1.append("0.117 0.105 0.294 rg 40 " + str(curr_y - 4) + " 532 18 re f")
    p1.append("1.0 1.0 1.0 rg")
    p1.append(f"BT /F2 8 Tf 46 {curr_y + 1} Td (ID) Tj ET")
    p1.append(f"BT /F2 8 Tf 82 {curr_y + 1} Td (Full Name) Tj ET")
    p1.append(f"BT /F2 8 Tf 205 {curr_y + 1} Td (Temporary Identifier \\(Email\\)) Tj ET")
    p1.append(f"BT /F2 8 Tf 425 {curr_y + 1} Td (Temp Password) Tj ET")
    p1.append(f"BT /F2 8 Tf 505 {curr_y + 1} Td (Shares) Tj ET")
    p1.append(f"BT /F2 8 Tf 535 {curr_y + 1} Td (Role) Tj ET")

    curr_y -= 18

    # Render members table
    for i, m in enumerate(roster['credentials']):
        is_even = (i % 2 == 0)
        row_bg = "0.973 0.980 0.988" if is_even else "1.0 1.0 1.0"
        p1.append(f"{row_bg} rg 40 {curr_y - 4} 532 17 re f")
        p1.append(f"0.898 0.917 0.941 RG 0.5 w 40 {curr_y - 4} 532 17 re S")

        is_admin = (m['role'] == 'admin')
        
        # ID
        p1.append("0.278 0.333 0.412 rg")
        p1.append(f"BT /F4 7.5 Tf 44 {curr_y + 1} Td ({escape_pdf(m['legacy_id'])}) Tj ET")

        # Name
        if is_admin:
            p1.append("0.427 0.157 0.851 rg") # Purple
            p1.append(f"BT /F2 8 Tf 82 {curr_y + 1} Td ({escape_pdf(m['full_name'])}) Tj ET")
        else:
            p1.append("0.058 0.090 0.164 rg")
            p1.append(f"BT /F1 8 Tf 82 {curr_y + 1} Td ({escape_pdf(m['full_name'])}) Tj ET")

        # Email
        p1.append("0.117 0.161 0.231 rg")
        p1.append(f"BT /F3 7 Tf 205 {curr_y + 1} Td ({escape_pdf(m['temporary_email'])}) Tj ET")

        # Password
        p1.append("0.058 0.090 0.164 rg")
        p1.append(f"BT /F4 7.5 Tf 425 {curr_y + 1} Td ({escape_pdf(m['temporary_password'])}) Tj ET")

        # Shares
        p1.append("0.058 0.090 0.164 rg")
        p1.append(f"BT /F1 8 Tf 512 {curr_y + 1} Td ({escape_pdf(m['shares'])}) Tj ET")

        # Role
        if is_admin:
            p1.append("0.427 0.157 0.851 rg")
            p1.append(f"BT /F2 7.5 Tf 535 {curr_y + 1} Td (ADMIN) Tj ET")
        else:
            p1.append("0.392 0.455 0.545 rg")
            p1.append(f"BT /F1 7.5 Tf 535 {curr_y + 1} Td (Member) Tj ET")

        curr_y -= 17

    # Financial Reconciliation Table
    curr_y -= 12
    p1.append("0.117 0.105 0.294 rg")
    p1.append(f"BT /F2 10.5 Tf 40 {curr_y} Td (Financial Truth Reconciliation Summary) Tj ET")

    curr_y -= 16
    p1.append("0.058 0.090 0.164 rg 40 " + str(curr_y - 3) + " 532 16 re f")
    p1.append("1.0 1.0 1.0 rg")
    p1.append(f"BT /F2 7.5 Tf 46 {curr_y + 1} Td (Financial Category) Tj ET")
    p1.append(f"BT /F2 7.5 Tf 190 {curr_y + 1} Td (Spreadsheet Source) Tj ET")
    p1.append(f"BT /F2 7.5 Tf 315 {curr_y + 1} Td (Physio Cycle Database) Tj ET")
    p1.append(f"BT /F2 7.5 Tf 445 {curr_y + 1} Td (Discrepancy) Tj ET")
    p1.append(f"BT /F2 7.5 Tf 505 {curr_y + 1} Td (Audit Status) Tj ET")

    curr_y -= 15

    recon_rows = [
        ("Canonical Members Count", "11 members", "11 profiles provisioned", "0", "MATCH (100%)"),
        ("Total Active Shares", "24 shares", "24 shares allocated", "0", "MATCH (100%)"),
        ("Historical Contributions", "9,891,000 RWF (165 records)", "9,891,000 RWF in ledger", "0 RWF", "MATCH (100%)"),
        ("Loan Principal Disbursed", "22,980,000 RWF (21 loans)", "22,980,000 RWF in loans", "0 RWF", "MATCH (100%)"),
        ("Active Loan Balance", "5,130,000 RWF (5 active)", "5,130,000 RWF outstanding", "0 RWF", "MATCH (100%)"),
    ]

    for cat, src, db, disc, status in recon_rows:
        p1.append(f"0.973 0.980 0.988 rg 40 {curr_y - 3} 532 14 re f")
        p1.append(f"0.898 0.917 0.941 RG 0.5 w 40 {curr_y - 3} 532 14 re S")
        p1.append("0.058 0.090 0.164 rg")
        p1.append(f"BT /F1 7.5 Tf 46 {curr_y} Td ({escape_pdf(cat)}) Tj ET")
        p1.append(f"BT /F1 7.5 Tf 190 {curr_y} Td ({escape_pdf(src)}) Tj ET")
        p1.append(f"BT /F1 7.5 Tf 315 {curr_y} Td ({escape_pdf(db)}) Tj ET")
        p1.append(f"BT /F1 7.5 Tf 445 {curr_y} Td ({escape_pdf(disc)}) Tj ET")
        p1.append("0.024 0.588 0.412 rg") # Green
        p1.append(f"BT /F2 7.5 Tf 505 {curr_y} Td ({escape_pdf(status)}) Tj ET")
        curr_y -= 14

    # Footer note
    p1.append("0.898 0.917 0.941 RG 0.5 w 40 46 m 572 46 l S")
    p1.append("0.392 0.455 0.545 rg")
    p1.append("BT /F1 7.5 Tf 40 34 Td (CONFIDENTIAL - PHYSIO FUND CIRCLE. Temporary credentials expire upon activation. Distribute only to named individuals.) Tj ET")
    p1.append("BT /F1 7.5 Tf 520 34 Td (Page 1 of 1) Tj ET")

    pdf.add_page("\n".join(p1))
    pdf.save()

if __name__ == '__main__':
    build_credentials_pdf()
