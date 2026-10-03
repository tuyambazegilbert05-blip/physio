export const communityNodeVertexShader = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const communityNodeFragmentShader = `
varying vec3 vNormal;
void main() {
  float light = 0.55 + 0.45 * max(dot(normalize(vNormal), normalize(vec3(0.4, 0.7, 1.0))), 0.0);
  gl_FragColor = vec4(vec3(0.28, 0.39, 0.82) * light, 1.0);
}
`
