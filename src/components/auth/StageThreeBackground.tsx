'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type StageThreeBackgroundProps = {
  className?: string
}

type DisposableResource = { dispose: () => void }
type OrbitMesh = {
  geometry: DisposableResource
  material: DisposableResource
  userData: { radius: number; angle: number; speed: number; yOffset: number }
  position: { x: number; y: number; z: number }
}
type SceneRenderer = {
  domElement: HTMLCanvasElement
  setSize: (width: number, height: number) => void
  setPixelRatio: (ratio: number) => void
  setClearColor: (color: number, alpha: number) => void
  render: (scene: unknown, camera: unknown) => void
  dispose: () => void
}

export function StageThreeBackground({ className = '' }: StageThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Respect user's motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Ensure container has dimensions
    const width = container.clientWidth || 520
    const height = container.clientHeight || 520

    // Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 8.5)

    let renderer: SceneRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // Lighting for glossy 3D spheres
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x7b3ff2, 2.5)
    dirLight1.position.set(5, 5, 4)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0x1fb8f0, 2.0)
    dirLight2.position.set(-5, -3, 3)
    scene.add(dirLight2)

    // Group containing all 3D orbit objects
    const orbitGroup = new THREE.Group()
    scene.add(orbitGroup)

    // Brand Palette: Cobalt, Violet, Cyan, Mint
    const colors = [0x2437f5, 0x7b3ff2, 0x1fb8f0, 0x2de1b9]

    // 1. Create Glossy 3D Spherical Node Meshes in 3D Orbits
    const sphereCount = 28
    const sphereMeshes: OrbitMesh[] = []

    for (let i = 0; i < sphereCount; i++) {
      const radius = i % 3 === 0 ? 2.2 : i % 3 === 1 ? 3.1 : 3.8
      const angle = (i / (sphereCount / 3)) * Math.PI * 2 + (i * 0.2)
      const size = (i % 4 === 0 ? 0.16 : i % 3 === 0 ? 0.12 : 0.08)
      const color = colors[i % colors.length]

      const sphereGeo = new THREE.SphereGeometry(size, 24, 24)
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.65,
        emissive: color,
        emissiveIntensity: 0.25,
      })

      const mesh = new THREE.Mesh(sphereGeo, sphereMat)
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.sin(i * 1.5) * 0.6)
      )

      // Store initial angle & radius for custom orbit motion
      mesh.userData = {
        radius,
        angle,
        speed: (0.15 + (i % 3) * 0.08) * (i % 2 === 0 ? 1 : -0.8),
        yOffset: Math.sin(i * 1.2) * 0.4,
      }

      orbitGroup.add(mesh)
      sphereMeshes.push(mesh)
    }

    // 2. Visible Luminous 3D Orbit Toruses (Tilted in 3D space)
    const torus1Geo = new THREE.TorusGeometry(2.2, 0.018, 16, 120)
    const torus1Mat = new THREE.MeshStandardMaterial({
      color: 0x1fb8f0,
      emissive: 0x1fb8f0,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      transparent: true,
      opacity: 0.55,
    })
    const torus1 = new THREE.Mesh(torus1Geo, torus1Mat)
    torus1.rotation.x = Math.PI * 0.15
    orbitGroup.add(torus1)

    const torus2Geo = new THREE.TorusGeometry(3.1, 0.014, 16, 120)
    const torus2Mat = new THREE.MeshStandardMaterial({
      color: 0x7b3ff2,
      emissive: 0x7b3ff2,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      transparent: true,
      opacity: 0.45,
    })
    const torus2 = new THREE.Mesh(torus2Geo, torus2Mat)
    torus2.rotation.y = Math.PI * 0.12
    orbitGroup.add(torus2)

    const torus3Geo = new THREE.TorusGeometry(3.8, 0.012, 16, 120)
    const torus3Mat = new THREE.MeshStandardMaterial({
      color: 0x2437f5,
      emissive: 0x2437f5,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      transparent: true,
      opacity: 0.4,
    })
    const torus3 = new THREE.Mesh(torus3Geo, torus3Mat)
    torus3.rotation.x = -Math.PI * 0.1
    orbitGroup.add(torus3)

    // 3. Floating Ambient Particle Starfield (NormalBlending for rich visibility)
    const particleCount = 45
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const pColors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.5
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.5

      const c = new THREE.Color(colors[i % colors.length])
      pColors[i * 3] = c.r
      pColors[i * 3 + 1] = c.g
      pColors[i * 3 + 2] = c.b
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3))

    // Dot canvas texture with solid vibrant center
    const dotCanvas = document.createElement('canvas')
    dotCanvas.width = 64
    dotCanvas.height = 64
    const dotCtx = dotCanvas.getContext('2d')
    if (dotCtx) {
      const grad = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)')
      grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      dotCtx.fillStyle = grad
      dotCtx.fillRect(0, 0, 64, 64)
    }

    const dotTexture = new THREE.CanvasTexture(dotCanvas)
    const particleMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      map: dotTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })

    const particlePoints = new THREE.Points(particleGeo, particleMat)
    orbitGroup.add(particlePoints)

    // Cursor Parallax Tracker
    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0

    function handleMouseMove(e: MouseEvent) {
      const rect = container?.getBoundingClientRect()
      if (!rect) return
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Animation Loop
    let animId: number
    const startTime = performance.now()

    function animate() {
      animId = requestAnimationFrame(animate)
      const elapsed = (performance.now() - startTime) / 1000

      // Smooth camera parallax
      currentX += (mouseX * 0.7 - currentX) * 0.06
      currentY += (mouseY * 0.7 - currentY) * 0.06
      camera.position.x = currentX
      camera.position.y = currentY
      camera.lookAt(0, 0, 0)

      // Orbit the 3D sphere meshes in continuous 3D paths
      sphereMeshes.forEach((mesh) => {
        const { radius, speed, yOffset } = mesh.userData
        const currentAngle = mesh.userData.angle + elapsed * speed
        mesh.position.x = Math.cos(currentAngle) * radius
        mesh.position.y = Math.sin(currentAngle) * radius + Math.sin(elapsed * 1.5 + yOffset) * 0.15
        mesh.position.z = Math.sin(currentAngle * 2) * 0.4
      })

      // Gently rotate toruses in 3D
      torus1.rotation.z = elapsed * 0.08
      torus2.rotation.z = -elapsed * 0.06
      torus3.rotation.z = elapsed * 0.04

      // Gently rotate particle starfield
      particlePoints.rotation.z = elapsed * 0.02

      renderer.render(scene, camera)
    }

    animate()

    // Handle container resize
    function handleResize() {
      if (!container) return
      const newW = container.clientWidth || 520
      const newH = container.clientHeight || 520
      camera.aspect = newW / newH
      camera.updateProjectionMatrix()
      renderer.setSize(newW, newH)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // Cleanup
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      resizeObserver.disconnect()
      sphereMeshes.forEach((mesh) => {
        mesh.geometry.dispose()
        mesh.material.dispose()
      })
      torus1Geo.dispose()
      torus1Mat.dispose()
      torus2Geo.dispose()
      torus2Mat.dispose()
      torus3Geo.dispose()
      torus3Mat.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      dotTexture.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    />
  )
}
