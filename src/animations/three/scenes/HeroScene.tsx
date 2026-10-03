'use client'

import { useEffect, useMemo } from 'react'
import { createLedgerTexture } from '@/assets/three/textures/paper'
import { CommunityNodes } from '../objects/CommunityNodes'
import { FloatingObjects } from '../objects/FloatingObjects'

export function HeroScene() {
  const texture = useMemo(() => createLedgerTexture(), [])
  useEffect(() => () => texture?.dispose(), [texture])

  return <group>
    {texture && <mesh position={[0, 0, -2.6]}>
      <planeGeometry args={[9, 6]} />
      <meshBasicMaterial map={texture} transparent opacity={0.45} depthWrite={false} />
    </mesh>}
    <ambientLight intensity={1.2} />
    <pointLight position={[3, 4, 5]} intensity={1.4} color="#d7e0ff" />
    <CommunityNodes />
    <FloatingObjects />
  </group>
}
