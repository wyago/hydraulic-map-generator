attribute vec3 albedo;
attribute float water;
attribute float height;
attribute float fog;
attribute float occlusion;
attribute int index;

attribute vec3 rocknormal;
attribute vec3 waternormal;

uniform vec3 sunlight;
uniform vec3 light;
uniform int selected;

uniform int mode;

varying vec3 vColor;

void main() {
    if (mode == 0) {
        float rockDot = clamp(dot(rocknormal, light), 0.0, 1.0);
        float totalDot = clamp(dot(waternormal, light), 0.0, 1.0);

        vec3 sunColor = sunlight * rockDot;
        vec3 ambient = vec3(0.2, 0.2, 0.25);

        if (water > 0.002) {
            float depth = water * 10.0;

            float reflect = 0.9;
            vec3 subtractor = vec3(0.18, 0.13, 0.12) * depth;
            vec3 transit = sunColor * (1.0 - reflect) - subtractor;

            vec3 bounceLight = sunlight * reflect * pow(totalDot, 20.0)*0.01;
            vColor = bounceLight + (transit + ambient)*albedo + vec3(0,0.05,0.12)*water;
        } else {
            vColor = (sunColor + ambient) * albedo;
        }

        vColor = mix(vColor, vec3(0.7), fog*0.5) * 1.7;

        if (index == selected) {
            vColor = vec3(1.0);
        }
    } else if (mode == 1) {
        vColor = vec3(height);
    } else if (mode == 2) {
        vColor = vec3(occlusion);
    }

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    float scaling = sqrt(
        modelViewMatrix[0][0] * modelViewMatrix[0][0] +
        modelViewMatrix[0][1] * modelViewMatrix[0][1] +
        modelViewMatrix[0][2] * modelViewMatrix[0][2]
    );
    gl_PointSize = 25000.0 * scaling;

    gl_Position = projectionMatrix * mvPosition;
}
