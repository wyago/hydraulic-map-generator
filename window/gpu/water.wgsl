struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) rocknormal : vec3f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
    @location(3) waternormal : vec3f,
    @location(4) reflection : vec3f,
    @location(5) view : vec3f,
    @location(6) vertex : vec3f,
    @location(7) light : vec3f,
}

@group(0) @binding(0)
var<uniform> perspective : mat4x4f;
@group(0) @binding(1)
var<uniform> view : mat4x4f;
@group(0) @binding(2)
var<uniform> eye : vec3f;

@group(1) @binding(0)
var<uniform> light : vec3f;

@group(2) @binding(0)
var gBufferDepth: texture_depth_2d;

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
    var vertex = vec3f(position.x, (hard + soft + water)*450, position.y);
    output.position = perspective * view * vec4f(vertex, 1);
    output.reflection = reflect(normalize(waternormal), normalize(vertex - eye));
    output.view = normalize(vertex - eye);
    output.vertex = vertex;
    output.rocknormal = rocknormal;
    output.waternormal = waternormal;
    output.albedo = albedo;
    output.water = water;
    output.light = normalize(light);
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOutput {
    var output: FragmentOutput;
    const sunlight = vec3f(0.9,0.9, 0.85);
     let depth = textureLoad(
        gBufferDepth,
        vec2<i32>(floor(fragData.position.xy)),
        0
    );

    var water = clamp(fragData.water - 0.003, 0, 1);
    var normal = normalize(fragData.waternormal);

    var reflect = 1.0;
    if (water < 0.001) {
        reflect = mix(0.0, 1.0, water/0.001);
    }
    let specular = pow(clamp(dot(fragData.reflection, fragData.light), 0, 1), 40)*0.4;

    output.color = vec4f(0.1,0.2,0.3, clamp((depth - fragData.position.z)*5, 0, 1));//vec4f(sunlight, reflect*specular);
    return output;
}