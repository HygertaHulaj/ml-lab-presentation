import * as THREE from 'three'

/** Radial gradient texture for soft, cheap glow halos (additive sprites/planes). */
export function glowTexture(size = 128): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.22, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Renders N data points as ONE instanced sphere mesh plus ONE instanced, camera-facing halo mesh.
 * `update` writes positions/colours/sizes computed elsewhere (pure state); nothing here decides values.
 */
export class DataPointRenderer {
  readonly group = new THREE.Group()
  readonly points: THREE.InstancedMesh
  private halos: THREE.InstancedMesh
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private identity = new THREE.Quaternion()
  private v = new THREE.Vector3()
  private s = new THREE.Vector3()
  private c = new THREE.Color()
  private disposables: { dispose: () => void }[] = []

  constructor(readonly count: number, private radius = 0.085, haloTex: THREE.Texture) {
    const geo = new THREE.SphereGeometry(radius, 20, 14)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    this.points = new THREE.InstancedMesh(geo, mat, count)
    this.points.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.points.frustumCulled = false
    const hgeo = new THREE.PlaneGeometry(1, 1)
    const hmat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, toneMapped: false })
    this.halos = new THREE.InstancedMesh(hgeo, hmat, count)
    this.halos.frustumCulled = false
    for (let i = 0; i < count; i++) {
      this.points.setColorAt(i, this.c.set(0xffffff))
      this.halos.setColorAt(i, this.c.set(0xffffff))
    }
    this.group.add(this.halos, this.points)
    this.disposables.push(geo, mat, hgeo, hmat)
  }

  update(positions: Float32Array, colors: Float32Array, sizes: Float32Array, camera: THREE.Camera, haloScale = 6) {
    camera.getWorldQuaternion(this.q)
    const ident = this.identity
    for (let i = 0; i < this.count; i++) {
      this.v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      const sz = sizes[i]
      this.s.setScalar(sz)
      this.m.compose(this.v, ident, this.s)
      this.points.setMatrixAt(i, this.m)
      this.s.setScalar(sz * this.radius * haloScale)
      this.m.compose(this.v, this.q, this.s)
      this.halos.setMatrixAt(i, this.m)
      this.c.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2], THREE.SRGBColorSpace)
      this.points.setColorAt(i, this.c)
      this.halos.setColorAt(i, this.c)
    }
    this.points.instanceMatrix.needsUpdate = true
    this.halos.instanceMatrix.needsUpdate = true
    if (this.points.instanceColor) this.points.instanceColor.needsUpdate = true
    if (this.halos.instanceColor) this.halos.instanceColor.needsUpdate = true
  }

  setVisible(v: boolean) {
    this.group.visible = v
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
    this.points.dispose()
    this.halos.dispose()
  }
}
