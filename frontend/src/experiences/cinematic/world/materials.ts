/** Shared materials: a PBR material with a fresnel rim light (cinematic edge light), and shared uniforms. */
import * as THREE from 'three'

export const rimUniforms = {
  uRimColor: { value: new THREE.Color('#38d6f0') },
  uRimStrength: { value: 0.22 },
}

export function rimMaterial(color: string, roughness = 0.6, metalness = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRimColor = rimUniforms.uRimColor
    sh.uniforms.uRimStrength = rimUniforms.uRimStrength
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\nfloat rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\ntotalEmissiveRadiance += uRimColor * rimF * uRimStrength;',
      )
  }
  m.customProgramCacheKey = () => 'rim'
  return m
}

/** Additive glowing line/point material helper. */
export const additive = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
