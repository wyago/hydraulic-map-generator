attribute vec3 albedo;

attribute vec3 rocknormal;

varying vec3 vRockNormal;
varying vec3 vAlbedo;

void main() {
    vRockNormal = rocknormal;
    vAlbedo = albedo;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    gl_Position = projectionMatrix * mvPosition;
}
