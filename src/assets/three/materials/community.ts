export const communityPalette = {
  navy: '#17275a',
  blue: '#4768d9',
  green: '#1f9a67',
  amber: '#c88823',
  paper: '#f5f2e9',
  line: '#cfd7e8',
} as const

export const communityMaterials = {
  member: { color: communityPalette.blue, roughness: 0.5, metalness: 0.04 },
  chair: { color: communityPalette.green, roughness: 0.46, metalness: 0.05 },
  ledger: { color: communityPalette.navy, roughness: 0.38, metalness: 0.1 },
  connection: { color: communityPalette.line, roughness: 0.8, metalness: 0 },
} as const
