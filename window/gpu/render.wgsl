struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) color : vec3f,
    @location(1) offset : vec2f
}

@vertex
fn vertex_main(
    @location(0) position: vec2f,
    @location(1) offset: vec2f,
    @location(2) hard: f32,
    @location(3) water: f32,
    @location(4) rocknormal: vec3f
) -> VertexOut {
    var output: VertexOut;
    output.position = vec4f((position + offset)*0.001, 0, 1);

    var light = vec3f(0.5, 0.5, 0.5);
    var rockDot = clamp(dot(rocknormal, light), 0.0, 1.0);

    var sunlight = vec3f(0.9,0.9, 0.85);
    var sunColor = sunlight * rockDot + sunlight * 0.4;
    var ambient = vec3f(0.2, 0.2, 0.25);

    var depth = water * 10.0;

    var reflect = 0.7;
    if (water < 0.002) {
        reflect = mix(0.0, 0.1, water/0.002);
    }
    var subtractor = vec3f(0.18, 0.13, 0.12) * depth;
    var transit = sunColor * (1.0 - reflect) - subtractor;

    var vColor= (transit + ambient) + vec3f(0,0.05,0.12)*water;

    output.color = vec3f(hard);
    output.offset = position;
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
    @builtin(frag_depth) depth : f32
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = vec4f(fragData.color, 1);
    output.depth = length(fragData.offset)*0.01;
    return output;
}