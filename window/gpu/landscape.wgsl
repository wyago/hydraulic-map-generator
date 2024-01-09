struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) rocknormal : vec3f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
}

@group(0) @binding(0)
var<uniform> perspective : mat4x4f;
@group(0) @binding(1)
var<uniform> view : mat4x4f;

@vertex
fn vertex_main(
    @location(0) position: vec2f,
    @location(1) rocknormal: vec3f,
    @location(2) albedo: vec3f,
    @location(3) hard: f32,
    @location(4) soft: f32,
    @location(5) water: f32,
) -> VertexOut {
    var output: VertexOut;
    output.position = perspective * view * vec4f(position.x, (hard + soft + water)*250, position.y, 1);

    output.rocknormal = rocknormal;
    output.albedo = albedo;
    output.water = water;
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOutput {
    var output: FragmentOutput;
    const fogalbedo = vec3f(0.5,0.5,0.5); 

    const light = vec3f(0.5, 0.5, 0.5);
    var rockDot = clamp(dot(fragData.rocknormal, light), 0.0, 1.0);

    const sunlight = vec3f(0.9,0.9, 0.85);
    var sunColor = sunlight * rockDot + sunlight * 0.4;
    const ambient = vec3f(0.2, 0.2, 0.25);

    var water = fragData.water;
    var depth = water * 5.0;

    var reflect = 0.8;
    if (water < 0.004) {
        reflect = mix(0.0, 0.4, water/0.004);
    }
    var subtractor = vec3f(0.12, 0.09, 0.08) * depth;
    var transit = sunColor * (1.0 - reflect) - subtractor;
    var ground = (transit + ambient)*fragData.albedo + vec3f(0,0.05,0.12)*clamp(water, 0, 0.1);
    output.color = vec4f(ground, 1);
    return output;
}