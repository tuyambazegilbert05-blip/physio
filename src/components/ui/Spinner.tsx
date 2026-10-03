import { BrandLoader } from './BrandLoader'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <BrandLoader variant="inline" label={label} message={label} />
}
