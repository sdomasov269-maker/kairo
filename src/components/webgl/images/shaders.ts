export const imageVertexShader = `
varying vec2 vScreenUv;

void main() {
  vScreenUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const imageFragmentPrelude = `
vec2 applyCurl(vec2 screenUv) {
  float centered = 2.0 * screenUv.y - 1.0;
  float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered));
  float uvScale = 1.0 - profile * uCurlStrength;
  float distortedX = (screenUv.x - 0.5) * uvScale + 0.5;
  return vec2(distortedX, screenUv.y);
}

vec2 coverUv(vec2 localUv, vec2 textureSize, vec2 rectSize) {
  float textureAspect = textureSize.x / max(textureSize.y, 1.0);
  float rectAspect = rectSize.x / max(rectSize.y, 1.0);
  if (textureAspect > rectAspect) {
    localUv.x = (localUv.x - 0.5) * (rectAspect / textureAspect) + 0.5;
  } else {
    localUv.y = (localUv.y - 0.5) * (textureAspect / rectAspect) + 0.5;
  }
  return localUv;
}

float roundedRectMask(vec2 localUv, vec2 sizePx, float radiusPx) {
  vec2 point = (localUv - 0.5) * sizePx;
  vec2 halfSize = sizePx * 0.5;
  float radius = min(radiusPx, min(halfSize.x, halfSize.y));
  vec2 q = abs(point) - (halfSize - vec2(radius));
  float distanceToEdge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  return 1.0 - smoothstep(-1.0, 1.0, distanceToEdge);
}
`;

const imageFragmentMain = `
  vec2 localUv = (curledScreenUv - uRect.xy) / uRect.zw;
  vec2 edge = min(localUv, 1.0 - localUv);
  float inside = step(0.0, edge.x) * step(0.0, edge.y);
  vec2 rectPx = uRect.zw * uViewportPx;
  vec2 textureUv = coverUv(clamp(localUv, 0.0, 1.0), uTextureSize, rectPx);
  vec4 color = texture2D(uTexture, textureUv);
  color.a *= inside * roundedRectMask(localUv, rectPx, uRadiusPx);
  gl_FragColor = color;
  #include <colorspace_fragment>
`;

const imageFragmentHeader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uTextureSize;
uniform vec2 uViewportPx;
uniform vec4 uRect;
uniform float uRadiusPx;
uniform float uCurlStrength;
varying vec2 vScreenUv;
`;

export const imageFragmentShader = `
${imageFragmentHeader}
${imageFragmentPrelude}

void main() {
  vec2 curledScreenUv = applyCurl(vScreenUv);
${imageFragmentMain}
}
`;

export const passthroughImageFragmentShader = `
${imageFragmentHeader}
${imageFragmentPrelude}

void main() {
  vec2 curledScreenUv = vScreenUv;
${imageFragmentMain}
}
`;
