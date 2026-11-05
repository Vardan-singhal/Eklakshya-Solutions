"use client";

import { ScenePreparation } from "./ScenePreparation";
import { servicePixelRatio } from "./useGraphics";
import { SceneCompilation } from "./SceneCompilation";
import { SceneWarmup } from "./SceneWarmup";

/** Model-only adaptation of seo three.js/src/SeoScene.jsx.
 * The existing service card provides layout and decoration; preview HTML is excluded. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useReducer, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

/* Five procedural models share one small timelineRef; no downloaded assets or fonts. */
const GOLD = '#f5c451'
const CYAN = '#6cc7e8'
const CORAL = '#ff6b6b'
const DURATION = 4.5

const STAGES = [
  { short: 'Demand', title: 'Buyers are already looking', description: 'Meet the people searching for exactly what you sell.' },
  { short: 'Audit', title: 'A healthier website', description: 'Find and fix the technical details holding your site back.' },
  { short: 'Schema', title: 'Stand out in search', description: 'Give search engines the context to show richer results.' },
  { short: 'Keywords', title: 'Find the missed opportunities', description: 'Discover high-intent searches your competitors overlook.' },
  { short: 'Results', title: 'More visibility. More enquiries.', description: 'Move up the results and turn search traffic into conversations.' },
]

const INDUSTRIES = {
  steel: {
    label: 'Steel',
    query: 'steel pipe manufacturer in india',
    searches: 12400,
    product: 'Industrial steel pipe',
    service: 'Steel fabrication',
    price: 'INR 68,400 / MT',
    location: 'Pune, Maharashtra',
    serp: 'Steel Pipe Manufacturer in India',
    keywords: [
      { id: 's1', name: 'ms pipe supplier', volume: '8,100', difficulty: 21, intent: 96, score: 92, kind: 'gap', p: [-1.12, -0.58, 0.5], r: 0.18 },
      { id: 's2', name: 'steel pipe price', volume: '6,600', difficulty: 28, intent: 88, score: 86, kind: 'gap', p: [0.26, -0.9, 0.65], r: 0.16 },
      { id: 's3', name: 'pipe mill near me', volume: '3,200', difficulty: 16, intent: 98, score: 95, kind: 'gap', p: [1.15, -0.46, 0.2], r: 0.14 },
      { id: 's4', name: 'ms pipe manufacturer', volume: '12,100', difficulty: 45, intent: 92, score: 68, kind: 'own', p: [-0.38, 0.18, -0.2], r: 0.19 },
      { id: 's5', name: 'gi pipe distributor', volume: '4,400', difficulty: 38, intent: 80, score: 70, kind: 'own', p: [0.75, 0.16, 0.4], r: 0.14 },
    ],
  },
  packaging: {
    label: 'Packaging',
    query: 'corrugated box manufacturer near me',
    searches: 8900,
    product: 'Custom corrugated box',
    service: 'Packaging design',
    price: 'INR 18 / BOX',
    location: 'Mumbai, Maharashtra',
    serp: 'Corrugated Box Manufacturer',
    keywords: [
      { id: 'p1', name: 'custom printed cartons', volume: '6,600', difficulty: 23, intent: 93, score: 91, kind: 'gap', p: [-1.12, -0.58, 0.5], r: 0.18 },
      { id: 'p2', name: 'carton box bulk order', volume: '5,400', difficulty: 25, intent: 91, score: 89, kind: 'gap', p: [0.26, -0.9, 0.65], r: 0.16 },
      { id: 'p3', name: 'packaging supplier pune', volume: '2,900', difficulty: 18, intent: 97, score: 94, kind: 'gap', p: [1.15, -0.46, 0.2], r: 0.14 },
      { id: 'p4', name: 'corrugated box maker', volume: '9,900', difficulty: 41, intent: 94, score: 72, kind: 'own', p: [-0.38, 0.18, -0.2], r: 0.19 },
      { id: 'p5', name: 'five ply box supplier', volume: '3,600', difficulty: 36, intent: 83, score: 74, kind: 'own', p: [0.75, 0.16, 0.4], r: 0.14 },
    ],
  },
  electronics: {
    label: 'Electronics',
    query: 'pcb assembly manufacturer india',
    searches: 6200,
    product: 'PCB assembly service',
    service: 'Electronics manufacturing',
    price: 'INR 420 / BOARD',
    location: 'Bengaluru, Karnataka',
    serp: 'PCB Assembly Manufacturer India',
    keywords: [
      { id: 'e1', name: 'smt assembly provider', volume: '5,400', difficulty: 24, intent: 94, score: 90, kind: 'gap', p: [-1.12, -0.58, 0.5], r: 0.18 },
      { id: 'e2', name: 'pcb prototype builder', volume: '4,400', difficulty: 20, intent: 89, score: 92, kind: 'gap', p: [0.26, -0.9, 0.65], r: 0.16 },
      { id: 'e3', name: 'ems provider india', volume: '2,400', difficulty: 27, intent: 95, score: 88, kind: 'gap', p: [1.15, -0.46, 0.2], r: 0.14 },
      { id: 'e4', name: 'pcb assembly service', volume: '8,100', difficulty: 43, intent: 92, score: 71, kind: 'own', p: [-0.38, 0.18, -0.2], r: 0.19 },
      { id: 'e5', name: 'pcba manufacturer', volume: '3,600', difficulty: 37, intent: 87, score: 73, kind: 'own', p: [0.75, 0.16, 0.4], r: 0.14 },
    ],
  },
}

const ISSUES = [
  { id: 'lcp', title: 'Slow LCP', level: 'High', fix: 'Optimise and preload the largest page element.', tick: 7 },
  { id: 'meta', title: 'Missing meta', level: 'High', fix: 'Add unique search titles and descriptions.', tick: 19 },
  { id: 'link', title: 'Broken link', level: 'Med', fix: 'Restore or redirect the broken destination.', tick: 34 },
  { id: 'duplicate', title: 'Duplicate title', level: 'Med', fix: 'Give each indexable page a distinct title.', tick: 49 },
  { id: 'sitemap', title: 'No sitemap', level: 'Low', fix: 'Generate and submit an XML sitemap.', tick: 66 },
]

const clamp = THREE.MathUtils.clamp
const damp = THREE.MathUtils.damp
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
const formatNumber = (n) => Math.round(n).toLocaleString('en-IN')

function seeded(seed) {
  let value = seed >>> 0
  return () => {
    value = (1664525 * value + 1013904223) >>> 0
    return value / 4294967296
  }
}

function roundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function makeCanvasTexture(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  return { canvas, ctx: canvas.getContext('2d'), texture, width, height }
}

function makeGlowTexture() {
  const { ctx, texture } = makeCanvasTexture(64, 64)
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  texture.needsUpdate = true
  return texture
}

function Timeline({ timelineRef, playing, advance }) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timelineRef.current.time += dt
    timelineRef.current.elapsed += dt
    timelineRef.current.progress = clamp(timelineRef.current.elapsed / DURATION, 0, 1)
    for (let i = 0; i < STAGES.length; i += 1) {
      timelineRef.current.weights[i] = damp(timelineRef.current.weights[i], timelineRef.current.stage === i ? 1 : 0, 7, dt)
    }
    if (playing && timelineRef.current.elapsed >= DURATION) advance()
  }, -3)
  return null
}

function ReturningOrbit({ onManual }) {
  const ref = useRef(null)
  const returning = useRef(false)
  const home = useMemo(() => new THREE.Vector3(0, 0, 9), [])

  useFrame((state, delta) => {
    if (!returning.current || !ref.current) return
    state.camera.position.lerp(home, 1 - Math.exp(-2.4 * Math.min(delta, 0.05)))
    state.camera.lookAt(0, 0, 0)
    if (state.camera.position.distanceToSquared(home) < 0.0005) returning.current = false
  })

  return (
    <OrbitControls
      ref={ref}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.09}
      rotateSpeed={0.45}
      minPolarAngle={1.0}
      maxPolarAngle={2.1}
      minAzimuthAngle={-0.75}
      maxAzimuthAngle={0.75}
      onStart={() => { returning.current = false; onManual() }}
      onEnd={() => { returning.current = true }}
    />
  )
}

function World({ timelineRef, children }) {
  const ref = useRef(null)
  const size = useThree((state) => state.size)
  useFrame((state, delta) => {
    if (!ref.current) return
    const dt = Math.min(delta, 0.05)
    const scale = clamp((size.width / Math.max(size.height, 1)) / 0.93, 0.58, 1)
    ref.current.rotation.y = damp(ref.current.rotation.y, state.pointer.x * 0.11, 3, dt)
    ref.current.rotation.x = damp(ref.current.rotation.x, -state.pointer.y * 0.07, 3, dt)
    ref.current.position.y = damp(ref.current.position.y, 0.08 + Math.sin(timelineRef.current.time * 0.65) * 0.055, 3, dt)
    ref.current.scale.setScalar(damp(ref.current.scale.x, scale, 5, dt))
  })
  return <group ref={ref}>{children}</group>
}

function StageGroup({ index, timelineRef, children }) {
  const ref = useRef(null)
  useFrame(() => {
    if (!ref.current) return
    const weight = timelineRef.current.weights[index]
    ref.current.visible = weight > 0.012
    ref.current.scale.setScalar(Math.max(0.001, ease(weight)))
  })
  return <group ref={ref} visible={index === 0}>{children}</group>
}

function OrbitRing({ radius, color, rotation, opacity = 0.45 }) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, 0.005, 4, 144]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function makeNetwork() {
  const points = []
  const edges = []
  const count = 42
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const a = i * 2.399963
    points.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius).multiplyScalar(1.02))
  }
  const seen = new Set()
  points.forEach((point, index) => {
    const closest = points.map((other, j) => ({ j, distance: point.distanceToSquared(other) }))
      .filter((item) => item.j !== index).sort((a, b) => a.distance - b.distance).slice(0, 3)
    closest.forEach(({ j }) => {
      const key = [Math.min(index, j), Math.max(index, j)].join(':')
      if (seen.has(key)) return
      seen.add(key)
      edges.push(point.x, point.y, point.z, points[j].x, points[j].y, points[j].z)
    })
  })
  return { points, edges: new Float32Array(edges) }
}

function NetworkCore({ timelineRef, gold, cyan }) {
  const core = useRef(null)
  const rings = useRef(null)
  const nodes = useRef(null)
  const satellites = useRef([])
  const network = useMemo(() => makeNetwork(), [])
  const glow = useMemo(() => makeGlowTexture(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => () => glow.dispose(), [glow])
  useLayoutEffect(() => {
    if (!nodes.current) return
    network.points.forEach((point, index) => {
      dummy.position.copy(point)
      dummy.scale.setScalar(index % 6 === 0 ? 1.5 : 1)
      dummy.updateMatrix()
      nodes.current.setMatrixAt(index, dummy.matrix)
    })
    nodes.current.instanceMatrix.needsUpdate = true
  }, [network, dummy])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (core.current) core.current.rotation.y += dt * 0.12
    if (rings.current) rings.current.rotation.z += dt * 0.035
    satellites.current.forEach((satellite, index) => {
      if (!satellite) return
      const angle = timelineRef.current.time * (index % 2 ? -0.34 : 0.3) + index * 2.1
      satellite.position.set(Math.cos(angle) * (1.48 + index * 0.13), Math.sin(angle) * (0.48 + index * 0.08), Math.sin(angle) * 0.35)
    })
  })

  return (
    <group>
      <group ref={rings} rotation={[0.15, 0, -0.12]}>
        <OrbitRing radius={1.48} color={gold} rotation={[1.08, 0.08, 0.16]} opacity={0.66} />
        <OrbitRing radius={1.7} color={cyan} rotation={[1.25, 0.28, -0.35]} opacity={0.45} />
        <OrbitRing radius={1.92} color={gold} rotation={[0.95, -0.35, 0.35]} opacity={0.23} />
      </group>
      <group ref={core} rotation={[0.18, 0, 0.14]}>
        <mesh>
          <sphereGeometry args={[0.99, 32, 24]} />
          <meshBasicMaterial color="#19150e" transparent opacity={0.74} />
        </mesh>
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[network.edges, 3]} /></bufferGeometry>
          <lineBasicMaterial color={gold} transparent opacity={0.48} depthWrite={false} />
        </lineSegments>
        <instancedMesh ref={nodes} args={[null, null, network.points.length]} frustumCulled={false}>
          <sphereGeometry args={[0.027, 8, 6]} />
          <meshBasicMaterial color={gold} />
        </instancedMesh>
        <mesh>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshBasicMaterial color={gold} wireframe transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <sprite scale={[2.05, 2.05, 1]} position={[0, 0, 0.25]}>
        <spriteMaterial map={glow} color={gold} transparent opacity={0.23} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { satellites.current[i] = el }}>
          <sphereGeometry args={[i === 1 ? 0.055 : 0.04, 10, 8]} />
          <meshBasicMaterial color={i === 1 ? cyan : gold} />
        </mesh>
      ))}
    </group>
  )
}

function BuyerStream({ timelineRef, cyan }) {
  const ref = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => {
    const random = seeded(4201)
    return Array.from({ length: 120 }, () => ({
      angle: random() * Math.PI * 2,
      phase: random(),
      depth: (random() - 0.5) * 1.9,
      size: 0.6 + random() * 0.9,
      speed: 0.11 + random() * 0.08,
    }))
  }, [])

  useFrame(() => {
    if (!ref.current || timelineRef.current.weights[0] < 0.01) return
    particles.forEach((particle, index) => {
      const travel = (particle.phase + timelineRef.current.time * particle.speed) % 1
      const radius = 1.08 + (1 - travel) * 1.65
      const angle = particle.angle + travel * 0.4
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.77, particle.depth * (1 - travel * 0.5))
      dummy.scale.setScalar(particle.size * (0.013 + 0.016 * Math.sin(Math.PI * travel)))
      dummy.updateMatrix()
      ref.current.setMatrixAt(index, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, particles.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color={cyan} transparent opacity={0.92} />
    </instancedMesh>
  )
}

function DemandModel({ timelineRef, data, active, gold, cyan }) {
  return (
    <StageGroup index={0} timelineRef={timelineRef}>
      <BuyerStream timelineRef={timelineRef} cyan={cyan} />
      <NetworkCore timelineRef={timelineRef} gold={gold} cyan={cyan} />
      {null}
    </StageGroup>
  )
}

const TREE_POINTS = [
  [0, 0], [-0.69, 0.42], [0, 0.74], [0.7, 0.4], [0.79, -0.38],
  [0, -0.72], [-0.78, -0.4], [-1.04, 0.08], [-0.4, 0.92], [0.4, 0.92],
  [0.43, -0.89], [-0.43, -0.89],
]
const TREE_EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8], [3, 9], [4, 10], [6, 11]]
const TREE_LABELS = [
  { name: 'HOME', position: [0, 0.26, 0.1] },
  { name: 'PRODUCTS', position: [-0.69, 0.62, 0.1] },
  { name: 'SERVICES', position: [0.7, 0.6, 0.1] },
  { name: 'BLOG', position: [-0.78, -0.6, 0.1] },
  { name: 'CONTACT', position: [0.79, -0.58, 0.1] },
]

function SitemapTree({ fixed, active, gold, cyan }) {
  const lines = useMemo(() => {
    const positions = []
    TREE_EDGES.forEach(([a, b]) => positions.push(TREE_POINTS[a][0], TREE_POINTS[a][1], 0, TREE_POINTS[b][0], TREE_POINTS[b][1], 0))
    return new Float32Array(positions)
  }, [])
  return (
    <group position={[-0.36, 0.04, 0.25]}>
      <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines, 3]} /></bufferGeometry>
        <lineBasicMaterial color={gold} transparent opacity={0.36} depthWrite={false} />
      </lineSegments>
      {TREE_POINTS.map(([x, y], i) => (
        <group key={i} position={[x, y, 0.02]}>
          <mesh><circleGeometry args={[i === 0 ? 0.15 : 0.075, 24]} /><meshBasicMaterial color="#191710" /></mesh>
          <mesh><ringGeometry args={[i === 0 ? 0.137 : 0.063, i === 0 ? 0.15 : 0.075, 24]} />
            <meshBasicMaterial color={i > 0 && i <= fixed.length ? cyan : gold} transparent opacity={0.95} />
          </mesh>
          <mesh position={[0, 0, 0.02]}><circleGeometry args={[i === 0 ? 0.029 : 0.015, 12]} /><meshBasicMaterial color={i > 0 && i <= fixed.length ? cyan : gold} /></mesh>
        </group>
      ))}
      {TREE_LABELS.map((label) => (
        null
      ))}
      {null}
    </group>
  )
}

function AuditDial({ timelineRef, fixed, gold, cyan }) {
  const ticks = useRef(null)
  const sweep = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const dim = useMemo(() => new THREE.Color('#5d5645'), [])
  const bright = useMemo(() => new THREE.Color(cyan), [cyan])
  const error = useMemo(() => new THREE.Color(CORAL), [])

  useFrame(() => {
    if (!ticks.current || timelineRef.current.weights[1] < 0.01) return
    const angle = (timelineRef.current.time * 1.15) % (Math.PI * 2)
    if (sweep.current) sweep.current.rotation.z = angle
    for (let i = 0; i < 80; i += 1) {
      const a = (i / 80) * Math.PI * 2
      dummy.position.set(Math.cos(a) * 1.66, Math.sin(a) * 1.66, 0)
      dummy.rotation.set(0, 0, a - Math.PI / 2)
      dummy.scale.set(1, i % 10 === 0 ? 1.6 : 1, 1)
      dummy.updateMatrix()
      ticks.current.setMatrixAt(i, dummy.matrix)
      const issue = ISSUES.find((item) => item.tick === i)
      color.copy(issue ? (fixed.includes(issue.id) ? bright : error) : dim)
      if (!issue && a < angle) color.lerp(bright, 0.68)
      ticks.current.setColorAt(i, color)
    }
    ticks.current.instanceMatrix.needsUpdate = true
    if (ticks.current.instanceColor) ticks.current.instanceColor.needsUpdate = true
  })

  return (
    <group position={[-0.36, 0.04, 0]} rotation={[-0.12, 0.14, 0]}>
      <OrbitRing radius={1.79} color={gold} rotation={[0, 0, 0]} opacity={0.22} />
      <OrbitRing radius={1.42} color={cyan} rotation={[0, 0, 0]} opacity={0.22} />
      <instancedMesh ref={ticks} args={[null, null, 80]} frustumCulled={false}>
        <boxGeometry args={[0.018, 0.11, 0.018]} />
        <meshBasicMaterial />
      </instancedMesh>
      <group ref={sweep}>
        <mesh><circleGeometry args={[1.48, 48, -0.42, 0.42]} /><meshBasicMaterial color={cyan} transparent opacity={0.055} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0.72, 0, 0]}><planeGeometry args={[1.44, 0.008]} /><meshBasicMaterial color={cyan} transparent opacity={0.6} /></mesh>
      </group>
    </group>
  )
}

function AuditModel({ timelineRef, fixed, active, gold, cyan }) {
  return (
    <StageGroup index={1} timelineRef={timelineRef}>
      <AuditDial timelineRef={timelineRef} fixed={fixed} gold={gold} cyan={cyan} />
      <SitemapTree fixed={fixed} active={active} gold={gold} cyan={cyan} />
    </StageGroup>
  )
}

function drawStar(ctx, x, y, radius, color) {
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? radius : radius * 0.44
    const px = x + Math.cos(angle) * r
    const py = y + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawSchemaTexture(target, type, data, enabled, faqOpen, gold, cyan) {
  const { ctx, width: w, height: h, texture } = target
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = enabled ? '#171c1c' : '#191610'
  roundedRect(ctx, 2, 2, w - 4, h - 4, 18)
  ctx.fill()
  ctx.strokeStyle = enabled ? cyan : '#786343'
  ctx.globalAlpha = enabled ? 0.75 : 0.45
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = enabled ? cyan : gold
  ctx.font = 'bold 22px ui-monospace, monospace'
  ctx.fillText(type, 28, 46)
  ctx.fillStyle = '#918c81'
  ctx.font = '16px ui-monospace, monospace'
  ctx.fillText(enabled ? 'SCHEMA.ORG / JSON-LD' : 'PLAIN PAGE', 28, 72)
  ctx.fillStyle = '#f3ede1'
  ctx.font = 'bold 25px ui-monospace, monospace'
  const title = type === 'PRODUCT' ? data.product : type === 'SERVICE' ? data.service : 'Frequently asked questions'
  ctx.fillText(title.length > 26 ? `${title.slice(0, 24)}...` : title, 28, 124)
  ctx.font = '17px ui-monospace, monospace'
  ctx.fillStyle = enabled ? cyan : '#77756e'
  ctx.fillText('yourwebsite.in', 28, 156)

  if (!enabled) {
    ctx.fillStyle = '#6f6a5d'
    ctx.fillRect(28, 195, w - 80, 5)
    ctx.fillRect(28, 216, w - 130, 5)
    ctx.fillRect(28, 237, w - 105, 5)
    ctx.fillStyle = '#88795d'
    ctx.font = 'bold 54px ui-monospace, monospace'
    ctx.fillText('{ }', 28, 350)
    ctx.font = '16px ui-monospace, monospace'
    ctx.fillText('ADD STRUCTURED DATA', 28, 386)
  } else if (type === 'PRODUCT') {
    for (let i = 0; i < 5; i += 1) drawStar(ctx, 40 + i * 29, 206, 11, gold)
    ctx.fillStyle = '#aaa89f'
    ctx.font = '17px ui-monospace, monospace'
    ctx.fillText('4.8  (126)', 192, 212)
    ctx.fillStyle = '#f3ede1'
    ctx.font = 'bold 25px ui-monospace, monospace'
    ctx.fillText(data.price, 28, 270)
    ctx.fillStyle = cyan
    ctx.font = 'bold 17px ui-monospace, monospace'
    ctx.fillText('IN STOCK', 28, 310)
  } else if (type === 'SERVICE') {
    ctx.fillStyle = cyan
    ctx.beginPath(); ctx.arc(39, 208, 10, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(36, 211, 6, 13)
    ctx.fillStyle = '#f3ede1'
    ctx.font = 'bold 20px ui-monospace, monospace'
    ctx.fillText(data.location, 62, 215)
    for (let i = 0; i < 5; i += 1) drawStar(ctx, 40 + i * 29, 271, 11, gold)
    ctx.fillStyle = '#aaa89f'
    ctx.font = '17px ui-monospace, monospace'
    ctx.fillText('4.9  (64)', 192, 277)
  } else {
    const questions = ['What is the minimum order?', 'Do you offer delivery?']
    questions.forEach((question, index) => {
      const y = 190 + index * 91
      ctx.strokeStyle = '#4c6668'
      roundedRect(ctx, 24, y, w - 48, 76, 8); ctx.stroke()
      ctx.fillStyle = '#ede8de'
      ctx.font = '16px ui-monospace, monospace'
      ctx.fillText(question, 38, y + 28)
      ctx.fillStyle = cyan
      ctx.fillText(faqOpen === index ? '-' : '+', w - 50, y + 28)
      if (faqOpen === index) {
        ctx.fillStyle = '#a8ada6'
        ctx.font = '14px ui-monospace, monospace'
        ctx.fillText(index === 0 ? 'Contact us for a custom quote.' : 'Yes, across India.', 38, y + 55)
      }
    })
  }
  texture.needsUpdate = true
}

const SCHEMA_TYPES = ['PRODUCT', 'SERVICE', 'FAQ']
const CARD_POSITIONS = [[-1.24, 0.02, 0], [0, 0.22, 0.25], [1.24, 0.02, 0]]

function SchemaCards({ timelineRef, data, enabled, faqOpen, toggle, toggleFaq, active, gold, cyan }) {
  const cards = useRef([])
  const tokens = useRef([])
  const tokenLabels = useRef([])
  const textures = useMemo(() => [0, 1, 2].map(() => makeCanvasTexture(420, 440)), [])
  useEffect(() => {
    textures.forEach((texture, i) => drawSchemaTexture(texture, SCHEMA_TYPES[i], data, enabled[i], faqOpen, gold, cyan))
  }, [textures, data, enabled, faqOpen, gold, cyan])
  useEffect(() => () => textures.forEach(({ texture }) => texture.dispose()), [textures])
  useFrame(() => {
    if (timelineRef.current.weights[2] < 0.01) return
    cards.current.forEach((card, i) => {
      if (!card) return
      card.position.y = CARD_POSITIONS[i][1] + Math.sin(timelineRef.current.time * 0.9 + i * 1.5) * 0.055
      card.rotation.y = (i - 1) * -0.17 + Math.sin(timelineRef.current.time * 0.5 + i) * 0.025
      const token = tokens.current[i]
      if (token) {
        const drop = ease((timelineRef.current.progress - i * 0.1) * 3)
        token.position.y = CARD_POSITIONS[i][1] + 1.38 - drop * 0.63
        if (tokenLabels.current[i]) tokenLabels.current[i].style.opacity = !enabled[i] && drop < 0.96 ? String(1 - drop) : '0'
      }
    })
  })
  return (
    <StageGroup index={2} timelineRef={timelineRef}>
      {SCHEMA_TYPES.map((type, i) => (
        <group key={type}>
          <group ref={(el) => { cards.current[i] = el }} position={CARD_POSITIONS[i]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation()
                if (!active || event.delta > 5) return
                if (i === 2 && enabled[i] && event.uv && event.uv.y < 0.57 && event.uv.y > 0.16) {
                  toggleFaq(event.uv.y > 0.36 ? 0 : 1)
                } else toggle(i)
              }}
            >
              <planeGeometry args={[1.12, 1.4]} />
              <meshBasicMaterial map={textures[i].texture} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>
          <group ref={(el) => { tokens.current[i] = el }} position={[CARD_POSITIONS[i][0], 1.4, 0.5]}>
            {null}
          </group>
          {null}
        </group>
      ))}
      {null}
    </StageGroup>
  )
}

function competitorPoints() {
  const random = seeded(781)
  return Array.from({ length: 15 }, (_, i) => ({
    id: `competitor-${i}`,
    name: `competitor keyword ${String(i + 1).padStart(2, '0')}`,
    volume: formatNumber(1200 + random() * 10500),
    difficulty: Math.round(55 + random() * 36),
    intent: Math.round(35 + random() * 40),
    score: Math.round(30 + random() * 30),
    kind: 'competitor',
    p: [-1.5 + random() * 3, 0.25 + random() * 0.96, -0.85 + random() * 0.8],
    r: 0.055 + random() * 0.065,
  }))
}

function BubbleInstances({ data, color, wireframe, timelineRef, active, onHover, onPick }) {
  const ref = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    if (!ref.current || timelineRef.current.weights[3] < 0.01) return
    data.forEach((bubble, i) => {
      dummy.position.set(...bubble.p)
      const pulse = wireframe ? 1 + Math.sin(timelineRef.current.time * 2.4 + i) * 0.12 : 1
      dummy.scale.setScalar(bubble.r * pulse)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      ref={ref}
      args={[null, null, data.length]}
      frustumCulled={false}
      onPointerMove={(event) => {
        if (!active || event.instanceId == null) return
        event.stopPropagation()
        onHover(data[event.instanceId])
      }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation()
        if (active && event.delta <= 5 && event.instanceId != null && data[event.instanceId].kind === 'gap') onPick(data[event.instanceId])
      }}
    >
      <icosahedronGeometry args={[1, wireframe ? 1 : 2]} />
      <meshBasicMaterial color={color} wireframe={wireframe} transparent opacity={wireframe ? 0.9 : 0.75} depthWrite={!wireframe} />
    </instancedMesh>
  )
}

function TargetPin({ point, gold }) {
  const ref = useRef(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.y = damp(ref.current.position.y, point.p[1] + 0.2, 6, Math.min(delta, 0.05))
  })
  return (
    <group ref={ref} position={[point.p[0], point.p[1] + 1, point.p[2]]}>
      <mesh><ringGeometry args={[0.055, 0.07, 20]} /><meshBasicMaterial color={gold} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.12, 0]}><planeGeometry args={[0.012, 0.16]} /><meshBasicMaterial color={gold} /></mesh>
    </group>
  )
}

function GapMap({ timelineRef, data, active, hover, onHover, onPick, targets, gold, cyan }) {
  const competitors = useMemo(() => competitorPoints(), [])
  const owned = useMemo(() => data.keywords.filter((item) => item.kind === 'own'), [data])
  const gaps = useMemo(() => data.keywords.filter((item) => item.kind === 'gap'), [data])
  const grid = useMemo(() => {
    const p = []
    for (let i = 0; i <= 6; i += 1) {
      const x = -1.8 + i * 0.6
      p.push(x, -1.25, -1.0, x, 1.3, -1.0)
    }
    for (let i = 0; i <= 4; i += 1) {
      const y = -1.25 + i * 0.64
      p.push(-1.8, y, -1, 1.8, y, -1)
    }
    return new Float32Array(p)
  }, [])
  return (
    <StageGroup index={3} timelineRef={timelineRef}>
      <group position={[-0.1, 0.05, 0]} rotation={[-0.08, -0.2, 0]}>
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[grid, 3]} /></bufferGeometry>
          <lineBasicMaterial color={gold} transparent opacity={0.14} depthWrite={false} />
        </lineSegments>
        <BubbleInstances data={competitors} color="#827b70" timelineRef={timelineRef} active={active} onHover={onHover} onPick={onPick} />
        <BubbleInstances data={owned} color={gold} timelineRef={timelineRef} active={active} onHover={onHover} onPick={onPick} />
        <BubbleInstances data={gaps} color={cyan} wireframe timelineRef={timelineRef} active={active} onHover={onHover} onPick={onPick} />
        {targets.map((target) => <TargetPin key={target.id} point={target} gold={gold} />)}
        {null}
        {null}
        {null}
        {null}
      </group>
    </StageGroup>
  )
}

function drawSerpTexture(target, data, yours, gold, cyan) {
  const { ctx, width: w, height: h, texture } = target
  ctx.clearRect(0, 0, w, h)
  roundedRect(ctx, 2, 2, w - 4, h - 4, 10)
  ctx.fillStyle = yours ? '#302818' : '#211f1b'
  ctx.fill()
  ctx.strokeStyle = yours ? gold : '#46433d'
  ctx.lineWidth = yours ? 2 : 1
  ctx.stroke()
  ctx.fillStyle = yours ? gold : '#706c63'
  ctx.beginPath(); ctx.arc(23, 25, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = yours ? '#fff2d3' : '#c5c0b5'
  ctx.font = 'bold 20px ui-monospace, monospace'
  ctx.fillText(yours ? data.serp : 'Industry supplier and manufacturer', 43, 28)
  ctx.fillStyle = yours ? cyan : '#77746d'
  ctx.font = '15px ui-monospace, monospace'
  ctx.fillText(yours ? 'yourwebsite.in  /  trusted supplier' : 'competitor website  /  search result', 43, 52)
  texture.needsUpdate = true
}

function TrafficChart({ timelineRef, before, active, cyan, gold }) {
  const lineRef = useRef(null)
  const pointRef = useRef(null)
  const valueRef = useRef(null)
  const progress = useRef(0)
  const { geometry, points, grid } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85, -0.6, 0), new THREE.Vector3(-0.62, -0.53, 0),
      new THREE.Vector3(-0.4, -0.48, 0), new THREE.Vector3(-0.15, -0.35, 0),
      new THREE.Vector3(0.05, -0.15, 0), new THREE.Vector3(0.32, 0.05, 0),
      new THREE.Vector3(0.55, 0.23, 0), new THREE.Vector3(0.85, 0.56, 0),
    ])
    const pts = curve.getPoints(90)
    const geom = new THREE.BufferGeometry().setFromPoints(pts)
    const p = []
    for (let i = 0; i < 4; i += 1) p.push(-0.85, -0.65 + i * 0.42, -0.03, 0.85, -0.65 + i * 0.42, -0.03)
    return { geometry: geom, points: pts, grid: new Float32Array(p) }
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => { if (active) progress.current = 0 }, [active])
  useFrame((_, delta) => {
    if (timelineRef.current.weights[4] < 0.01) return
    const target = before ? 0.07 : ease((timelineRef.current.progress - 0.08) / 0.75)
    progress.current = damp(progress.current, target, 4, Math.min(delta, 0.05))
    const count = Math.max(2, Math.floor(progress.current * (points.length - 1)))
    geometry.setDrawRange(0, count)
    if (pointRef.current) pointRef.current.position.copy(points[count - 1])
    if (valueRef.current) valueRef.current.textContent = `${formatNumber(120 + progress.current * 3060)} / MO`
  })
  return (
    <group position={[1.02, 0, -0.2]}>
      <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[grid, 3]} /></bufferGeometry><lineBasicMaterial color={gold} transparent opacity={0.16} /></lineSegments>
      <line ref={lineRef} geometry={geometry}><lineBasicMaterial color={cyan} transparent opacity={0.95} /></line>
      <mesh ref={pointRef}><sphereGeometry args={[0.035, 10, 8]} /><meshBasicMaterial color={cyan} /></mesh>
      {null}
      {null}
    </group>
  )
}

function ConversionStream({ timelineRef, target, before, cyan }) {
  const ref = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => {
    const random = seeded(731)
    return Array.from({ length: 38 }, () => ({
      phase: random(),
      x: 1.25 + random() * 1.45,
      y: -1.3 + random() * 2.6,
      z: -0.1 + random() * 0.6,
      size: 0.012 + random() * 0.012,
    }))
  }, [])
  useFrame(() => {
    if (!ref.current || timelineRef.current.weights[4] < 0.01) return
    const visibility = before ? 0 : clamp((timelineRef.current.progress - 0.16) * 3, 0, 1)
    particles.forEach((particle, i) => {
      const t = (particle.phase + timelineRef.current.time * 0.18) % 1
      const toward = ease(t)
      const targetY = target.current ? target.current.position.y : -1.5
      dummy.position.set(
        THREE.MathUtils.lerp(particle.x, -0.95, toward),
        THREE.MathUtils.lerp(particle.y, targetY, toward),
        THREE.MathUtils.lerp(particle.z, 0.25, toward),
      )
      dummy.scale.setScalar(particle.size * Math.sin(Math.PI * t) * visibility)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, particles.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color={cyan} transparent opacity={0.85} />
    </instancedMesh>
  )
}

function SerpClimb({ timelineRef, data, before, active, gold, cyan }) {
  const rows = useRef([])
  const yours = useRef(null)
  const rankLabel = useRef(null)
  const enquiry = useRef(null)
  const rank = useRef(27)
  const textures = useMemo(() => [makeCanvasTexture(520, 72), makeCanvasTexture(520, 72)], [])
  useEffect(() => {
    drawSerpTexture(textures[0], data, false, gold, cyan)
    drawSerpTexture(textures[1], data, true, gold, cyan)
  }, [textures, data, gold, cyan])
  useEffect(() => () => textures.forEach(({ texture }) => texture.dispose()), [textures])
  useEffect(() => { if (active) rank.current = 27 }, [active])

  useFrame((_, delta) => {
    if (timelineRef.current.weights[4] < 0.01) return
    const dt = Math.min(delta, 0.05)
    const climb = before ? 0 : ease((timelineRef.current.progress - 0.08) / 0.74)
    rank.current = damp(rank.current, 27 - climb * 26, 4, dt)
    const r = rank.current
    const targetY = r > 10 ? -1.32 - Math.min(0.38, (r - 10) * 0.035) : 1.18 - (r - 1) * 0.26
    if (yours.current) {
      yours.current.position.y = damp(yours.current.position.y, targetY, 8, dt)
      yours.current.material.opacity = r > 10 ? 0.4 : 1
      const pulse = r < 1.8 ? 1 + Math.sin(timelineRef.current.time * 3) * 0.018 : 1
      yours.current.scale.setScalar(pulse)
    }
    rows.current.forEach((row, i) => {
      if (!row) return
      const slot = i + (r < i + 1.5 ? 1 : 0)
      row.position.y = damp(row.position.y, 1.18 - slot * 0.26, 8, dt)
      row.material.opacity = damp(row.material.opacity, slot > 9 ? 0.1 : 0.62, 8, dt)
    })
    if (rankLabel.current) rankLabel.current.textContent = `POSITION #${Math.max(1, Math.round(r))}`
    if (enquiry.current) enquiry.current.style.opacity = String(clamp((6 - r) / 5, 0, 1))
  })
  return (
    <StageGroup index={4} timelineRef={timelineRef}>
      <ConversionStream timelineRef={timelineRef} target={yours} before={before} cyan={cyan} />
      <group position={[-0.95, 0, 0.05]}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} ref={(el) => { rows.current[i] = el }} position={[0, 1.18 - i * 0.26, 0]}>
            <planeGeometry args={[1.9, 0.24]} /><meshBasicMaterial map={textures[0].texture} transparent opacity={0.62} depthWrite={false} />
          </mesh>
        ))}
        <mesh ref={yours} position={[0, -1.65, 0.12]}>
          <planeGeometry args={[1.9, 0.24]} /><meshBasicMaterial map={textures[1].texture} transparent depthWrite={false} />
          {null}
        </mesh>
      </group>
      <TrafficChart timelineRef={timelineRef} before={before} active={active} gold={gold} cyan={cyan} />
      {null}
    </StageGroup>
  )
}


const initialState = {
  stage: 0, playing: true, industry: 'steel', fixed: [],
  schema: [false, false, false], faqOpen: -1, targets: [], before: false,
};
function sceneReducer(state, action) {
  switch (action.type) {
    case 'stage': return {
      ...state, stage: action.stage, playing: action.manual ? false : state.playing,
      fixed: action.stage === 1 ? [] : state.fixed,
      schema: action.stage === 2 ? [false, false, false] : state.schema,
      faqOpen: action.stage === 2 ? -1 : state.faqOpen,
      before: action.stage === 4 ? false : state.before,
    };
    case 'fixNext': {
      const next = ISSUES.find((issue) => !state.fixed.includes(issue.id));
      return next ? { ...state, fixed: [...state.fixed, next.id] } : state;
    }
    case 'schemaNext': {
      const next = state.schema.indexOf(false);
      return next < 0 ? state : { ...state, schema: state.schema.map((value, index) => value || index === next) };
    }
    case 'schema': return { ...state, playing: false, schema: state.schema.map((value, index) => index === action.index ? !value : value) };
    case 'faq': return { ...state, playing: false, faqOpen: state.faqOpen === action.index ? -1 : action.index };
    case 'target': return state.targets.some((target) => target.id === action.item.id) ? state : { ...state, playing: false, targets: [...state.targets, action.item] };
    case 'industry': {
      const industries = Object.keys(INDUSTRIES);
      return { ...state, industry: industries[(industries.indexOf(state.industry) + 1) % industries.length], targets: [] };
    }
    case 'before': return { ...state, before: !state.before, playing: false };
    case 'playing': return { ...state, playing: action.playing };
    default: return state;
  }
}

function subscribePreferences(callback) {
  const queries = [window.matchMedia('(pointer: coarse)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}
const getCoarseSnapshot = () => window.matchMedia('(pointer: coarse)').matches;
const getReducedSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getServerSnapshot = () => true;
const ignoreHover = () => {};

export default function SeoScene({ light = false, renderActive = true }) {
  const [state, dispatch] = useReducer(sceneReducer, initialState);
  const timelineRef = useRef({ time: 0, elapsed: 0, progress: 0, stage: 0, weights: [1, 0, 0, 0, 0] });
  const coarse = useSyncExternalStore(subscribePreferences, getCoarseSnapshot, getServerSnapshot);
  const reduced = useSyncExternalStore(subscribePreferences, getReducedSnapshot, getServerSnapshot);
  const gold = light ? '#b87d14' : GOLD;
  const cyan = light ? '#0077b6' : CYAN;
  const data = INDUSTRIES[state.industry];

  const selectStage = useCallback((stage, manual = true) => {
    timelineRef.current.stage = stage;
    timelineRef.current.elapsed = 0;
    timelineRef.current.progress = 0;
    dispatch({ type: 'stage', stage, manual });
  }, []);
  const advance = useCallback(() => selectStage((timelineRef.current.stage + 1) % STAGES.length, false), [selectStage]);
  const pause = useCallback(() => dispatch({ type: 'playing', playing: false }), []);
  const setPlaying = useCallback((playing) => {
    timelineRef.current.elapsed = 0;
    timelineRef.current.progress = 0;
    dispatch({ type: 'playing', playing });
  }, []);
  const toggleSchema = useCallback((index) => dispatch({ type: 'schema', index }), []);
  const toggleFaq = useCallback((index) => dispatch({ type: 'faq', index }), []);
  const pickKeyword = useCallback((item) => dispatch({ type: 'target', item }), []);

  useEffect(() => {
    if (!renderActive) return;
    if (!state.playing || reduced || (state.stage !== 1 && state.stage !== 2)) return;
    const type = state.stage === 1 ? 'fixNext' : 'schemaNext';
    const timer = window.setInterval(() => dispatch({ type }), state.stage === 1 ? 720 : 900);
    return () => window.clearInterval(timer);
  }, [state.stage, state.playing, reduced, renderActive]);

  return (
    <div
      className="absolute inset-0"
      tabIndex={0}
      role="region"
      aria-label="Interactive SEO visualization"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          selectStage((state.stage + 1) % STAGES.length);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          selectStage((state.stage - 1 + STAGES.length) % STAGES.length);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setPlaying(!state.playing);
        } else if (event.key.toLowerCase() === 'i') {
          dispatch({ type: 'industry' });
        } else if (event.key.toLowerCase() === 'b') {
          dispatch({ type: 'before' });
        } else if (event.key === 'Escape') {
          setPlaying(true);
        }
      }}
    >
      <ScenePreparation name="seo">
        {(onPrepared) => (
          <Canvas
            frameloop={renderActive ? "always" : "demand"}
            dpr={servicePixelRatio(renderActive)}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 9], fov: 35, near: 0.1, far: 40 }}
            style={{ position: 'absolute', inset: 0, background: 'transparent', touchAction: coarse ? 'pan-y' : 'none' }}
          >
            <Timeline timelineRef={timelineRef} playing={state.playing && !reduced} advance={advance} />
            {!coarse && <ReturningOrbit onManual={pause} />}
            <World timelineRef={timelineRef}>
              <DemandModel timelineRef={timelineRef} data={data} active={state.stage === 0} gold={gold} cyan={cyan} />
              <AuditModel timelineRef={timelineRef} fixed={state.fixed} active={state.stage === 1} gold={gold} cyan={cyan} />
              <SchemaCards timelineRef={timelineRef} data={data} enabled={state.schema} faqOpen={state.faqOpen} toggle={toggleSchema} toggleFaq={toggleFaq} active={state.stage === 2} gold={gold} cyan={cyan} />
              <GapMap timelineRef={timelineRef} data={data} active={state.stage === 3} hover={null} onHover={ignoreHover} onPick={pickKeyword} targets={state.targets} gold={gold} cyan={cyan} />
              <SerpClimb timelineRef={timelineRef} data={data} before={state.before} active={state.stage === 4} gold={gold} cyan={cyan} />
            </World>
            <SceneCompilation />
            <SceneWarmup onRendered={onPrepared} />
          </Canvas>
        )}
      </ScenePreparation>
    </div>
  );
}
