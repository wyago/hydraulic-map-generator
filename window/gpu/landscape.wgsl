struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) rocknormal : vec3f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
    @location(3) waternormal : vec3f,
    @location(4) height : f32,
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
    @location(6) waternormal: vec3f,
) -> VertexOut {
    var output: VertexOut;
    output.position = perspective * view * vec4f(position.x, (hard + soft)*450, position.y, 1);

    output.height = hard + soft;
    output.rocknormal = rocknormal;
    output.waternormal = waternormal;
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
    var rockDot = clamp(dot(normalize(fragData.rocknormal), normalize(light)), 0.0, 1.0);

    const sunlight = vec3f(0.9,0.9, 0.85);
    var sunColor = sunlight * rockDot;
    let ambient = vec3f(0.1, 0.1, 0.2)*(fragData.height)*4;

    var water = clamp(fragData.water - 0.003, 0, 1);
    var depth = water * 20.0;

    var reflect = 0.6;
    if (water < 0.001) {
        reflect = mix(0.0, 0.6, water/0.001);
    }
    var subtractor = vec3f(0.12, 0.09, 0.08) * depth;
    var transit = sunColor * (1.0 - reflect);
    var ground = (transit + ambient - subtractor)*fragData.albedo;
    output.color = vec4f(ground*2, 1);
    return output;
}