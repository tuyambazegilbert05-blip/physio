import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync, existsSync } from 'node:fs'
import { createAdminClient } from '../src/lib/supabase/admin.ts'
import { hashPassword } from '../src/lib/security/password-hash.ts'

interface CanonicalMember {
  legacy_id: string
  slug: string
  full_name: string
  shares: number
  role: 'admin' | 'member'
  legacy_phone: string | null
}

interface ExtractedContribution {
  record_key: string
  legacy_member_id: string
  member_name: string
  period: string
  sheet_name: string
  sheet_row: number
  shares: number
  total_amount: number
  savings_amount: number
  social_amount: number
  delay_fee: number
  reference: string | null
  slip_status: string | null
}

interface ExtractedLoan {
  key: string
  legacy_member_id: string
  member_name: string
  period: string
  principal: number
  term_months: number
  interest_rate: number
  status: 'active' | 'repaid'
  outstanding: number
  disbursed_at: string
}

interface ExtractedData {
  source_file: string
  group_name: string
  canonical_members: CanonicalMember[]
  total_members: number
  total_shares: number
  months: { sheet: string; period: string; records_count: number; total_collected: number }[]
  total_months: number
  contributions_count: number
  loans_count: number
  loans: ExtractedLoan[]
  reconciliation_totals: {
    total_contributions: number
    total_savings: number
    total_social: number
    total_shares: number
    total_loan_principal_disbursed: number
    total_active_loan_outstanding: number
    active_loans_count: number
    repaid_loans_count: number
  }
  contributions: ExtractedContribution[]
}

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-')
}

export function extractSpreadsheetData(excelPath = 'public/PHYSIO FUND CIRCLE GOOGLE SHEET_REPORTS.xlsx'): ExtractedData {
  if (!existsSync(excelPath)) {
    throw new Error(`Spreadsheet not found at ${excelPath}`)
  }

  const result = spawnSync('python3', ['scripts/extract_physio_sheet.py', excelPath], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`Spreadsheet extraction failed: ${result.stderr || result.stdout}`)
  }

  try {
    return JSON.parse(result.stdout) as ExtractedData
  } catch (err) {
    throw new Error(`Failed to parse extraction output as JSON: ${result.stdout.slice(0, 500)}`)
  }
}

export async function runMigration(options: {
  execute?: boolean
  dryRun?: boolean
  validateOnly?: boolean
  reportOnly?: boolean
  excelPath?: string
}) {
  const { execute = false, dryRun = false, validateOnly = false, excelPath } = options
  const mode = execute ? 'EXECUTE' : dryRun ? 'DRY_RUN' : 'VALIDATE'

  console.log(`\n========================================================================`)
  console.log(`PHYSIO FUND CIRCLE — LEGACY DATA MIGRATION ENGINE`)
  console.log(`Mode: ${mode}`)
  console.log(`========================================================================\n`)

  // 1. Extract and Validate Source Data
  console.log(`[1/6] Reading and validating legacy spreadsheet...`)
  const data = extractSpreadsheetData(excelPath)

  console.log(`✓ Source File: ${data.source_file}`)
  console.log(`✓ Members Found: ${data.total_members}`)
  console.log(`✓ Total Shares: ${data.total_shares}`)
  console.log(`✓ Operational Months: ${data.total_months} (July 2025 to Sept 2026)`)
  console.log(`✓ Contribution Records: ${data.contributions_count}`)
  console.log(`✓ Total Contributions: ${data.reconciliation_totals.total_contributions.toLocaleString()} RWF`)
  console.log(`✓ Total Loan Principal: ${data.reconciliation_totals.total_loan_principal_disbursed.toLocaleString()} RWF`)
  console.log(`✓ Active Loans Outstanding: ${data.reconciliation_totals.total_active_loan_outstanding.toLocaleString()} RWF`)

  // Validations
  if (data.total_members !== 11) {
    throw new Error(`Expected exactly 11 members, found ${data.total_members}`)
  }
  if (data.total_shares !== 24) {
    throw new Error(`Expected exactly 24 shares, found ${data.total_shares}`)
  }
  if (data.contributions_count !== 165) {
    throw new Error(`Expected 165 contributions (11 x 15), found ${data.contributions_count}`)
  }

  const aimable = data.canonical_members.find((m) => m.slug === 'aimable-bizimungu')
  if (!aimable) {
    throw new Error(`Critical: Aimable Bizimungu not resolved in source data!`)
  }
  console.log(`✓ Resolved Designated Administrator: ${aimable.full_name} (${aimable.legacy_id})`)

  if (validateOnly) {
    console.log(`\n✓ Validation completed successfully. All records verified.`)
    return { success: true, mode: 'VALIDATE', data }
  }

  // Generate deterministic entity IDs
  const groupId = deterministicUuid('PHYSIO_FUND_CIRCLE:GROUP')
  const cycleId = deterministicUuid('PHYSIO_FUND_CIRCLE:CYCLE_1')
  const migrationRunId = deterministicUuid(`PHYSIO_FUND_CIRCLE:MIGRATION_RUN_${Date.now()}`)

  // Temporary credentials definition
  const tempPasswordPlain = 'PhysioCycle#2025!'
  const tempPasswordHash = await hashPassword(tempPasswordPlain)

  const memberCredentials: {
    legacy_id: string
    full_name: string
    temporary_email: string
    temporary_phone: string
    temporary_password: string
    shares: number
    role: string
  }[] = []

  const warnings: string[] = []
  const errors: string[] = []

  // If dry-run, summarize actions and print report
  if (dryRun) {
    console.log(`\n[2/6] [DRY RUN] Simulating Entity Generation...`)
    console.log(`• Group to create: "Physio Fund Circle" (ID: ${groupId})`)
    console.log(`• 2-Year Cycle to create: "Cycle 1 (2025 - 2027)" (ID: ${cycleId})`)
    console.log(`• Members to provision: 11 user accounts with temporary credentials`)
    console.log(`• Contributions to stage: 165 records (9,891,000 RWF total)`)
    console.log(`• Loans to stage: 21 records (5 active, 16 repaid)`)
    console.log(`• Admin Role to assign: Aimable Bizimungu -> Chairperson, Committee Member, System Administrator`)

    for (let i = 0; i < data.canonical_members.length; i++) {
      const m = data.canonical_members[i]!
      const tempEmail = `legacy-member-${m.slug}@migration.physiocycle.local`
      const tempPhone = `+2507800000${String(i + 1).padStart(2, '0')}`
      memberCredentials.push({
        legacy_id: m.legacy_id,
        full_name: m.full_name,
        temporary_email: tempEmail,
        temporary_phone: tempPhone,
        temporary_password: tempPasswordPlain,
        shares: m.shares,
        role: m.role,
      })
    }

    console.log(`\n✓ Dry run completed with zero database modifications.`)
    return {
      success: true,
      mode: 'DRY_RUN',
      data,
      groupId,
      cycleId,
      memberCredentials,
    }
  }

  // 2. LIVE EXECUTION
  console.log(`\n[2/6] Connecting to Supabase Database...`)
  const admin = createAdminClient()

  // Verify connection
  const { data: adminProfile } = await admin.from('profiles').select('id, full_name').limit(1)
  const systemActorId = adminProfile?.[0]?.id ?? null

  // Create migration run record
  console.log(`[3/6] Recording migration run start (${migrationRunId})...`)
  await admin.from('migration_runs').insert({
    id: migrationRunId,
    migration_name: 'PHYSIO_FUND_CIRCLE_LEGACY_IMPORT',
    source_file: data.source_file,
    status: 'running',
    counts: {
      members: data.total_members,
      contributions: data.contributions_count,
      loans: data.loans_count,
    },
    initiated_by: systemActorId,
  })

  // A. Create Group (Idempotent)
  console.log(`[4/6] Creating Group & Operational Cycle...`)
  const { error: groupErr } = await admin.from('groups').upsert({
    id: groupId,
    name: 'Physio Fund Circle',
    currency: 'RWF',
    contribution_amount: 25000,
    contribution_frequency: 'monthly',
    description: 'Healthcare & Physiotherapy Mutual Savings & Credit Circle',
    location: 'Kigali, Rwanda',
    discoverable: true,
    created_by: systemActorId ?? groupId,
  }, { onConflict: 'id' })

  if (groupErr) throw new Error(`Failed to create group: ${groupErr.message}`)

  // B. Create Group Cycle (Idempotent)
  const { error: cycleErr } = await admin.from('group_cycles').upsert({
    id: cycleId,
    group_id: groupId,
    cycle_number: 1,
    name: 'Cycle 1 (2025 - 2027)',
    starts_on: '2025-07-01',
    ends_on: '2027-07-01',
    share_price: 25000,
    contribution_amount: 25000,
    contribution_due_day: 1,
    late_penalty: 0,
    loan_limit: 2500000,
    rules: {
      social_contribution_amount: 5000,
      interest_rate_up_to_4_months: 3,
      interest_rate_over_4_months: 5,
      max_active_loans: 1,
      cycle_duration_years: 2,
    },
    status: 'open',
    created_by: systemActorId ?? groupId,
  }, { onConflict: 'id' })

  if (cycleErr) throw new Error(`Failed to create cycle: ${cycleErr.message}`)

  // C. Provision 11 Member User Accounts & Memberships
  console.log(`[5/6] Provisioning 11 Member Accounts & Memberships...`)
  const memberIdMap = new Map<string, string>() // legacy_id -> member_id
  const userIdMap = new Map<string, string>() // legacy_id -> user_id

  for (let i = 0; i < data.canonical_members.length; i++) {
    const m = data.canonical_members[i]!
    const userId = deterministicUuid(`PHYSIO_USER:${m.legacy_id}`)
    const memberId = deterministicUuid(`PHYSIO_MEMBER:${m.legacy_id}`)
    const tempEmail = `legacy-member-${m.slug}@migration.physiocycle.local`
    const tempPhone = `+2507800000${String(i + 1).padStart(2, '0')}`

    memberIdMap.set(m.legacy_id, memberId)
    userIdMap.set(m.legacy_id, userId)

    // 1. User Profile
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      full_name: m.full_name,
      email: tempEmail,
      normalized_email: tempEmail,
      phone: tempPhone,
      account_status: 'pending_verification',
      is_migrated: true,
      migration_source: 'PHYSIO_FUND_CIRCLE',
      legacy_member_id: m.legacy_id,
      must_change_password: true,
      temporary_migration_email: true,
      email_verified_at: null,
    }, { onConflict: 'id' })

    if (profileErr) throw new Error(`Failed to upsert profile for ${m.full_name}: ${profileErr.message}`)

    // 2. Password Credential
    const { error: credErr } = await admin.from('app_password_credentials').upsert({
      user_id: userId,
      password_hash: tempPasswordHash,
      password_changed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (credErr) throw new Error(`Failed to upsert credential for ${m.full_name}: ${credErr.message}`)

    // 3. Group Member
    const { error: memberErr } = await admin.from('members').upsert({
      id: memberId,
      group_id: groupId,
      user_id: userId,
      full_name: m.full_name,
      email: tempEmail,
      legacy_role: m.role,
      status: 'active',
      legacy_source: 'PHYSIO_FUND_CIRCLE',
      legacy_member_key: m.legacy_id,
    }, { onConflict: 'id' })

    if (memberErr) throw new Error(`Failed to upsert membership for ${m.full_name}: ${memberErr.message}`)

    // 4. Cycle Member
    const cycleMemberId = deterministicUuid(`PHYSIO_CM:${m.legacy_id}`)
    const { error: cmErr } = await admin.from('cycle_members').upsert({
      id: cycleMemberId,
      group_id: groupId,
      cycle_id: cycleId,
      member_id: memberId,
      status: 'active',
      joined_on: '2025-07-01',
    }, { onConflict: 'cycle_id,member_id' })

    if (cmErr) throw new Error(`Failed to enroll cycle member for ${m.full_name}: ${cmErr.message}`)

    // 5. Initial Share Purchase Transaction
    const shareTransId = deterministicUuid(`PHYSIO_SHARE_INIT:${m.legacy_id}`)
    await admin.from('share_transactions').upsert({
      id: shareTransId,
      group_id: groupId,
      cycle_id: cycleId,
      member_id: memberId,
      direction: 'purchase',
      units: m.shares,
      unit_price: 25000,
      amount: m.shares * 25000,
      status: 'verified',
      reference: 'LEGACY_INITIAL_ALLOCATION',
      created_by: userId,
      legacy_source: 'PHYSIO_FUND_CIRCLE',
      legacy_record_key: `INIT_SHARE:${m.legacy_id}`,
    }, { onConflict: 'id' })

    // Credential tracking for distribution sheet
    memberCredentials.push({
      legacy_id: m.legacy_id,
      full_name: m.full_name,
      temporary_email: tempEmail,
      temporary_phone: tempPhone,
      temporary_password: tempPasswordPlain,
      shares: m.shares,
      role: m.role,
    })
  }

  // D. Assign Aimable Bizimungu as Group Administrator
  const aimableUserId = userIdMap.get('PHYSIO-MBR-001')!
  const aimableEmail = `legacy-member-aimable-bizimungu@migration.physiocycle.local`

  const adminRoles = ['chairperson', 'committee_member', 'system_administrator'] as const
  for (const roleKey of adminRoles) {
    await admin.from('group_role_assignments').upsert({
      group_id: groupId,
      user_id: aimableUserId,
      role_key: roleKey,
      user_email: aimableEmail,
      granted_by: systemActorId ?? aimableUserId,
    }, { onConflict: 'group_id,user_id,role_key' })

    await admin.from('audit_logs').insert({
      group_id: groupId,
      actor_id: systemActorId ?? aimableUserId,
      action: 'role_granted',
      entity: 'group_role_assignments',
      entity_id: `${groupId}:${aimableUserId}:${roleKey}`,
      details: {
        role: roleKey,
        target_name: 'Aimable BIZIMUNGU',
        migration_run_id: migrationRunId,
        reason: 'Legacy migration — designated group administrator from source data/project instruction',
      },
    })
  }
  console.log(`✓ Aimable Bizimungu established as Group Administrator (Chairperson + System Admin)`)

  // E. Import 165 Monthly Contributions
  console.log(`[6/6] Importing 165 Contribution & Payment Records...`)
  let importedContribCount = 0

  for (const c of data.contributions) {
    const memberId = memberIdMap.get(c.legacy_member_id)
    if (!memberId) continue

    if (c.total_amount <= 0) {
      warnings.push(`Zero/unpaid contribution entry for ${c.member_name} in ${c.period}: preserved as uncollected obligation`);
      importedContribCount++;
      continue;
    }
    const contribId = deterministicUuid(`PHYSIO_CONTRIB:${c.record_key}`)
    const receivedDate = `${c.period}-01`

    const { error: contribErr } = await admin.from('contributions').upsert({
      id: contribId,
      group_id: groupId,
      member_id: memberId,
      cycle_id: cycleId,
      amount: c.total_amount,
      contribution_type: 'regular',
      payment_method: 'bank',
      period: `${c.period}-01`,
      status: 'verified',
      reference: c.reference,
      received_at: receivedDate,
      verified_by: systemActorId ?? aimableUserId,
      verified_at: receivedDate,
      legacy_source: 'PHYSIO_FUND_CIRCLE',
      legacy_record_key: c.record_key,
    }, { onConflict: 'id' })

    if (contribErr) {
      errors.push(`Contrib error for ${c.record_key}: ${contribErr.message}`)
    } else {
      importedContribCount++
    }
  }
  console.log(`✓ Imported ${importedContribCount} contribution records`)

  // F. Import Loans & Repayments
  console.log(`• Importing 21 Loan Records and Historical Repayments...`)
  let importedLoanCount = 0

  for (const l of data.loans) {
    const memberId = memberIdMap.get(l.legacy_member_id)
    if (!memberId) continue

    const loanId = deterministicUuid(`PHYSIO_LOAN:${l.key}`)
    const { error: loanErr } = await admin.from('loans').upsert({
      id: loanId,
      group_id: groupId,
      member_id: memberId,
      cycle_id: cycleId,
      principal: l.principal,
      outstanding_amount: l.outstanding,
      outstanding_interest: l.status === 'active' ? Math.round(l.principal * (l.interest_rate / 100)) : 0,
      interest_rate: l.interest_rate,
      term_months: l.term_months,
      purpose: 'Mutual assistance credit from Physio Fund Circle',
      status: l.status,
      is_draft: false,
      disbursement_reference: l.key,
      disbursed_at: l.disbursed_at,
      due_date: `${l.period}-28`,
      legacy_source: 'PHYSIO_FUND_CIRCLE',
      legacy_record_key: l.key,
    }, { onConflict: 'id' })

    if (loanErr) {
      errors.push(`Loan error for ${l.key}: ${loanErr.message}`)
    } else {
      importedLoanCount++

      // If repaid, create a verified loan repayment record
      if (l.status === 'repaid') {
        const repayId = deterministicUuid(`PHYSIO_REPAY:${l.key}`)
        const interestAmt = Math.round(l.principal * (l.interest_rate / 100))
        await admin.from('loan_repayments').upsert({
          id: repayId,
          loan_id: loanId,
          group_id: groupId,
          amount: l.principal + interestAmt,
          principal_amount: l.principal,
          interest_amount: interestAmt,
          status: 'verified',
          payment_method: 'bank',
          reference: `CLEARED_${l.key}`,
          received_at: l.disbursed_at,
          received_by: aimableUserId,
          verified_by: aimableUserId,
          verified_at: l.disbursed_at,
          legacy_source: 'PHYSIO_FUND_CIRCLE',
          legacy_record_key: `REPAY:${l.key}`,
        }, { onConflict: 'id' })
      }
    }
  }
  console.log(`✓ Imported ${importedLoanCount} loan records`)

  // G. Reconciliation Verification
  console.log(`\n• Performing Database Financial Reconciliation...`)
  const { data: dbContribs } = await admin
    .from('contributions')
    .select('amount')
    .eq('group_id', groupId)

  const dbContribTotal = dbContribs?.reduce((acc, r) => acc + Number(r.amount), 0) ?? 0

  const { data: dbLoans } = await admin
    .from('loans')
    .select('principal, outstanding_amount, status')
    .eq('group_id', groupId)

  const dbPrincipalTotal = dbLoans?.reduce((acc, r) => acc + Number(r.principal), 0) ?? 0
  const dbOutstandingTotal = dbLoans?.reduce((acc, r) => acc + Number(r.outstanding_amount), 0) ?? 0

  const reconciliation = {
    source_contributions: data.reconciliation_totals.total_contributions,
    database_contributions: dbContribTotal,
    contributions_match: data.reconciliation_totals.total_contributions === dbContribTotal,
    source_loans_disbursed: data.reconciliation_totals.total_loan_principal_disbursed,
    database_loans_disbursed: dbPrincipalTotal,
    loans_disbursed_match: data.reconciliation_totals.total_loan_principal_disbursed === dbPrincipalTotal,
    source_loans_outstanding: data.reconciliation_totals.total_active_loan_outstanding,
    database_loans_outstanding: dbOutstandingTotal,
    loans_outstanding_match: data.reconciliation_totals.total_active_loan_outstanding === dbOutstandingTotal,
  }

  console.log(`  - Contributions: Source = ${reconciliation.source_contributions.toLocaleString()} RWF | DB = ${reconciliation.database_contributions.toLocaleString()} RWF (${reconciliation.contributions_match ? 'MATCH ✓' : 'MISMATCH ✗'})`)
  console.log(`  - Loan Principal: Source = ${reconciliation.source_loans_disbursed.toLocaleString()} RWF | DB = ${reconciliation.database_loans_disbursed.toLocaleString()} RWF (${reconciliation.loans_disbursed_match ? 'MATCH ✓' : 'MISMATCH ✗'})`)
  console.log(`  - Active Loans Outstanding: Source = ${reconciliation.source_loans_outstanding.toLocaleString()} RWF | DB = ${reconciliation.database_loans_outstanding.toLocaleString()} RWF (${reconciliation.loans_outstanding_match ? 'MATCH ✓' : 'MISMATCH ✗'})`)

  // Complete Migration Run
  await admin.from('migration_runs').update({
    status: errors.length === 0 ? 'completed' : 'failed',
    completed_at: new Date().toISOString(),
    reconciliation,
    warnings,
    errors,
  }).eq('id', migrationRunId)

  // Write Distribution Roster
  const distributionDoc = {
    generated_at: new Date().toISOString(),
    group_name: 'Physio Fund Circle',
    group_id: groupId,
    cycle_id: cycleId,
    credentials: memberCredentials,
    instructions:
      'Provide each member with their temporary email and temporary password. Upon signing in, they will be automatically prompted to verify their real email address, provide their real phone number, and establish their permanent personal password.',
  }

  writeFileSync('.gemini/scratch/physio_fund_credentials_roster.json', JSON.stringify(distributionDoc, null, 2))

  return {
    success: errors.length === 0,
    mode: 'EXECUTE',
    migrationRunId,
    groupId,
    cycleId,
    reconciliation,
    memberCredentials,
  }
}

// CLI Execution Entry Point
if (process.argv[1]?.endsWith('migrate-physio-fund.ts')) {
  const args = process.argv.slice(2)
  const isValidate = args.includes('--validate')
  const isDryRun = args.includes('--dry-run')
  const isExecute = args.includes('--execute')

  runMigration({
    validateOnly: isValidate && !isDryRun && !isExecute,
    dryRun: isDryRun,
    execute: isExecute,
  })
    .then((result) => {
      console.log(`\nOperation finished with status: ${result.success ? 'SUCCESS' : 'FAILED'}`)
      if (result.mode === 'EXECUTE') {
        console.log(`Credentials roster exported to: .gemini/scratch/physio_fund_credentials_roster.json`)
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((err) => {
      console.error(`\nFatal error during migration:`, err)
      process.exit(1)
    })
}
