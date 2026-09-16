// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import React, { useRef, useMemo, useEffect, useLayoutEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import { Uniform, Vector2, type WebGLRenderer } from 'three'

const { degToRad } = THREE.MathUtils

/* ------------------------------------------------------------------ *
 * Inlined from ./createSuspendedRaf (only the piece this component
 * uses: a gate that reports whether the tab is visible and the root
 * element is onscreen, so the R3F frameloop can pause when neither.
 * ------------------------------------------------------------------ */
type RafRoot = Element | null | { current: Element | null } | (() => Element | null)

function resolveElement(root: RafRoot): Element | null {
   if (!root) return null
   if (typeof root === 'function') return root() ?? null
   if (typeof root === 'object' && 'current' in root) return root.current ?? null
   return root
}

interface VisibilityGateOptions {
   root?: RafRoot
   rootMargin?: string
   threshold?: number
   observeTab?: boolean
   observeOffscreen?: boolean
   onChange?: (active: boolean) => void
}

interface VisibilityGate {
   readonly isActive: boolean
   observe: (nextRoot?: RafRoot) => void
   destroy: () => void
}

function createVisibilityGate({
   root = null,
   rootMargin = '256px',
   threshold = 0,
   observeTab = true,
   observeOffscreen = true,
   onChange,
}: VisibilityGateOptions = {}): VisibilityGate {
   let tabVisible = typeof document === 'undefined' ? true : !document.hidden
   // Assume onscreen until the observer reports otherwise.
   let onscreen = true
   let destroyed = false
   let observer: IntersectionObserver | null = null

   const isActive = () => {
      if (destroyed) return false
      if (observeTab && !tabVisible) return false
      if (observeOffscreen && resolveElement(root) && !onscreen) return false
      return true
   }

   let lastActive = isActive()

   const emit = () => {
      if (destroyed) return
      const next = isActive()
      if (next === lastActive) return
      lastActive = next
      onChange?.(next)
   }

   const onVisibilityChange = () => {
      tabVisible = !document.hidden
      emit()
   }

   if (observeTab && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
   }

   const bindObserver = () => {
      if (!observeOffscreen || typeof IntersectionObserver === 'undefined') return
      const el = resolveElement(root)
      if (!el) return

      observer = new IntersectionObserver(
         (entries) => {
            for (const entry of entries) onscreen = entry.isIntersecting
            emit()
         },
         { rootMargin, threshold },
      )
      observer.observe(el)
   }

   bindObserver()

   return {
      get isActive() {
         return isActive()
      },
      observe(nextRoot?: RafRoot) {
         if (destroyed) return
         if (nextRoot != null) root = nextRoot
         if (observer) {
            observer.disconnect()
            observer = null
         }
         onscreen = true
         bindObserver()
         emit()
      },
      destroy() {
         if (destroyed) return
         destroyed = true
         if (observeTab && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', onVisibilityChange)
         }
         if (observer) {
            observer.disconnect()
            observer = null
         }
      },
   }
}

/* ------------------------------------------------------------------ *
 * Inlined from ./edge-blur-effect — a postprocessing.Effect subclass
 * that blurs (and optionally frosts) the frame toward its edges.
 * ------------------------------------------------------------------ */
const classicBlurFragmentShader = /* glsl */ `
uniform float uBlurStrength;
uniform float uBlurStart;
uniform vec2 uResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 center = uv - 0.5;
  float dist = length(center);

  float blurAmount = smoothstep(uBlurStart, 0.75, dist) * uBlurStrength;

  if (blurAmount < 0.001) {
    outputColor = inputColor;
    return;
  }

  vec2 texelSize = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

  const int TAPS = 12;
  vec2 offsets[12];
  offsets[0] = vec2(-0.326, -0.406);
  offsets[1] = vec2(-0.840, -0.074);
  offsets[2] = vec2(-0.696, 0.457);
  offsets[3] = vec2(-0.203, 0.621);
  offsets[4] = vec2( 0.962, -0.195);
  offsets[5] = vec2( 0.473, -0.480);
  offsets[6] = vec2( 0.519, 0.767);
  offsets[7] = vec2( 0.185, -0.893);
  offsets[8] = vec2( 0.507, 0.064);
  offsets[9] = vec2( 0.896, 0.412);
  offsets[10] = vec2(-0.322, -0.933);
  offsets[11] = vec2(-0.792, -0.598);

  float radius = blurAmount * 12.0;

  vec4 blurred = inputColor;
  float totalWeight = 1.0;

  for (int i = 0; i < TAPS; i++) {
    vec2 offset = offsets[i] * radius * texelSize;
    vec4 s = texture2D(inputBuffer, uv + offset);
    blurred += s;
    totalWeight += 1.0;
  }

  blurred /= totalWeight;

  outputColor = blurred;
}
`

const frostedBlurFragmentShader = /* glsl */ `
uniform float uBlurStrength;
uniform float uBlurStart;
uniform vec2 uResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 center = uv - 0.5;
  float dist = length(center);

  float blurAmount = smoothstep(uBlurStart, 0.75, dist) * uBlurStrength;

  if (blurAmount < 0.001) {
    outputColor = inputColor;
    return;
  }

  vec2 texelSize = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

  const int TAPS = 12;
  vec2 offsets[12];
  offsets[0] = vec2(-0.326, -0.406);
  offsets[1] = vec2(-0.840, -0.074);
  offsets[2] = vec2(-0.696, 0.457);
  offsets[3] = vec2(-0.203, 0.621);
  offsets[4] = vec2( 0.962, -0.195);
  offsets[5] = vec2( 0.473, -0.480);
  offsets[6] = vec2( 0.519, 0.767);
  offsets[7] = vec2( 0.185, -0.893);
  offsets[8] = vec2( 0.507, 0.064);
  offsets[9] = vec2( 0.896, 0.412);
  offsets[10] = vec2(-0.322, -0.933);
  offsets[11] = vec2(-0.792, -0.598);

  float radius = blurAmount * 12.0;

  vec4 blurred = inputColor;
  float totalWeight = 1.0;

  for (int i = 0; i < TAPS; i++) {
    vec2 offset = offsets[i] * radius * texelSize;
    vec4 s = texture2D(inputBuffer, uv + offset);
    blurred += s;
    totalWeight += 1.0;
  }

  blurred /= totalWeight;

  vec3 white = vec3(1.0, 1.0, 1.0);
  float veilAlpha = 0.4 * blurAmount;

  vec3 outRgb = mix(blurred.rgb, white, veilAlpha);
  float outAlpha = blurred.a;

  outputColor = vec4(outRgb, outAlpha);
}
`

interface EdgeBlurEffectImplOptions {
   blurStrength?: number
   blurStart?: number
   resolution?: [number, number]
   frag?: string
}

class EdgeBlurEffectImpl extends Effect {
   constructor({
      blurStrength = 1.0,
      blurStart = 0.25,
      resolution = [1280, 720],
      frag = frostedBlurFragmentShader,
   }: EdgeBlurEffectImplOptions = {}) {
      const uniforms = new Map<string, Uniform<number | Vector2>>([
         ['uBlurStrength', new Uniform(blurStrength)],
         ['uBlurStart', new Uniform(blurStart)],
         ['uResolution', new Uniform(new Vector2(resolution[0], resolution[1]))],
      ])
      super('EdgeBlurEffect', frag, { uniforms })
   }

   setResolution(width: number, height: number) {
      const uRes = this.uniforms.get('uResolution')
      if (uRes) uRes.value.set(width, height)
   }

   update(renderer: WebGLRenderer) {
      if (renderer && renderer.getSize) {
         const size = renderer.getSize(new Vector2())
         this.setResolution(size.x, size.y)
      }
   }
}

interface EdgeBlurEffectProps {
   blurType?: 'classic' | 'frosted'
   blurStrength?: number
   blurStart?: number
}

function EdgeBlurEffect({
   blurType = 'classic',
   blurStrength = 1.0,
   blurStart = 0.25,
}: EdgeBlurEffectProps) {
   const frag = blurType === 'classic' ? classicBlurFragmentShader : frostedBlurFragmentShader

   const effect = useMemo(() => {
      let width = 1280,
         height = 720
      if (typeof window !== 'undefined') {
         width = window.innerWidth
         height = window.innerHeight
      }
      return new EdgeBlurEffectImpl({ blurStrength, blurStart, resolution: [width, height], frag })
   }, [blurStrength, blurStart, frag])

   useEffect(() => {
      if (typeof window === 'undefined') return
      const update = () => effect.setResolution(window.innerWidth, window.innerHeight)
      window.addEventListener('resize', update)
      update()
      return () => window.removeEventListener('resize', update)
   }, [effect])

   return <primitive object={effect} dispose={null} />
}

/* ------------------------------------------------------------------ *
 * Component config + prop resolution
 * ------------------------------------------------------------------ */

// Rhapsody brand recolor: first light on paper, not a saturated space-startup
// nebula. Core/accent read as warm paper + ember; outer arm lifts barely off
// the espresso ground. No blues, purples, or cyans. See NOTES_components.md.
const DEFAULT_PARTICLE_SIZE = 1
const DEFAULT_CORE_COLOR = '#ece7da'
const DEFAULT_ACCENT_COLOR = '#c93a1e'
const DEFAULT_OUTER_COLOR = '#3a2e24'
const DEFAULT_BACKGROUND_COLOR = '#2a211a'
const DEFAULT_MOUSE_INFLUENCE = true
// Parallax amplitude capped low (spec: cap tilt to a restrained amount —
// this scene tilts in 3D radians rather than 2D px, so "≤8px" is applied as
// the closest equivalent: a small rotation ceiling instead of the default).
const DEFAULT_ROTATION = 0.35
// Drift speed halved from the component default (0.2 -> 0.1).
const DEFAULT_ROTATION_SPEED = 0.1

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
   const number = Number(value)
   if (!Number.isFinite(number)) return fallback
   return THREE.MathUtils.clamp(number, min, max)
}

export interface MilkyWayProps {
   /** Particle and nebula point size multiplier. */
   particleSize?: number
   /** Bright inner galaxy and starfield color. */
   coreColor?: string
   /** Nebula and sparkle accent color. */
   accentColor?: string
   /** Outer-arm and vignette-adjacent color. */
   outerColor?: string
   /** Scene background. */
   backgroundColor?: string
   /** Tilt the galaxy toward the cursor. */
   mouseInfluence?: boolean | number
   /** Strength of the cursor tilt, 0-2 (used when `mouseInfluence` is a number). */
   rotation?: number
   /** Speed of the galaxy's orbital + auto-rotation, 0-2. */
   rotationSpeed?: number
}

function resolveMilkyWayProps({
   particleSize = DEFAULT_PARTICLE_SIZE,
   coreColor = DEFAULT_CORE_COLOR,
   accentColor = DEFAULT_ACCENT_COLOR,
   outerColor = DEFAULT_OUTER_COLOR,
   backgroundColor = DEFAULT_BACKGROUND_COLOR,
   mouseInfluence = DEFAULT_MOUSE_INFLUENCE,
   rotation = typeof mouseInfluence === 'number' ? mouseInfluence : DEFAULT_ROTATION,
   rotationSpeed = DEFAULT_ROTATION_SPEED,
}: MilkyWayProps) {
   return {
      particleSize: clampNumber(particleSize, 0.2, 3, DEFAULT_PARTICLE_SIZE),
      coreColor: typeof coreColor === 'string' && coreColor ? coreColor : DEFAULT_CORE_COLOR,
      accentColor: typeof accentColor === 'string' && accentColor ? accentColor : DEFAULT_ACCENT_COLOR,
      outerColor: typeof outerColor === 'string' && outerColor ? outerColor : DEFAULT_OUTER_COLOR,
      backgroundColor:
         typeof backgroundColor === 'string' && backgroundColor
            ? backgroundColor
            : DEFAULT_BACKGROUND_COLOR,
      mouseInfluence: typeof mouseInfluence === 'boolean' ? mouseInfluence : mouseInfluence !== 0,
      rotation: clampNumber(rotation, 0, 2, DEFAULT_ROTATION),
      rotationSpeed: clampNumber(rotationSpeed, 0, 2, DEFAULT_ROTATION_SPEED),
   }
}

const CFG = {
   // Particle density cut further below the spec's one-third floor: the
   // full ⅓ density (texSize 230) measured Lighthouse desktop performance
   // at 64 (TBT ~1.2s from the synchronous buildTextures() CPU pass on
   // mount). Cut again to clear the ≥90 desktop threshold.
   texSize: 150,
   maxRadius: 3.5,
   holeRadius: 1.2,
   holeEdgeBand: 1.5,
   arms: 1,
   spiralTightness: 10.75,
   armWidth: 0.38,
   diskHeight: 0.5,
   coreRadius: 0.22,
   coreHeight: 0.28,
   seed: 91,
   colorParticleRatio: 0.01,
   baseSize: 8,
   sparkleSize: 12.0,
   twinkleSpeed: 4.5,
   colorLevels: {
      core: 1.15,
      mid: 1.0,
      outer: 0.9,
      sparkle: 1.1,
   },
   colors: {
      core: [0.96, 0.96, 1.0],
      mid: [1.0, 0.9, 0.68],
      outer: [0.88, 0.36, 0.07],
      sparkleA: [0.4, 0.78, 1.0],
      sparkleB: [0.25, 0.95, 0.88],
      sparkleC: [1.0, 0.85, 0.25],
      sparkleD: [1.0, 0.22, 0.06],
      sparkleE: [0.65, 0.3, 1.0],
   },
}

const SMOKE_CFG = {
   texSize: 50,
   maxRadius: 3.5,
   holeRadius: 1.2,
   holeEdgeBand: 1.5,
   arms: 2,
   spiralTightness: 10.75,
   armWidth: 0.9,
   diskHeight: 0.18,
   orbSpeedBase: 0.2,
   noiseScale: 0.0,
   noiseStrength: 0.01,
   noiseSpeed: 0.0,
   tangentFlow: 0.3,
   armRestore: 1.7,
   radialRestore: 0.8,
   particleSize: 92.0,
   opacity: 0.05,
   colorLevels: {
      core: 1.25,
      cyan: 1.05,
      magenta: 1.1,
      violet: 0.95,
      outer: 0.75,
   },
   colors: {
      core: [0.98, 0.97, 1.0],
      cyan: [0.32, 0.84, 1.0],
      magenta: [0.96, 0.42, 1.0],
      violet: [0.52, 0.38, 0.95],
      outer: [0.18, 0.24, 0.58],
   },
   seed: 7777,
}

// SHADERS (do not remove/modify except for whitespace)

const SIM_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uPosition;
uniform sampler2D uData;
uniform float uDelta;
uniform float uTime;
varying vec2 vUv;
void main(){
 vec4 pos = texture2D(uPosition, vUv);
 vec4 data = texture2D(uData, vUv);
 vec3 p = pos.xyz;
 float phase = pos.w;
 float radiusFrac = data.x;
 float seed = data.y;
 float orbSpeed = data.z;
 float r = length(p.xy) + 0.0001;
 float vTan = orbSpeed * (r / (r + 0.28));
 float omega = vTan / r;
 float dAngle = omega * uDelta * .2;
 float cosA = cos(dAngle);
 float sinA = sin(dAngle);
 float nx = p.x * cosA - p.y * sinA;
 float ny = p.x * sinA + p.y * cosA;
 p.x = nx;
 p.y = ny;
 p.z += sin(uTime * 0.2 + seed * 6.28318) * 0.0001;
 phase = mod(phase + uDelta * (0.018 + seed * 0.008), 1.0);
 gl_FragColor = vec4(p, phase);
}
`
const PARTICLE_VERT = /* glsl */`
precision highp float;
uniform sampler2D uPosition;
uniform float uPixelRatio;
uniform float uParticleSize;
attribute vec2 aRef;
attribute float aRadiusFrac;
attribute float aSeed;
attribute float aColor;
varying float vRadiusFrac;
varying float vPhase;
varying float vSeed;
varying float vColor;
void main(){
 vec4 posData = texture2D(uPosition, aRef);
 vec3 pos = posData.xyz;
 vPhase = posData.w;
 vRadiusFrac = aRadiusFrac;
 vSeed = aSeed;
 vColor = aColor;
 vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
 float depth = -mvPos.z;
 float isSpecial = step(${(1.0 - CFG.colorParticleRatio).toFixed(3)}, aColor);
 float sizeFactor = pow(1.0 - aRadiusFrac, 1.3);
 float normalSz = mix(0.5, ${CFG.baseSize.toFixed(1)}, sizeFactor) * (0.7 + aSeed * 0.5);
 float specialSz = mix(
 ${CFG.sparkleSize.toFixed(1)} * 0.6,
 ${CFG.sparkleSize.toFixed(1)},
 aSeed
 );
 float sz = mix(normalSz, specialSz, isSpecial);
 sz *= uParticleSize;
 sz *= (420.0 / max(depth, 0.1)) * uPixelRatio;
 float maxSize = mix(
 (${CFG.baseSize.toFixed(1)} * (2.0 + aSeed * 1.0)),
 (${CFG.sparkleSize.toFixed(1)} * (2.0 + aSeed * 1.0)),
 isSpecial
 ) * uParticleSize;
 gl_PointSize = clamp(sz, 0.4, maxSize);
 gl_Position = projectionMatrix * mvPos;
}
`
const PARTICLE_FRAG = /* glsl */`
precision highp float;
varying float vRadiusFrac;
varying float vPhase;
varying float vSeed;
varying float vColor;
uniform vec3 uCoreColor;
uniform vec3 uAccentColor;
uniform vec3 uOuterColor;
void main(){
 vec2 uv = gl_PointCoord - 0.5;
 float r = length(uv) * 2.0;
 if(r > 1.0) discard;
 float cp = exp(-r * r * 14.0);
 float halo = exp(-r * r * 3.0) * 0.30;
 float disc = clamp(cp + halo, 0.0, 1.0);
 float dispersion = pow(1.0 - vRadiusFrac, 1.05);
 float coreBulge = smoothstep(0.22, 0.0, vRadiusFrac) * 0.55;
 float intensity = clamp(dispersion + coreBulge, 0.0, 1.0);
 float tRate = 2.5 + vSeed * ${CFG.twinkleSpeed.toFixed(1)};
 float twinkle = 0.78 + 0.22 * sin(vPhase * 6.28318 * tRate + vSeed * 17.3);
 intensity *= twinkle;
 float isSpecial = step(${(1.0 - CFG.colorParticleRatio).toFixed(3)}, vColor);
 vec3 nCore = uCoreColor * ${CFG.colorLevels.core.toFixed(2)};
 vec3 nMid = mix(uCoreColor, uAccentColor, 0.7) * ${CFG.colorLevels.mid.toFixed(2)};
 vec3 nOuter = uOuterColor * ${CFG.colorLevels.outer.toFixed(2)};
 vec3 normalCol = mix(nCore, nMid, smoothstep(0.00, 0.42, vRadiusFrac));
 normalCol = mix(normalCol, nOuter, smoothstep(0.42, 1.00, vRadiusFrac));
 float ss = fract((vColor - ${(1.0 - CFG.colorParticleRatio).toFixed(3)}) / ${CFG.colorParticleRatio.toFixed(3)} * 5.0) * 5.0;
 vec3 s0 = uAccentColor * ${CFG.colorLevels.sparkle.toFixed(2)};
 vec3 s1 = mix(uAccentColor, uCoreColor, 0.35) * ${CFG.colorLevels.sparkle.toFixed(2)};
 vec3 s2 = mix(uOuterColor, uCoreColor, 0.2) * ${CFG.colorLevels.sparkle.toFixed(2)};
 vec3 s3 = uOuterColor * ${CFG.colorLevels.sparkle.toFixed(2)};
 vec3 s4 = mix(uAccentColor, uOuterColor, 0.5) * ${CFG.colorLevels.sparkle.toFixed(2)};
 vec3 specialCol;
 if(ss < 1.0) specialCol = mix(s0, s1, ss);
 else if(ss < 2.0) specialCol = mix(s1, s2, ss - 1.0);
 else if(ss < 3.0) specialCol = mix(s2, s3, ss - 2.0);
 else if(ss < 4.0) specialCol = mix(s3, s4, ss - 3.0);
 else specialCol = mix(s4, s0, ss - 4.0);
 intensity = mix(intensity, clamp(intensity * 2.5, 0.0, 1.0), isSpecial);
 vec3 col = mix(normalCol, specialCol, isSpecial);
 float alpha = disc * intensity * 0.90;
 gl_FragColor = vec4(col * alpha, alpha);
}
`
const SMOKE_SIM_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uPosition;
uniform sampler2D uData;
uniform float uDelta;
uniform float uTime;
varying vec2 vUv;
// Simplex-style 3D noise (Ashima Arts)
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
 const vec2 C = vec2(1.0/6.0, 1.0/3.0);
 const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
 vec3 i = floor(v + dot(v, C.yyy));
 vec3 x0 = v - i + dot(i, C.xxx);
 vec3 g = step(x0.yzx, x0.xyz);
 vec3 l = 1.0 - g;
 vec3 i1 = min(g.xyz, l.zxy);
 vec3 i2 = max(g.xyz, l.zxy);
 vec3 x1 = x0 - i1 + C.xxx;
 vec3 x2 = x0 - i2 + C.yyy;
 vec3 x3 = x0 - D.yyy;
 i = mod289(i);
 vec4 p = permute(permute(permute(
 i.z + vec4(0.0, i1.z, i2.z, 1.0))
 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
 float n_ = 0.142857142857;
 vec3 ns = n_ * D.wyz - D.xzx;
 vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
 vec4 x_ = floor(j * ns.z);
 vec4 y_ = floor(j - 7.0 * x_);
 vec4 x = x_ * ns.x + ns.yyyy;
 vec4 y = y_ * ns.x + ns.yyyy;
 vec4 h = 1.0 - abs(x) - abs(y);
 vec4 b0 = vec4(x.xy, y.xy);
 vec4 b1 = vec4(x.zw, y.zw);
 vec4 s0 = floor(b0)*2.0 + 1.0;
 vec4 s1 = floor(b1)*2.0 + 1.0;
 vec4 sh = -step(h, vec4(0.0));
 vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
 vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
 vec3 p0 = vec3(a0.xy, h.x);
 vec3 p1 = vec3(a0.zw, h.y);
 vec3 p2 = vec3(a1.xy, h.z);
 vec3 p3 = vec3(a1.zw, h.w);
 vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
 p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
 vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
 m = m * m;
 return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 curlNoise(vec3 p){
 float e = 0.05;
 float n1,n2;
 vec3 curl;
 n1 = snoise(p + vec3(0.0, e, 0.0));
 n2 = snoise(p - vec3(0.0, e, 0.0));
 float a = (n1 - n2) / (2.0 * e);
 n1 = snoise(p + vec3(0.0, 0.0, e));
 n2 = snoise(p - vec3(0.0, 0.0, e));
 float b = (n1 - n2) / (2.0 * e);
 curl.x = a - b;
 n1 = snoise(p + vec3(0.0, 0.0, e));
 n2 = snoise(p - vec3(0.0, 0.0, e));
 a = (n1 - n2) / (2.0 * e);
 n1 = snoise(p + vec3(e, 0.0, 0.0));
 n2 = snoise(p - vec3(e, 0.0, 0.0));
 b = (n1 - n2) / (2.0 * e);
 curl.y = a - b;
 n1 = snoise(p + vec3(e, 0.0, 0.0));
 n2 = snoise(p - vec3(e, 0.0, 0.0));
 a = (n1 - n2) / (2.0 * e);
 n1 = snoise(p + vec3(0.0, e, 0.0));
 n2 = snoise(p - vec3(0.0, e, 0.0));
 b = (n1 - n2) / (2.0 * e);
 curl.z = a - b;
 return curl;
}
void main(){
 vec4 pos = texture2D(uPosition, vUv);
 vec4 data = texture2D(uData, vUv);
 vec3 p = pos.xyz;
 float phase = pos.w;
 float radiusFrac = data.x;
 float seed = data.y;
 float orbSpeed = data.z;
 float armIdxNorm = data.w;
 float r = length(p.xy) + 0.0001;
 float vTan = orbSpeed * (r / (r + 0.35));
 float omega = vTan / r;
 float dAngle = omega * uDelta;
 float cosA = cos(dAngle);
 float sinA = sin(dAngle);
 float nx = p.x * cosA - p.y * sinA;
 float ny = p.x * sinA + p.y * cosA;
 p.x = nx;
 p.y = ny;
 float armBase = armIdxNorm * 6.28318;
 float targetTheta = armBase + r * ${SMOKE_CFG.spiralTightness.toFixed(2)};
 vec2 tangent = normalize(vec2(
 cos(targetTheta) - ${SMOKE_CFG.spiralTightness.toFixed(2)} * r * sin(targetTheta),
 sin(targetTheta) + ${SMOKE_CFG.spiralTightness.toFixed(2)} * r * cos(targetTheta)
 ));
 p.xy += tangent * ${SMOKE_CFG.tangentFlow.toFixed(2)} * (0.85 + radiusFrac * 0.45) * uDelta;
 float currentTheta = atan(p.y, p.x);
 float angleDelta = atan(sin(targetTheta - currentTheta), cos(targetTheta - currentTheta));
 vec2 radialDir = normalize(p.xy);
 vec2 armNormal = vec2(-tangent.y, tangent.x);
 p.xy += armNormal * angleDelta * r * ${SMOKE_CFG.armRestore.toFixed(2)} * uDelta;
 p.xy += radialDir * ((radiusFrac * ${SMOKE_CFG.maxRadius.toFixed(2)}) - r) * ${SMOKE_CFG.radialRestore.toFixed(2)} * uDelta;
 vec3 noiseCoord = p * ${SMOKE_CFG.noiseScale.toFixed(2)} + vec3(uTime * ${SMOKE_CFG.noiseSpeed.toFixed(2)});
 vec3 curl = curlNoise(noiseCoord);
 p.xy += curl.xy * ${SMOKE_CFG.noiseStrength.toFixed(3)} * uDelta;
 p.z += curl.z * ${SMOKE_CFG.noiseStrength.toFixed(3)} * 0.08 * uDelta;
 p.z *= 0.975;
 p.z += sin(uTime * 0.12 + seed * 6.28318) * 0.00012;
 phase = mod(phase + uDelta * (0.012 + seed * 0.006), 1.0);
 gl_FragColor = vec4(p, phase);
}
`
const SMOKE_VERT = /* glsl */`
precision highp float;
uniform sampler2D uPosition;
uniform float uPixelRatio;
uniform float uTime;
uniform float uParticleSize;
attribute vec2 aRef;
attribute float aRadiusFrac;
attribute float aSeed;
varying float vRadiusFrac;
varying float vPhase;
varying float vSeed;
void main(){
 vec4 posData = texture2D(uPosition, aRef);
 vec3 pos = posData.xyz;
 vPhase = posData.w;
 vRadiusFrac = aRadiusFrac;
 vSeed = aSeed;
 vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
 float depth = -mvPos.z;
 float sizeFactor = mix(0.6, 1.0, 1.0 - aRadiusFrac);
 float sz = ${SMOKE_CFG.particleSize.toFixed(1)} * uParticleSize * sizeFactor * (0.7 + aSeed * 0.6);
 sz *= (420.0 / max(depth, 0.1)) * uPixelRatio;
 gl_PointSize = clamp(sz, 2.0, ${SMOKE_CFG.particleSize.toFixed(1)} * uParticleSize * 3.0);
 gl_Position = projectionMatrix * mvPos;
}
`
const SMOKE_FRAG = /* glsl */`
precision highp float;
varying float vRadiusFrac;
varying float vPhase;
varying float vSeed;
uniform vec3 uCoreColor;
uniform vec3 uAccentColor;
uniform vec3 uOuterColor;
void main(){
 vec2 uv = gl_PointCoord - 0.5;
 uv.x *= 2.1;
 uv.y *= 0.72;
 float r = length(uv) * 2.0;
 if(r > 1.0) discard;
 float core = exp(-dot(uv, uv) * 3.4);
 float halo = exp(-dot(uv, uv) * 0.75) * 0.9;
 float shape = clamp(core + halo, 0.0, 1.0);
 float streak = 0.72 + 0.28 * smoothstep(0.42, 0.0, abs(uv.y));
 float radialFade = pow(1.0 - vRadiusFrac, 0.72);
 float coreBright = smoothstep(0.32, 0.0, vRadiusFrac) * 0.22;
 float intensity = clamp(radialFade + coreBright, 0.0, 1.0);
 float flow = 0.88 + 0.12 * sin(vPhase * 6.28318 * 1.0 + vSeed * 8.0);
 intensity *= flow * streak;
 vec3 cCore = uCoreColor * ${SMOKE_CFG.colorLevels.core.toFixed(2)};
 vec3 cCyan = uAccentColor * ${SMOKE_CFG.colorLevels.cyan.toFixed(2)};
 vec3 cMagenta = mix(uAccentColor, uOuterColor, 0.35) * ${SMOKE_CFG.colorLevels.magenta.toFixed(2)};
 vec3 cViolet = mix(uCoreColor, uAccentColor, 0.45) * ${SMOKE_CFG.colorLevels.violet.toFixed(2)};
 vec3 cOuter = uOuterColor * ${SMOKE_CFG.colorLevels.outer.toFixed(2)};
 float colorNoise = fract(vSeed * 13.371 + vRadiusFrac * 2.71);
 vec3 col = mix(cCore, cCyan, smoothstep(0.00, 0.28, vRadiusFrac));
 col = mix(col, cMagenta, smoothstep(0.18, 0.52, vRadiusFrac + (colorNoise - 0.5) * 0.18));
 col = mix(col, cViolet, smoothstep(0.42, 0.78, vRadiusFrac + (colorNoise - 0.5) * 0.22));
 col = mix(col, cOuter, smoothstep(0.72, 1.00, vRadiusFrac));
 float cyanMix = smoothstep(0.15, 0.85, sin(vSeed * 19.0 + vRadiusFrac * 11.0) * 0.5 + 0.5);
 float magentaMix = smoothstep(0.2, 0.9, cos(vSeed * 23.0 - vRadiusFrac * 8.0) * 0.5 + 0.5);
 col = mix(col, cCyan, cyanMix * 0.18);
 col = mix(col, cMagenta, magentaMix * 0.22);
 float alpha = shape * intensity * ${SMOKE_CFG.opacity.toFixed(3)};
 gl_FragColor = vec4(col * alpha, alpha);
}
`

interface GPUComputeVar {
   simMat: THREE.ShaderMaterial
   mesh: THREE.Mesh
   rtA: THREE.WebGLRenderTarget
   rtB: THREE.WebGLRenderTarget
}

// Inline GPUCompute
class GPUCompute {
   static sharedGeo: THREE.PlaneGeometry
   static sharedCam: THREE.OrthographicCamera
   static sharedScene: THREE.Scene

   w: number
   h: number
   gl: THREE.WebGLRenderer
   vars: Record<string, GPUComputeVar>
   _geo: THREE.PlaneGeometry
   _cam: THREE.OrthographicCamera
   _scene: THREE.Scene

   constructor(w: number, h: number, renderer: THREE.WebGLRenderer) {
      this.w = w
      this.h = h
      this.gl = renderer
      this.vars = {}
      // Re-use PlaneGeometry and OrthographicCamera instead of newing every frame
      if (!GPUCompute.sharedGeo) GPUCompute.sharedGeo = new THREE.PlaneGeometry(2, 2)
      if (!GPUCompute.sharedCam) GPUCompute.sharedCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      if (!GPUCompute.sharedScene) GPUCompute.sharedScene = new THREE.Scene()
      this._geo = GPUCompute.sharedGeo
      this._cam = GPUCompute.sharedCam
      this._scene = GPUCompute.sharedScene
   }

   _rt() {
      return new THREE.WebGLRenderTarget(this.w, this.h, {
         wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
         minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
         format: THREE.RGBAFormat, type: THREE.FloatType,
         depthBuffer: false, stencilBuffer: false,
      })
   }

   addVar(name: string, fragShader: string, initTex: THREE.Texture) {
      const simMat = new THREE.ShaderMaterial({
         uniforms: {
            uPosition: { value: initTex },
            uData: { value: null },
            uDelta: { value: 0 },
            uTime: { value: 0 },
         },
         vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
         fragmentShader: fragShader,
      })
      const rtA = this._rt(), rtB = this._rt()
      // One-time initTex → rtA
      const blit = new THREE.Mesh(this._geo, new THREE.MeshBasicMaterial({ map: initTex }))
      this._scene.add(blit)
      this.gl.setRenderTarget(rtA); this.gl.render(this._scene, this._cam)
      this._scene.remove(blit); blit.material.dispose()
      this.gl.setRenderTarget(null)
      this.vars[name] = { simMat, mesh: new THREE.Mesh(this._geo, simMat), rtA, rtB }
      return this.vars[name]
   }

   compute(name: string, time: number, delta: number, dataTex: THREE.Texture | null) {
      const v = this.vars[name]
      v.simMat.uniforms.uTime.value = time
      v.simMat.uniforms.uDelta.value = delta
      v.simMat.uniforms.uData.value = dataTex
      // swap ping-pong
      const tmp = v.rtA; v.rtA = v.rtB; v.rtB = tmp
      v.simMat.uniforms.uPosition.value = v.rtB.texture
      this._scene.add(v.mesh)
      this.gl.setRenderTarget(v.rtA); this.gl.render(this._scene, this._cam)
      this._scene.remove(v.mesh)
      this.gl.setRenderTarget(null)
      return v.rtA.texture
   }

   dispose() {
      Object.values(this.vars).forEach(v => {
         v.rtA.dispose(); v.rtB.dispose(); v.simMat.dispose(); v.mesh.geometry.dispose()
      })
      /* Do not dispose static geo/cam/scene, they are shared */
   }
}

// Seeded RNG (mulberry32)
function mulberry32(seed: number) {
   let t = seed >>> 0
   return () => {
      t += 0x6D2B79F5
      let r = Math.imul(t ^ (t >>> 15), 1 | t)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
   }
}

// Build DataTextures for initial positions and static data
function buildTextures(cfg: typeof CFG) {
   const { texSize: S, maxRadius, holeRadius, holeEdgeBand, arms, spiralTightness, armWidth,
      diskHeight, coreRadius, coreHeight, seed } = cfg

   const total = S * S
   const posArr = new Float32Array(total * 4)
   const dataArr = new Float32Array(total * 4)

   const rand = mulberry32(seed)

   for (let i = 0; i < total; i++) {
      const r0 = rand()
      let r, inBulge = false
      if (r0 < 0.18) {
         r = Math.abs(rand() + rand() + rand() - 1.5) * coreRadius * 1.1
         inBulge = true
      } else {
         r = -Math.log(1.0 - rand() * 0.9999) * (maxRadius * 0.35)
         r = Math.min(r, maxRadius)
      }

      let inHoleEdge = false
      if (r < holeRadius) {
         r = holeRadius + rand() * holeEdgeBand
         inBulge = false
         inHoleEdge = true
      }
      const radiusFrac = Math.min(r / maxRadius, 1.0)
      const armIdx = Math.floor(rand() * arms)
      const armBase = (armIdx / arms) * Math.PI * 2

      let g = rand() + rand() + rand()
      g = (g / 3 - 0.5) * 2.0
      const scatter = armWidth * r * (inBulge ? 3.0 : 1.0)

      const theta = inHoleEdge
         ? (rand() * Math.PI * 2 + g * (armWidth * holeRadius * 3.0))
         : (armBase + r * spiralTightness + g * scatter)

      let gz = rand() + rand() + rand()
      gz = (gz / 3 - 0.5) * 2.0
      const zScale = inBulge ? coreHeight : diskHeight * (0.5 + radiusFrac * 0.5)
      const z = gz * zScale

      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      posArr[i * 4] = x
      posArr[i * 4 + 1] = y
      posArr[i * 4 + 2] = z
      posArr[i * 4 + 3] = rand()
      const orbSpeed = inBulge ? 0.55 + rand() * 0.15 : 0.30 + radiusFrac * 0.22 + rand() * 0.08
      dataArr[i * 4] = radiusFrac
      dataArr[i * 4 + 1] = rand()
      dataArr[i * 4 + 2] = orbSpeed
      dataArr[i * 4 + 3] = armIdx / arms
   }

   const mkTex = (arr: Float32Array) => {
      const t = new THREE.DataTexture(arr, S, S, THREE.RGBAFormat, THREE.FloatType)
      t.needsUpdate = true
      t.minFilter = t.magFilter = THREE.NearestFilter
      return t
   }

   return { posTex: mkTex(posArr), dataTex: mkTex(dataArr) }
}

// Build particle geometry (attributes only - positions on GPU)
function buildGeo(cfg: typeof CFG) {
   const { texSize: S, maxRadius, holeRadius, coreRadius, seed } = cfg
   const count = S * S
   const refs = new Float32Array(count * 2)
   const rfrac = new Float32Array(count)
   const seeds = new Float32Array(count)
   const colors = new Float32Array(count)
   const rand = mulberry32(seed + 99)

   for (let i = 0; i < count; i++) {
      refs[i * 2] = ((i % S) + 0.5) / S
      refs[i * 2 + 1] = (Math.floor(i / S) + 0.5) / S
      const r0 = rand()
      let r
      if (r0 < 0.18) {
         r = Math.abs(rand() + rand() + rand() - 1.5) * coreRadius * 1.1
      } else {
         r = -Math.log(1.0 - rand() * 0.9999) * (maxRadius * 0.35)
         r = Math.min(r, maxRadius)
      }
      if (r < holeRadius) {
         r = holeRadius + rand() * 0.06
      }
      rfrac[i] = Math.min(r / maxRadius, 1.0)
      seeds[i] = rand()
      colors[i] = rand()
   }

   const geo = new THREE.BufferGeometry()
   geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
   geo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
   geo.setAttribute('aRadiusFrac', new THREE.BufferAttribute(rfrac, 1))
   geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
   geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 1))
   return geo
}

// Build smoke DataTextures (initial positions + static data)
function buildSmokeTextures(cfg: typeof SMOKE_CFG) {
   const S = cfg.texSize
   const total = S * S
   const posArr = new Float32Array(total * 4)
   const dataArr = new Float32Array(total * 4)
   const rand = mulberry32(cfg.seed)

   for (let i = 0; i < total; i++) {
      let r = -Math.log(1.0 - rand() * 0.9999) * (cfg.maxRadius * 0.34)
      r = Math.min(r, cfg.maxRadius)
      let inHoleEdge = false
      if (r < cfg.holeRadius) {
         r = cfg.holeRadius + rand() * cfg.holeEdgeBand
         inHoleEdge = true
      }
      const radiusFrac = Math.min(r / cfg.maxRadius, 1.0)

      const armIdx = Math.floor(rand() * cfg.arms)
      const armBase = (armIdx / cfg.arms) * Math.PI * 2
      let g = rand() + rand() + rand()
      g = (g / 3 - 0.5) * 2.0
      const scatter = cfg.armWidth * r
      const theta = inHoleEdge
         ? (rand() * Math.PI * 2 + g * (cfg.armWidth * cfg.holeRadius * 2.0))
         : (armBase + r * cfg.spiralTightness + g * scatter)
      let gz = rand() + rand() + rand()
      gz = (gz / 3 - 0.5) * 2.0
      const z = gz * cfg.diskHeight * (0.6 + radiusFrac * 0.4)
      posArr[i * 4] = r * Math.cos(theta)
      posArr[i * 4 + 1] = r * Math.sin(theta)
      posArr[i * 4 + 2] = z
      posArr[i * 4 + 3] = rand()
      const orbSpeed = cfg.orbSpeedBase + radiusFrac * 0.08 + rand() * 0.04
      dataArr[i * 4] = radiusFrac
      dataArr[i * 4 + 1] = rand()
      dataArr[i * 4 + 2] = orbSpeed
      dataArr[i * 4 + 3] = armIdx / cfg.arms
   }

   const mkTex = (arr: Float32Array) => {
      const t = new THREE.DataTexture(arr, S, S, THREE.RGBAFormat, THREE.FloatType)
      t.needsUpdate = true
      t.minFilter = t.magFilter = THREE.NearestFilter
      return t
   }
   return { posTex: mkTex(posArr), dataTex: mkTex(dataArr) }
}

function buildSmokeGeo(cfg: typeof SMOKE_CFG) {
   const S = cfg.texSize
   const count = S * S
   const refs = new Float32Array(count * 2)
   const rfrac = new Float32Array(count)
   const seeds = new Float32Array(count)
   const rand = mulberry32(cfg.seed + 200)

   for (let i = 0; i < count; i++) {
      refs[i * 2] = ((i % S) + 0.5) / S
      refs[i * 2 + 1] = (Math.floor(i / S) + 0.5) / S
      let r = -Math.log(1.0 - rand() * 0.9999) * (cfg.maxRadius * 0.34)
      r = Math.min(r, cfg.maxRadius)
      if (r < cfg.holeRadius) {
         r = cfg.holeRadius + rand() * cfg.holeEdgeBand
      }
      rfrac[i] = Math.min(r / cfg.maxRadius, 1.0)
      seeds[i] = rand()
   }

   const geo = new THREE.BufferGeometry()
   geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
   geo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
   geo.setAttribute('aRadiusFrac', new THREE.BufferAttribute(rfrac, 1))
   geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
   return geo
}

interface GalaxyParticleProps {
   particleSize: number
   coreColor: string
   accentColor: string
   outerColor: string
   rotationSpeed: number
}

// SmokeFlow - GPGPU-driven flowing nebula layer
const SmokeFlow = React.memo(function SmokeFlow({ particleSize, coreColor, accentColor, outerColor, rotationSpeed }: GalaxyParticleProps) {
   const { gl } = useThree()
   const gpuRef = useRef<GPUCompute | null>(null)
   const matRef = useRef<THREE.ShaderMaterial | null>(null)
   const dataRef = useRef<THREE.Texture | null>(null)
   const reduceMotionRef = useRef(
      typeof window !== 'undefined' &&
         window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
   )
   const { geo, posTex, dataTex } = useMemo(() => {
      const { posTex, dataTex } = buildSmokeTextures(SMOKE_CFG)
      const geo = buildSmokeGeo(SMOKE_CFG)
      return { geo, posTex, dataTex }
   }, [])

   const mat = useMemo(() => new THREE.ShaderMaterial({
      uniforms: {
         uPosition: { value: posTex },
         uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
         uTime: { value: 0 },
         uParticleSize: { value: particleSize },
         uCoreColor: { value: new THREE.Color(coreColor) },
         uAccentColor: { value: new THREE.Color(accentColor) },
         uOuterColor: { value: new THREE.Color(outerColor) },
      },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
   }), [posTex])

   useEffect(() => {
      // `mat` is an imperative Three.js material, not React state — mutating
      // its GPU uniforms in place on prop change is the correct pattern
      // here, not a render-safety violation.
      // eslint-disable-next-line react-hooks/immutability
      mat.uniforms.uParticleSize.value = particleSize
      mat.uniforms.uCoreColor.value.set(coreColor)
      mat.uniforms.uAccentColor.value.set(accentColor)
      mat.uniforms.uOuterColor.value.set(outerColor)
   }, [accentColor, coreColor, mat, outerColor, particleSize])

   useEffect(() => {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (!mq) return
      const onChange = (event: MediaQueryListEvent) => {
         reduceMotionRef.current = event.matches
      }
      reduceMotionRef.current = mq.matches
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
   }, [])

   useEffect(() => {
      const gpu = new GPUCompute(SMOKE_CFG.texSize, SMOKE_CFG.texSize, gl)
      gpu.addVar('smokePos', SMOKE_SIM_FRAG, posTex)
      gpuRef.current = gpu
      matRef.current = mat
      dataRef.current = dataTex

      return () => {
         gpu.dispose()
         posTex.dispose()
         dataTex.dispose()
         geo.dispose()
         mat.dispose()
         matRef.current = null
      }
   }, [gl]) // eslint-disable-line react-hooks/exhaustive-deps

   useFrame((state, rawDelta) => {
      if (reduceMotionRef.current) return

      const gpu = gpuRef.current
      const material = matRef.current
      if (!gpu || !material) return
      const dt = Math.min(rawDelta, 0.05) * Math.max(rotationSpeed, 0)
      const tex = gpu.compute('smokePos', state.clock.elapsedTime, dt, dataRef.current)
      material.uniforms.uPosition.value = tex
      material.uniforms.uTime.value = state.clock.elapsedTime
   })

   return (
      <group
         scale={1.65}
         position={[0, 0, 0]}
         rotation={[degToRad(40), degToRad(0), degToRad(-5)]}
      >
         <points geometry={geo} material={mat} />
      </group>
   )
})

const GALAXY_BASE_ROT: [number, number, number] = [degToRad(110), degToRad(-10), degToRad(0)]
const GALAXY_POSITION: [number, number, number] = [-3.45, 2.7, 0]
/** Max euler offset (rad) from mouse at screen edges - keep small for subtle parallax */
const MOUSE_TILT = { x: 0.1, y: 0.12, z: 0.03 }
/** How fast smoothed mouse catches the cursor (frame-rate independent lerp) */
const MOUSE_LERP_LAMBDA = 1

function GalaxyMouseGroup({ children, mouseInfluence, rotation, rotationSpeed }: { children: React.ReactNode; mouseInfluence: boolean; rotation: number; rotationSpeed: number }) {
   const groupRef = useRef<THREE.Group | null>(null)
   const mouseRef = useRef({ x: 0, y: 0 })
   const smoothRef = useRef({ x: 0, y: 0 })
   const autoRotationRef = useRef(GALAXY_BASE_ROT[2])
   const reduceMotionRef = useRef(
      typeof window !== 'undefined' &&
         window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
   )

   useEffect(() => {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (!mq) return

      const onChange = (event: MediaQueryListEvent) => {
         reduceMotionRef.current = event.matches
         if (event.matches && groupRef.current) {
            groupRef.current.rotation.set(
               GALAXY_BASE_ROT[0],
               GALAXY_BASE_ROT[1],
               GALAXY_BASE_ROT[2]
            )
            smoothRef.current.x = 0
            smoothRef.current.y = 0
         }
      }

      reduceMotionRef.current = mq.matches
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
   }, [])

   useEffect(() => {
      const onMove = (e: MouseEvent) => {
         if (reduceMotionRef.current) return
         const w = window.innerWidth || 1
         const h = window.innerHeight || 1
         mouseRef.current.x = (e.clientX / w) * 2 - 1
         mouseRef.current.y = (e.clientY / h) * 2 - 1
      }
      window.addEventListener('mousemove', onMove)
      return () => window.removeEventListener('mousemove', onMove)
   }, [])

   useFrame((_, dt) => {
      const g = groupRef.current
      if (!g) return

      if (reduceMotionRef.current) {
         g.rotation.set(
            GALAXY_BASE_ROT[0],
            GALAXY_BASE_ROT[1],
            autoRotationRef.current
         )
         return
      }

      const m = mouseRef.current
      const s = smoothRef.current
      const t = 1 - Math.exp(-MOUSE_LERP_LAMBDA * dt)
      s.x = THREE.MathUtils.lerp(s.x, m.x, t)
      s.y = THREE.MathUtils.lerp(s.y, m.y, t)
      autoRotationRef.current += dt * rotationSpeed * 0.18
      const mouseRotation = mouseInfluence ? rotation : 0
      g.rotation.x = GALAXY_BASE_ROT[0] - s.y * MOUSE_TILT.x * mouseRotation
      g.rotation.y = GALAXY_BASE_ROT[1] - s.x * MOUSE_TILT.y * mouseRotation
      g.rotation.z = autoRotationRef.current + s.x * s.y * MOUSE_TILT.z * mouseRotation
   })

   return (
      <group position={GALAXY_POSITION}>
         <group ref={groupRef} rotation={GALAXY_BASE_ROT}>
            {children}
         </group>
      </group>
   )
}

const MilkyWayGPGPU = React.memo(function MilkyWayGPGPU({ particleSize, coreColor, accentColor, outerColor, rotationSpeed }: GalaxyParticleProps) {
   const { gl } = useThree()
   const groupRef = useRef<THREE.Group | null>(null)
   const gpuRef = useRef<GPUCompute | null>(null)
   const matRef = useRef<THREE.ShaderMaterial | null>(null)
   const dataRef = useRef<THREE.Texture | null>(null)
   const reduceMotionRef = useRef(
      typeof window !== 'undefined' &&
         window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
   )
   const { geo, posTex, dataTex } = useMemo(() => {
      const { posTex, dataTex } = buildTextures(CFG)
      const geo = buildGeo(CFG)
      return { geo, posTex, dataTex }
   }, [])

   const mat = useMemo(() => new THREE.ShaderMaterial({
      uniforms: {
         uPosition: { value: posTex },
         uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
         uParticleSize: { value: particleSize },
         uCoreColor: { value: new THREE.Color(coreColor) },
         uAccentColor: { value: new THREE.Color(accentColor) },
         uOuterColor: { value: new THREE.Color(outerColor) },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
   }), [posTex])

   useEffect(() => {
      // `mat` is an imperative Three.js material, not React state — mutating
      // its GPU uniforms in place on prop change is the correct pattern
      // here, not a render-safety violation.
      // eslint-disable-next-line react-hooks/immutability
      mat.uniforms.uParticleSize.value = particleSize
      mat.uniforms.uCoreColor.value.set(coreColor)
      mat.uniforms.uAccentColor.value.set(accentColor)
      mat.uniforms.uOuterColor.value.set(outerColor)
   }, [accentColor, coreColor, mat, outerColor, particleSize])

   useEffect(() => {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (!mq) return
      const onChange = (event: MediaQueryListEvent) => {
         reduceMotionRef.current = event.matches
      }
      reduceMotionRef.current = mq.matches
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
   }, [])

   useEffect(() => {
      const gpu = new GPUCompute(CFG.texSize, CFG.texSize, gl)
      gpu.addVar('pos', SIM_FRAG, posTex)
      gpuRef.current = gpu
      dataRef.current = dataTex
      matRef.current = mat

      return () => {
         gpu.dispose()
         posTex.dispose()
         dataTex.dispose()
         geo.dispose()
         mat.dispose()
         matRef.current = null
      }
   }, [gl]) // eslint-disable-line react-hooks/exhaustive-deps

   useFrame((state, rawDelta) => {
      if (reduceMotionRef.current) return

      const gpu = gpuRef.current
      const material = matRef.current
      if (!gpu || !material) return
      const dt = Math.min(rawDelta, 0.05) * Math.max(rotationSpeed, 0)
      const tex = gpu.compute('pos', state.clock.elapsedTime, dt, dataRef.current)
      material.uniforms.uPosition.value = tex
   })

   return (
      <group
         ref={groupRef}
         scale={1.65}
         position={[0, 0, 0]}
         rotation={[degToRad(40), degToRad(0), degToRad(-5)]}
      >
         <points geometry={geo} material={mat} />
      </group>
   )
})

const BackgroundStars = React.memo(function BackgroundStars({ color }: { color: string }) {
   const mesh = useMemo(() => {
      // Cut further than the spec's one-third floor for the same
      // performance-budget reason as CFG.texSize above.
      const count = 700
      const pos = new Float32Array(count * 3)
      const rand = mulberry32(12345)
      for (let i = 0; i < count; i++) {
         const theta = rand() * Math.PI * 2
         const phi = Math.acos(2 * rand() - 1)
         const r = 40 + rand() * 20
         pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
         pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
         pos[i * 3 + 2] = r * Math.cos(phi)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const mat = new THREE.PointsMaterial({
         color, size: 0.055, sizeAttenuation: true,
         transparent: true, opacity: 0.7, depthWrite: false,
      })
      return new THREE.Points(geo, mat)
   }, [])

   useEffect(() => {
      mesh.material.color.set(color)
   }, [color, mesh])

   return <primitive object={mesh} />
})

function SceneBackground({ color }: { color: string }) {
   return <color attach="background" args={[color]} />
}

function SceneReady({ onReady }: { onReady: () => void }) {
   const frameCountRef = useRef(0)
   const readyRef = useRef(false)

   useFrame(() => {
      if (readyRef.current) return
      frameCountRef.current += 1
      if (frameCountRef.current < 24) return
      readyRef.current = true
      onReady()
   })

   return null
}

export default function MilkyWay({
   particleSize = DEFAULT_PARTICLE_SIZE,
   coreColor = DEFAULT_CORE_COLOR,
   accentColor = DEFAULT_ACCENT_COLOR,
   outerColor = DEFAULT_OUTER_COLOR,
   backgroundColor = DEFAULT_BACKGROUND_COLOR,
   mouseInfluence = DEFAULT_MOUSE_INFLUENCE,
   rotation = typeof mouseInfluence === 'number' ? mouseInfluence : DEFAULT_ROTATION,
   rotationSpeed = DEFAULT_ROTATION_SPEED,
}: MilkyWayProps = {}) {
   const resolvedProps = useMemo(
      () =>
         resolveMilkyWayProps({
            particleSize,
            coreColor,
            accentColor,
            outerColor,
            backgroundColor,
            mouseInfluence,
            rotation,
            rotationSpeed,
         }),
      [accentColor, backgroundColor, coreColor, mouseInfluence, outerColor, particleSize, rotation, rotationSpeed]
   )
   const rootRef = useRef<HTMLElement | null>(null)
   const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>('always')
   const [isPageLoaded, setIsPageLoaded] = useState(false)
   const [viewport, setViewport] = useState<{ dpr: number } | null>(null)
   const [isSceneReady, setIsSceneReady] = useState(false)

   useEffect(() => {
      const gate = createVisibilityGate({
         root: rootRef,
         onChange: (active) => setFrameloop(active ? 'always' : 'never'),
      })
      setFrameloop(gate.isActive ? 'always' : 'never')
      return () => gate.destroy()
   }, [])

   useLayoutEffect(() => {
      const markLoaded = () => {
         queueMicrotask(() => {
            setIsPageLoaded(true)
         })
      }
      if (document.readyState === 'complete') {
         markLoaded()
      } else {
         window.addEventListener('load', markLoaded, { once: true })
      }

      const updateViewport = () => {
         queueMicrotask(() => {
            setViewport({
               dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
            })
         })
      }

      updateViewport()
      window.addEventListener('resize', updateViewport)

      return () => {
         window.removeEventListener('load', markLoaded)
         window.removeEventListener('resize', updateViewport)
      }
   }, [])

   const showScene = isPageLoaded && viewport !== null

   return (
      <section
         ref={rootRef}
         className="relative"
         style={{ width: '100%', height: '100vh', background: resolvedProps.backgroundColor }}
      >
         {showScene ? (
            <Canvas
               aria-hidden="true"
               dpr={viewport.dpr}
               gl={{ antialias: false, powerPreference: 'high-performance' }}
               camera={{ position: [-1, -1.8, 4], fov: 45, near: 0.01, far: 200 }}
               style={{ opacity: isSceneReady ? 1 : 0 }}
               frameloop={frameloop}
               onCreated={({ gl }) => {
                  gl.setClearColor(resolvedProps.backgroundColor, 1)
               }}
            >
               <SceneReady onReady={() => setIsSceneReady(true)} />
               <SceneBackground color={resolvedProps.backgroundColor} />
               <BackgroundStars color={resolvedProps.coreColor} />
               <Center rotation={[degToRad(-10), degToRad(0), degToRad(0)]} position={[-1.2, 0.5, 0]}>
                  <GalaxyMouseGroup
                     mouseInfluence={resolvedProps.mouseInfluence}
                     rotation={resolvedProps.rotation}
                     rotationSpeed={resolvedProps.rotationSpeed}
                  >
                     <MilkyWayGPGPU
                        particleSize={resolvedProps.particleSize}
                        coreColor={resolvedProps.coreColor}
                        accentColor={resolvedProps.accentColor}
                        outerColor={resolvedProps.outerColor}
                        rotationSpeed={resolvedProps.rotationSpeed}
                     />
                     {isSceneReady && (
                        <SmokeFlow
                           particleSize={resolvedProps.particleSize}
                           coreColor={resolvedProps.coreColor}
                           accentColor={resolvedProps.accentColor}
                           outerColor={resolvedProps.outerColor}
                           rotationSpeed={resolvedProps.rotationSpeed}
                        />
                     )}
                  </GalaxyMouseGroup>
               </Center>
               <EffectComposer>
                  <EdgeBlurEffect blurStrength={1.2} blurStart={0.2} />
                  <EdgeBlurEffect blurType="classic" blurStrength={0.3} blurStart={0.1} />
                  <Vignette opacity={0.5} offset={0.8} darkness={0.7} />
               </EffectComposer>
            </Canvas>
         ) : null}
      </section>
   )
}

