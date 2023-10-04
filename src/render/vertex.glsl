attribute float size;


void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    float scaling = sqrt(
        modelViewMatrix[0][0] * modelViewMatrix[0][0] +
        modelViewMatrix[0][1] * modelViewMatrix[0][1] +
        modelViewMatrix[0][2] * modelViewMatrix[0][2]
    );
    gl_PointSize = 3500.0 * scaling;

    gl_Position = projectionMatrix * mvPosition;
}