import type { Tier } from '../../catalog/model'

/** Uniforms por tier (§8.9). `mask`: 0 nenhuma (só glare), 1 moldura (reverse), 2 só na arte, 3 carta inteira. */
export type HoloPreset = {
  mask: 0 | 1 | 2 | 3
  foil: number
  gold: 0 | 1
  sparkle: 0 | 1
  edge: [number, number, number]
  edgeStrength: number
}

const WHITE: [number, number, number] = [1, 1, 1]
const GOLD_EDGE: [number, number, number] = [1, 0.886, 0.545]
const GOLD_LINE: [number, number, number] = [1, 0.82, 0.35]

export function holoPreset(tier: Tier, reverse: boolean): HoloPreset {
  if (reverse) return { mask: 1, foil: 0.6, gold: 0, sparkle: 0, edge: WHITE, edgeStrength: 0 }
  switch (tier) {
    case 'common':
    case 'uncommon':
      return { mask: 0, foil: 0, gold: 0, sparkle: 0, edge: WHITE, edgeStrength: 0 }
    case 'rare':
    case 'holo':
      return { mask: 2, foil: 0.45, gold: 0, sparkle: 0, edge: WHITE, edgeStrength: 0 }
    case 'double_rare':
      return { mask: 2, foil: 0.45, gold: 0, sparkle: 0, edge: GOLD_LINE, edgeStrength: 0.55 }
    case 'hyper_rare':
      return { mask: 3, foil: 0.62, gold: 1, sparkle: 1, edge: GOLD_EDGE, edgeStrength: 0.5 }
    default:
      // illustration_rare, ultra_rare, special_illustration_rare e os tiers de outros sets
      return { mask: 3, foil: 0.5, gold: 0, sparkle: 1, edge: WHITE, edgeStrength: 0.35 }
  }
}

export const HOLO_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vLook;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 v = normalize(cameraPosition - wp.xyz);
  vLook = vec3(
    dot(v, normalize(modelMatrix[0].xyz)),
    dot(v, normalize(modelMatrix[1].xyz)),
    dot(v, normalize(modelMatrix[2].xyz))
  );
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const HOLO_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uMask;
uniform float uFoil;
uniform float uGold;
uniform float uSparkle;
uniform vec3 uEdge;
uniform float uEdgeStrength;
uniform float uRadius;
varying vec2 vUv;
varying vec3 vLook;

const float ASPECT = 1.4;
// Retângulo da arte (§7.2): 8%–92% da largura, 12%–55% da altura a partir do topo (uv.y cresce para cima).
const vec4 ART = vec4(0.08, 0.45, 0.92, 0.88);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 rainbow(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
vec3 goldBand(float t) {
  float w = smoothstep(0.3, 0.5, t) * (1.0 - smoothstep(0.5, 0.7, t));
  return mix(vec3(1.0, 0.82, 0.35), vec3(1.0), w);
}
float inRect(vec2 uv, vec4 r) { vec2 s = step(r.xy, uv) * step(uv, r.zw); return s.x * s.y; }
// Cantos arredondados (raio = uRadius da largura), com 0,4% de antialias.
float corners(vec2 uv) {
  vec2 q = (uv - 0.5) * vec2(1.0, ASPECT);
  vec2 p = abs(q) - (vec2(0.5, 0.5 * ASPECT) - uRadius);
  float d = length(max(p, 0.0)) - uRadius;
  return 1.0 - smoothstep(0.0, 0.004, d);
}

void main() {
  vec4 base = texture2D(uMap, vUv);
  vec2 tilt = clamp(vLook.xy * 3.0, -1.0, 1.0);                       // tune: ganho do olhar
  float inArt = inRect(vUv, ART);
  float m = uMask < 0.5 ? 0.0 : (uMask < 1.5 ? 1.0 - inArt : (uMask < 2.5 ? inArt : 1.0));

  // Faixa diagonal a 115° que desliza com o olhar (o background-position do .foil).
  float diag = vUv.x * 0.42 - vUv.y * 0.91;
  float t = diag * 0.6 - (tilt.x + tilt.y) * 0.55;                    // tune: velocidade da faixa
  float band = smoothstep(-0.6, -0.15, t) * (1.0 - smoothstep(0.3, 0.75, t));
  vec3 foilCol = mix(rainbow(t * 0.75), goldBand(fract(t + 0.5)), uGold);
  vec3 foil = foilCol * 0.75 * band * m * uFoil;
  vec3 col = min(base.rgb / max(1.0 - foil, 0.02), 1.0);              // color-dodge
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lum), col, 1.0 + 0.3 * band * m * uFoil), 0.0, 1.0); // saturate(1.3) onde há foil

  // Glitter: células de ~2px que piscam conforme o olhar (o feTurbulence do protótipo).
  vec2 cell = floor(vUv * vec2(160.0, 224.0));
  float h = hash(cell);
  float twinkle = pow(max(0.0, sin(h * 40.0 + (tilt.x - tilt.y) * 9.0)), 24.0);
  float sparkle = step(0.86, h) * twinkle * uSparkle * m;              // tune: 0.86 = densidade
  col = 1.0 - (1.0 - col) * (1.0 - vec3(sparkle * 0.75));             // screen

  // Glare (soft-light) no ponto do olhar: branco .55 → .12 aos 22% → 0 aos 50%.
  vec2 gp = vec2(0.5) - tilt * 0.55;
  float gd = length((vUv - gp) * vec2(1.0, ASPECT));
  float g = 0.55 * (1.0 - smoothstep(0.0, 0.22, gd)) + 0.12 * (1.0 - smoothstep(0.22, 0.5, gd));
  col = mix(col, 2.0 * col - col * col, g);

  // Borda: aro da carta (inteira) ou filete ao redor da arte (double_rare).
  float rim = uMask > 2.5
    ? 1.0 - inRect(vUv, vec4(0.035, 0.025, 0.965, 0.975))
    : (uMask > 1.5 ? inArt - inRect(vUv, ART + vec4(0.012, 0.0086, -0.012, -0.0086)) : 0.0);
  col = mix(col, uEdge, rim * uEdgeStrength);

  gl_FragColor = vec4(col, base.a * uOpacity * corners(vUv));
}
`
