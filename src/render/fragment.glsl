uniform sampler2D pointTexture;

void main() {
    gl_FragColor = texture2D( pointTexture, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
}
