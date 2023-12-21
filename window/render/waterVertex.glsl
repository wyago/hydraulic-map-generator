attribute vec3 waternormal;
attribute float depth;
varying vec3 vWaterNormal;
varying float vDepth;

void main() {
    vWaterNormal = waternormal;
    vDepth = depth;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    gl_Position = projectionMatrix * mvPosition;
}
