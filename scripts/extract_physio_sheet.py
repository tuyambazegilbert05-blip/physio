#!/usr/bin/env python3
import openpyxl
import json
import sys
import re
import os

EXCEL_PATH = sys.argv[1] if len(sys.argv) > 1 else 'public/PHYSIO FUND CIRCLE GOOGLE SHEET_REPORTS.xlsx'

if not os.path.exists(EXCEL_PATH):
    print(json.dumps({'error': f'Excel file not found at {EXCEL_PATH}'}))
    sys.exit(1)

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

CANONICAL_MEMBERS = [
    {
        'legacy_id': 'PHYSIO-MBR-001',
        'slug': 'aimable-bizimungu',
        'full_name': 'Aimable BIZIMUNGU',
        'shares': 2,
        'role': 'admin',
        'legacy_phone': None,
        'aliases': ['aimable', 'bizimungu']
    },
    {
        'legacy_id': 'PHYSIO-MBR-002',
        'slug': 'ben-honore-nishimwe',
        'full_name': 'Ben Honore NISHIMWE',
        'shares': 2,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['ben honore', 'honore', 'ben']
    },
    {
        'legacy_id': 'PHYSIO-MBR-003',
        'slug': 'edouard-karemera',
        'full_name': 'Edouard KAREMERA',
        'shares': 1,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['edouard', 'karemera']
    },
    {
        'legacy_id': 'PHYSIO-MBR-004',
        'slug': 'eliezel-niyobyose',
        'full_name': 'Eliezel NIYOBYOSE',
        'shares': 1,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['eliezel', 'niyobyose', 'niyishobobyose']
    },
    {
        'legacy_id': 'PHYSIO-MBR-005',
        'slug': 'enock-nzakizwanimana',
        'full_name': 'Enock NZAKIZWANIMANA',
        'shares': 4,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['enock', 'nzakizwanimana']
    },
    {
        'legacy_id': 'PHYSIO-MBR-006',
        'slug': 'eric-ndayishimiye',
        'full_name': 'Eric NDAYISHIMIYE',
        'shares': 1,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['eric', 'ndayishimiye']
    },
    {
        'legacy_id': 'PHYSIO-MBR-007',
        'slug': 'etienne-turikumana',
        'full_name': 'Etienne TURIKUMANA',
        'shares': 2,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['etienne', 'turikumana']
    },
    {
        'legacy_id': 'PHYSIO-MBR-008',
        'slug': 'felicite-nishimwe',
        'full_name': 'Felicite NISHIMWE',
        'shares': 2,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['felicite']
    },
    {
        'legacy_id': 'PHYSIO-MBR-009',
        'slug': 'gloriose-mukashema',
        'full_name': 'Gloriose MUKASHEMA',
        'shares': 4,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['gloriose', 'mukashema']
    },
    {
        'legacy_id': 'PHYSIO-MBR-010',
        'slug': 'jean-aime-mubera',
        'full_name': 'Jean Aime MUBERA',
        'shares': 1,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['jean aime', 'mubera']
    },
    {
        'legacy_id': 'PHYSIO-MBR-011',
        'slug': 'marie-aimee-uwase',
        'full_name': 'Marie Aimee UWASE',
        'shares': 4,
        'role': 'member',
        'legacy_phone': None,
        'aliases': ['marie aimee', 'uwase']
    }
]

PERIOD_MAP = {
    'July 2025': '2025-07',
    'August 2025': '2025-08',
    'September 2025': '2025-09',
    'October2025': '2025-10',
    'November2025': '2025-11',
    'December2025': '2025-12',
    'January 2026': '2026-01',
    'February 2026': '2026-02',
    'March202': '2026-03',
    'April 2026': '2026-04',
    'May2026': '2026-05',
    'June 2026': '2026-06',
    'July 2026': '2026-07',
    'August 2026': '2026-08',
    'September 2026': '2026-09'
}

def match_member(raw_name):
    if not raw_name: return None
    clean = ' '.join(str(raw_name).strip().split()).lower()
    for m in CANONICAL_MEMBERS:
        for alias in m['aliases']:
            if alias in clean:
                return m
    return None

def parse_num(val):
    if val is None: return 0
    if isinstance(val, (int, float)): return int(round(val))
    val_str = str(val).strip().replace(',', '')
    if 'k' in val_str.lower():
        m = re.search(r'([\d.]+)', val_str)
        if m: return int(round(float(m.group(1)) * 1000))
    m = re.search(r'([\d.]+)', val_str)
    if m: return int(round(float(m.group(1))))
    return 0

def parse_loan(text):
    text_clean = str(text).replace(',', '.').strip()
    if 'credited another' in text_clean.lower():
        text_clean = text_clean.lower().split('credited another')[1].strip()
    parts = re.split(r'[/\\+]', text_clean)
    first_part = parts[0].strip()
    principal = 0
    m_val = re.search(r'([\d.]+)\s*m\b', first_part.lower())
    k_val = re.search(r'([\d.]+)\s*k\b', first_part.lower())
    if m_val:
        principal = int(float(m_val.group(1)) * 1_000_000)
    elif k_val:
        principal = int(float(k_val.group(1)) * 1000)
    else:
        num = re.search(r'(\d+)', first_part)
        if num:
            principal = int(num.group(1))
    term_months = 1
    m_term = re.search(r'(\d+)\s*month', text_clean.lower())
    if m_term:
        term_months = int(m_term.group(1))
    elif '>5' in text_clean or '> 5' in text_clean:
        term_months = 6
    rate = 3.0 if term_months <= 4 else 5.0
    return principal, term_months, rate

months_data = []
all_contributions = []
raw_loans_by_key = {}

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    period = PERIOD_MAP.get(sheet_name)
    if not period:
        continue
    
    is_late_format = sheet_name in ['August 2026', 'September 2026']
    month_records = []
    
    for r in range(1, min(30, ws.max_row + 1)):
        row_vals = [ws.cell(r, c).value for c in range(1, min(15, ws.max_column + 1))]
        first_cell = str(row_vals[0] or '').strip()
        matched = match_member(first_cell)
        if not matched:
            continue
        
        shares = float(row_vals[1]) if len(row_vals) > 1 and row_vals[1] is not None and str(row_vals[1]).replace('.', '').isdigit() else matched['shares']
        raw_amt = row_vals[2] if len(row_vals) > 2 else 0
        total_amount = parse_num(raw_amt)
        slip = str(row_vals[3] or '').strip() if len(row_vals) > 3 and row_vals[3] is not None else None
        
        if is_late_format:
            delay_fee = parse_num(row_vals[4]) if len(row_vals) > 4 else 0
            ref = str(row_vals[5] or '').strip() if len(row_vals) > 5 and row_vals[5] is not None else None
            credits_text = str(row_vals[6] or '').strip() if len(row_vals) > 6 and row_vals[6] is not None else None
            interest_text = str(row_vals[7] or '').strip() if len(row_vals) > 7 and row_vals[7] is not None else None
            paid_interest = str(row_vals[8] or '').strip() if len(row_vals) > 8 and row_vals[8] is not None else None
            credit_status = str(row_vals[9] or '').strip() if len(row_vals) > 9 and row_vals[9] is not None else None
        else:
            delay_fee = 0
            ref = str(row_vals[4] or '').strip() if len(row_vals) > 4 and row_vals[4] is not None else None
            credits_text = str(row_vals[5] or '').strip() if len(row_vals) > 5 and row_vals[5] is not None else None
            interest_text = None
            paid_interest = None
            credit_status = str(row_vals[6] or '').strip() if len(row_vals) > 6 and row_vals[6] is not None else None

        if ref and ref.lower() in ['none', '-', 'not clearly seen']:
            ref = None

        expected_savings = int(shares * 25000)
        expected_social = 5000
        
        if total_amount == 0:
            savings_amt = 0
            social_amt = 0
        elif total_amount >= expected_social:
            social_amt = expected_social
            savings_amt = total_amount - social_amt
        else:
            social_amt = total_amount
            savings_amt = 0

        record_key = f"{matched['legacy_id']}:{period}"
        contrib = {
            'record_key': record_key,
            'legacy_member_id': matched['legacy_id'],
            'member_name': matched['full_name'],
            'period': period,
            'sheet_name': sheet_name,
            'sheet_row': r,
            'shares': shares,
            'total_amount': total_amount,
            'savings_amount': savings_amt,
            'social_amount': social_amt,
            'delay_fee': delay_fee,
            'reference': ref,
            'slip_status': slip,
        }
        month_records.append(contrib)
        all_contributions.append(contrib)

        if credits_text and credits_text not in ['None', '', '-'] and not credits_text.startswith('Sent with'):
            l_key = f"{matched['legacy_id']}:{period}"
            raw_loans_by_key[l_key] = {
                'key': l_key,
                'legacy_member_id': matched['legacy_id'],
                'member_name': matched['full_name'],
                'period': period,
                'sheet_name': sheet_name,
                'raw_credits': credits_text,
                'raw_status': credit_status,
                'raw_interest': interest_text,
                'raw_paid_interest': paid_interest,
                'slip_ref': ref
            }

    months_data.append({
        'sheet': sheet_name,
        'period': period,
        'records_count': len(month_records),
        'total_collected': sum(r['total_amount'] for r in month_records)
    })

# Deduplicate loans into distinct loans
# Notice: some loans are reported across multiple months (e.g. month 1, month 2 as 'ONGOING')
# We track distinct loan originations.
distinct_loans = []
# Pre-identified loans from manual/algorithmic collation
# 1. Felicite 2025-08: 2,000,000, 1mo -> Cleared
# 2. Gloriose 2025-08: 250,000, 1mo -> Cleared
# 3. Etienne 2025-08: 1,500,000, 1mo -> Cleared
# 4. Edouard 2025-11: 100,000, 1mo -> Cleared 2025-12
# 5. Eliezel 2025-11: 350,000, 5mo -> Cleared 2026-05
# 6. Ben Honore 2026-01: 350,000, 1mo -> Cleared 2026-02
# 7. Felicite 2026-02: 400,000, 1mo -> Cleared
# 8. Gloriose 2026-02: 500,000, 2mo -> Cleared 2026-05
# 9. Enock 2026-03: 2,000,000, 5mo -> Cleared 2026-08
# 10. Ben Honore 2026-03: 3,000,000, 1mo -> Cleared
# 11. Marie Aimee 2026-04: 700,000, 3mo -> Cleared 2026-06
# 12. Ben Honore 2026-04: 2,500,000, 1mo -> Cleared 2026-05
# 13. Edouard 2026-04: 100,000, 1mo -> Cleared
# 14. Felicite 2026-06: 1,500,000, 6mo (01/06/2026) -> Cleared 2026-08
# 15. Gloriose 2026-06: 250,000, 3mo (08/06/2026) -> ACTIVE (250,000)
# 16. Edouard 2026-06: 100,000, 2mo -> Cleared 2026-06
# 17. Eliezel 2026-07: 380,000, 3mo (22/07/2026) -> ACTIVE (380,000)
# 18. Felicite 2026-08: 2,000,000, 6mo (30/07/2026) -> Cleared 2026-09
# 19. Etienne 2026-08: 1,500,000, 5mo (05/08/2026) -> ACTIVE (1,500,000)
# 20. Ben Honore 2026-09: 2,500,000, 1mo -> ACTIVE (2,500,000)
# 21. Marie Aimee 2026-09: 1,000,000, 3mo -> ACTIVE (outstanding 500,000)

DEFINED_LOANS = [
    {'key': 'PHYSIO-LN-001', 'legacy_member_id': 'PHYSIO-MBR-008', 'member_name': 'Felicite NISHIMWE', 'period': '2025-08', 'principal': 2000000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2025-08-01'},
    {'key': 'PHYSIO-LN-002', 'legacy_member_id': 'PHYSIO-MBR-009', 'member_name': 'Gloriose MUKASHEMA', 'period': '2025-08', 'principal': 250000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2025-08-01'},
    {'key': 'PHYSIO-LN-003', 'legacy_member_id': 'PHYSIO-MBR-007', 'member_name': 'Etienne TURIKUMANA', 'period': '2025-08', 'principal': 1500000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2025-08-01'},
    {'key': 'PHYSIO-LN-004', 'legacy_member_id': 'PHYSIO-MBR-003', 'member_name': 'Edouard KAREMERA', 'period': '2025-11', 'principal': 100000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2025-11-01'},
    {'key': 'PHYSIO-LN-005', 'legacy_member_id': 'PHYSIO-MBR-004', 'member_name': 'Eliezel NIYOBYOSE', 'period': '2025-11', 'principal': 350000, 'term_months': 5, 'interest_rate': 5.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2025-11-01'},
    {'key': 'PHYSIO-LN-006', 'legacy_member_id': 'PHYSIO-MBR-002', 'member_name': 'Ben Honore NISHIMWE', 'period': '2026-01', 'principal': 350000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-01-01'},
    {'key': 'PHYSIO-LN-007', 'legacy_member_id': 'PHYSIO-MBR-008', 'member_name': 'Felicite NISHIMWE', 'period': '2026-02', 'principal': 400000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-02-01'},
    {'key': 'PHYSIO-LN-008', 'legacy_member_id': 'PHYSIO-MBR-009', 'member_name': 'Gloriose MUKASHEMA', 'period': '2026-02', 'principal': 500000, 'term_months': 2, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-02-01'},
    {'key': 'PHYSIO-LN-009', 'legacy_member_id': 'PHYSIO-MBR-005', 'member_name': 'Enock NZAKIZWANIMANA', 'period': '2026-03', 'principal': 2000000, 'term_months': 5, 'interest_rate': 5.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-03-01'},
    {'key': 'PHYSIO-LN-010', 'legacy_member_id': 'PHYSIO-MBR-002', 'member_name': 'Ben Honore NISHIMWE', 'period': '2026-03', 'principal': 3000000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-03-01'},
    {'key': 'PHYSIO-LN-011', 'legacy_member_id': 'PHYSIO-MBR-011', 'member_name': 'Marie Aimee UWASE', 'period': '2026-04', 'principal': 700000, 'term_months': 3, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-04-01'},
    {'key': 'PHYSIO-LN-012', 'legacy_member_id': 'PHYSIO-MBR-002', 'member_name': 'Ben Honore NISHIMWE', 'period': '2026-04', 'principal': 2500000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-04-01'},
    {'key': 'PHYSIO-LN-013', 'legacy_member_id': 'PHYSIO-MBR-003', 'member_name': 'Edouard KAREMERA', 'period': '2026-04', 'principal': 100000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-04-01'},
    {'key': 'PHYSIO-LN-014', 'legacy_member_id': 'PHYSIO-MBR-008', 'member_name': 'Felicite NISHIMWE', 'period': '2026-06', 'principal': 1500000, 'term_months': 6, 'interest_rate': 5.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-06-01'},
    {'key': 'PHYSIO-LN-015', 'legacy_member_id': 'PHYSIO-MBR-009', 'member_name': 'Gloriose MUKASHEMA', 'period': '2026-06', 'principal': 250000, 'term_months': 3, 'interest_rate': 3.0, 'status': 'active', 'outstanding': 250000, 'disbursed_at': '2026-06-08'},
    {'key': 'PHYSIO-LN-016', 'legacy_member_id': 'PHYSIO-MBR-003', 'member_name': 'Edouard KAREMERA', 'period': '2026-06', 'principal': 100000, 'term_months': 2, 'interest_rate': 3.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-06-01'},
    {'key': 'PHYSIO-LN-017', 'legacy_member_id': 'PHYSIO-MBR-004', 'member_name': 'Eliezel NIYOBYOSE', 'period': '2026-07', 'principal': 380000, 'term_months': 3, 'interest_rate': 3.0, 'status': 'active', 'outstanding': 380000, 'disbursed_at': '2026-07-22'},
    {'key': 'PHYSIO-LN-018', 'legacy_member_id': 'PHYSIO-MBR-008', 'member_name': 'Felicite NISHIMWE', 'period': '2026-08', 'principal': 2000000, 'term_months': 6, 'interest_rate': 5.0, 'status': 'repaid', 'outstanding': 0, 'disbursed_at': '2026-07-30'},
    {'key': 'PHYSIO-LN-019', 'legacy_member_id': 'PHYSIO-MBR-007', 'member_name': 'Etienne TURIKUMANA', 'period': '2026-08', 'principal': 1500000, 'term_months': 5, 'interest_rate': 5.0, 'status': 'active', 'outstanding': 1500000, 'disbursed_at': '2026-08-05'},
    {'key': 'PHYSIO-LN-020', 'legacy_member_id': 'PHYSIO-MBR-002', 'member_name': 'Ben Honore NISHIMWE', 'period': '2026-09', 'principal': 2500000, 'term_months': 1, 'interest_rate': 3.0, 'status': 'active', 'outstanding': 2500000, 'disbursed_at': '2026-09-01'},
    {'key': 'PHYSIO-LN-021', 'legacy_member_id': 'PHYSIO-MBR-011', 'member_name': 'Marie Aimee UWASE', 'period': '2026-09', 'principal': 1000000, 'term_months': 3, 'interest_rate': 3.0, 'status': 'active', 'outstanding': 500000, 'disbursed_at': '2026-09-01'},
]

total_contributed = sum(c['total_amount'] for c in all_contributions)
total_savings = sum(c['savings_amount'] for c in all_contributions)
total_social = sum(c['social_amount'] for c in all_contributions)
total_loan_principal = sum(l['principal'] for l in DEFINED_LOANS)
total_active_loan_outstanding = sum(l['outstanding'] for l in DEFINED_LOANS)

output = {
    'source_file': EXCEL_PATH,
    'group_name': 'Physio Fund Circle',
    'canonical_members': CANONICAL_MEMBERS,
    'total_members': len(CANONICAL_MEMBERS),
    'total_shares': sum(m['shares'] for m in CANONICAL_MEMBERS),
    'months': months_data,
    'total_months': len(months_data),
    'contributions_count': len(all_contributions),
    'loans_count': len(DEFINED_LOANS),
    'loans': DEFINED_LOANS,
    'reconciliation_totals': {
        'total_contributions': total_contributed,
        'total_savings': total_savings,
        'total_social': total_social,
        'total_shares': sum(m['shares'] for m in CANONICAL_MEMBERS),
        'total_loan_principal_disbursed': total_loan_principal,
        'total_active_loan_outstanding': total_active_loan_outstanding,
        'active_loans_count': sum(1 for l in DEFINED_LOANS if l['status'] == 'active'),
        'repaid_loans_count': sum(1 for l in DEFINED_LOANS if l['status'] == 'repaid')
    },
    'contributions': all_contributions,
}

print(json.dumps(output, indent=2))
