import { BrandLoader } from '@/components/ui/BrandLoader'

export default function Loading() {
  return (
    <main aria-busy="true">
      <BrandLoader label="Loading your Phyaio Cycle workspace" />
    </main>
  )
}
