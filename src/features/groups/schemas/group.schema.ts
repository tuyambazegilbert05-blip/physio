import { z } from 'zod'

export const memberFieldSchema = z.object({
  label: z.string().trim().min(1, 'Field label is required').max(120),
  description: z.string().trim().max(500).default(''),
  field_type: z
    .enum(['text', 'textarea', 'number', 'date', 'phone', 'select', 'radio', 'checkbox'])
    .default('text'),
  is_required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  display_order: z.number().int().nonnegative().default(0),
})

export const groupCreateSchema = z.object({
  // Step 1: Basic Information
  name: z
    .string()
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(120, 'Group name cannot exceed 120 characters'),
  description: z.string().trim().max(2000).default(''),
  location: z.string().trim().max(160).optional().nullable(),

  // Step 2: Community & Visibility
  discoverable: z.boolean().default(true),
  currency: z.string().length(3).default('RWF'),

  // Step 3: Operational Cycle & Financial Configuration
  cycle_name: z.string().trim().min(1).max(120).default('Cycle 1'),
  cycle_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  share_unit_price: z.number().positive('Share price must be greater than zero').default(25000),
  contribution_amount: z.number().positive().optional(),
  contribution_frequency: z.enum(['weekly', 'monthly', 'quarterly']).default('monthly'),
  social_contribution: z.number().min(0, 'Social contribution cannot be negative').default(5000),
  loan_max: z.number().positive('Maximum loan limit must be greater than zero').default(2000000),
  rate_up_to_4_months: z.number().min(0).max(100).default(3),
  rate_over_4_months: z.number().min(0).max(100).default(5),
  due_day: z.number().int().min(1).max(28).default(1),

  // Step 4: Rules & Requirements
  rules_title: z.string().trim().max(200).optional().nullable(),
  rules_body: z.string().trim().max(10000).optional().nullable(),
  member_fields: z.array(memberFieldSchema).default([]),
})

export type GroupCreateInput = z.infer<typeof groupCreateSchema>
export type MemberFieldInput = z.infer<typeof memberFieldSchema>

export const groupUpdateSchema = z.object({
  group_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  contribution_amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  contribution_frequency: z.enum(['weekly', 'monthly', 'quarterly']),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
})
