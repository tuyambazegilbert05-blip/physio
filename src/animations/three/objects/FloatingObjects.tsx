export function FloatingObjects() {
  return <group><mesh position={[-1.5, 0.1, -0.8]} rotation={[0.4, 0.2, 0]}><torusGeometry args={[0.35, 0.055, 8, 24]} /><meshStandardMaterial color="#bfcafa" metalness={0.15} roughness={0.45} /></mesh><mesh position={[1.7, -0.8, -0.5]}><icosahedronGeometry args={[0.28, 0]} /><meshStandardMaterial color="#d9e6df" roughness={0.52} /></mesh></group>
}
