uniform vec3 suncolor;
uniform vec3 light;

varying vec3 vRockNormal;
varying vec3 vAlbedo;

void main() {
    float rockDot = clamp(dot(normalize(vRockNormal), light), 0.0, 1.0);

    vec3 sunColor = suncolor * rockDot;
    vec3 ambient = vec3(0.2, 0.2, 0.25);
    vec3 vColor = (sunColor + ambient)*vAlbedo;

    gl_FragColor = vec4(vColor, 1.0);
}
