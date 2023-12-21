uniform vec3 suncolor;
uniform vec3 light;

varying vec3 vWaterNormal;
varying float vDepth;

void main() {
    float totalDot = clamp(dot(vWaterNormal, light), 0.0, 1.0);

    vec3 bounceLight = suncolor * pow(totalDot, 1.0);
    
    float depth = vDepth;
    if (depth > 0.002) {
        depth += 0.4;
    }
    vec3 vColor = vec3(0.95, 0.9, 0.8)*depth*1.0 - bounceLight;

    gl_FragColor = vec4(vColor, 1.0);
}
