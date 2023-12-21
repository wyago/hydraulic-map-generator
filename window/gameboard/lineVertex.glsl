attribute vec2 norm;
uniform float scale;

void main() {
    float w = length(norm);

    float matscale = sqrt(
        modelViewMatrix[0][0] * modelViewMatrix[0][0] +
        modelViewMatrix[0][1] * modelViewMatrix[0][1] +
        modelViewMatrix[0][2] * modelViewMatrix[0][2]
    );

    float scaling = scale*w*0.005/matscale;
    vec2 nnorm = normalize(norm)*clamp(scaling, 0.05, 8.0);
    vec2 pos = position.xy + nnorm;

    vec4 mvPosition = modelViewMatrix * vec4( pos, 0.0, 1.0 );

    gl_Position = projectionMatrix * mvPosition;
}
