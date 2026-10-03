const nodes: [number, number, number, string][] = [
  [-2.3, 0.5, 0, '#4768d9'], [-1.1, 1.35, -0.2, '#1f9a67'], [0.2, 0.8, 0.2, '#4768d9'], [1.5, 1.45, -0.15, '#c88823'], [2.3, 0.1, 0, '#4768d9'], [0.9, -0.9, 0.1, '#1f9a67'], [-0.6, -1.2, 0, '#c88823'], [-2, -0.6, -0.1, '#4768d9'],
]

import { Quaternion, Vector3 } from 'three'
import { communityMaterials } from '@/assets/three/materials/community'
import { communityNetwork } from '@/assets/three/models/community-network'

export function CommunityNodes() {
  const up = new Vector3(0, 1, 0)
  return <group>
    {communityNetwork.links.map(([fromIndex, toIndex]) => {
      const from = new Vector3(...communityNetwork.nodes[fromIndex].position)
      const to = new Vector3(...communityNetwork.nodes[toIndex].position)
      const direction = new Vector3().subVectors(to, from)
      const midpoint = new Vector3().addVectors(from, to).multiplyScalar(0.5)
      const orientation = new Quaternion().setFromUnitVectors(up, direction.clone().normalize())
      return <mesh key={`${fromIndex}-${toIndex}`} position={midpoint.toArray()} quaternion={orientation.toArray()}>
        <cylinderGeometry args={[0.014, 0.014, direction.length(), 6]} />
        <meshStandardMaterial {...communityMaterials.connection} transparent opacity={0.75} />
      </mesh>
    })}
    {communityNetwork.nodes.map((node) => {
      const isLedger = node.role === 'ledger'
      return <mesh key={node.id} position={node.position}>
        <sphereGeometry args={[isLedger ? 0.2 : 0.135, 12, 12]} />
        <meshStandardMaterial {...(isLedger ? communityMaterials.ledger : communityMaterials.member)} />
      </mesh>
    })}
  </group>
}
