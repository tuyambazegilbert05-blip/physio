import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const result = spawnSync('npx', ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'], { encoding: 'utf8', shell: false })
if (result.error) throw result.error
if (result.status !== 0) throw new Error(result.stderr || 'Supabase type generation failed.')
writeFileSync('src/types/database.ts', result.stdout)
console.log('Generated Supabase database types at src/types/database.ts')
