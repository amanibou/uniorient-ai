import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { CanvasTexture, Color, SRGBColorSpace, Vector3 } from 'three'

const PALETTE = ['#7c3aed', '#db2777', '#06b6d4', '#22c55e', '#f59e0b']
const COLORS = PALETTE.map((hex) => new Color(hex))
const SECONDS_PER_COLOR = 3
const tmpColor = new Color()

// Les 3 spécialités de départ du projet (décoratif, ne change pas le moteur RCR)
const SPECIALTIES = [
  { name: 'Intelligence Artificielle', short: 'IA', color: '#7c3aed' },
  { name: 'Génie Logiciel', short: 'GL', color: '#06b6d4' },
  { name: 'Cybersécurité', short: 'CYS', color: '#f59e0b' },
]

const NODE_COUNT = 80
const SPHERE_RADIUS = 1.3
const LINK_DISTANCE = 0.75
const ORBIT_RADIUS = 1.85

// Répartition régulière de points sur une sphère (spirale de Fibonacci)
function fibonacciSphere(count, radius) {
  const points = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    points.push(
      new Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius),
    )
  }
  return points
}

// Nœuds + liens entre les nœuds assez proches (graphe de connaissances)
function buildGraph(count, radius, maxDist) {
  const points = fibonacciSphere(count, radius)

  const nodePositions = new Float32Array(points.length * 3)
  points.forEach((p, i) => nodePositions.set([p.x, p.y, p.z], i * 3))

  const edgeList = []
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].distanceTo(points[j]) < maxDist) {
        edgeList.push(
          points[i].x, points[i].y, points[i].z,
          points[j].x, points[j].y, points[j].z,
        )
      }
    }
  }

  return { nodePositions, edgePositions: new Float32Array(edgeList) }
}

function KnowledgeSphere() {
  const groupRef = useRef()
  const nodeMatRef = useRef()
  const lineMatRef = useRef()

  const { nodePositions, edgePositions } = useMemo(
    () => buildGraph(NODE_COUNT, SPHERE_RADIUS, LINK_DISTANCE),
    [],
  )

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15
    }

    const t = state.clock.elapsedTime / SECONDS_PER_COLOR
    const i = Math.floor(t) % COLORS.length
    const j = (i + 1) % COLORS.length
    tmpColor.lerpColors(COLORS[i], COLORS[j], t - Math.floor(t))

    if (nodeMatRef.current) nodeMatRef.current.color.copy(tmpColor)
    if (lineMatRef.current) lineMatRef.current.color.copy(tmpColor)
  })

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.6}>
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={nodeMatRef}
            size={0.07}
            sizeAttenuation
            transparent
            opacity={0.95}
          />
        </points>

        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial ref={lineMatRef} transparent opacity={0.35} />
        </lineSegments>
      </group>
    </Float>
  )
}

// Étiquette (IA / GL / CYS) dessinée sur une texture : pas de DOM dans la scène 3D
function makeLabelTexture(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.lineWidth = 6
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.roundRect(8, 16, 240, 96, 48)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = 'bold 48px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 66)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function OrbitLabel({ short, color, offset }) {
  const ref = useRef()
  const texture = useMemo(() => makeLabelTexture(short, color), [short, color])

  useFrame((state) => {
    if (!ref.current) return
    const angle = state.clock.elapsedTime * 0.6 + offset
    ref.current.position.set(
      Math.cos(angle) * ORBIT_RADIUS,
      Math.sin(angle * 0.5) * 0.4,
      Math.sin(angle) * ORBIT_RADIUS,
    )
  })

  return (
    <group ref={ref}>
      <sprite scale={[0.9, 0.45, 1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
    </group>
  )
}

export default function Orb3D({ showLegend = true }) {
  return (
    <div className="orb-wrapper">
      <div className="orb-canvas">
        <Canvas camera={{ position: [0, 0, 5.8], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 3, 5]} intensity={1.2} />
          <KnowledgeSphere />
          {SPECIALTIES.map((s, index) => (
            <OrbitLabel
              key={s.name}
              short={s.short}
              color={s.color}
              offset={(index * 2 * Math.PI) / SPECIALTIES.length}
            />
          ))}
        </Canvas>
      </div>

      {showLegend && (
      <ul className="orb-legend">
        {SPECIALTIES.map((s) => (
          <li key={s.name} className="orb-legend-item">
            <span className="orb-dot" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
