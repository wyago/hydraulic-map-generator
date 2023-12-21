varying vec3 vColor;
void main() {
    gl_FragColor = vec4(vColor, 1.0);
    vec2 coords = gl_PointCoord - vec2(0.5, 0.5);
    gl_FragDepth = gl_FragDepth + length(coords)*0.001;
}
