struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) rocknormal : vec3f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
    @location(3) waternormal : vec3f,
    @location(4) height : f32,
    @location(5) reflection : vec3f,
    @location(6) reflectivity : f32,
}

@group(0) @binding(0)
var<uniform> perspective : mat4x4f;
@group(0) @binding(1)
var<uniform> view : mat4x4f;
@group(0) @binding(2)
var<uniform> eye : vec3f;

fn color(rocknormal: vec3f, height: f32, rawwater: f32, albedo: vec3f, reflection: vec3f, reflectivity: f32) -> vec3f {
    const fogalbedo = vec3f(0.5,0.5,0.5); 

    const light = vec3f(0.5, 0.5, 0.5);
    var rockDot = clamp(dot(normalize(rocknormal), normalize(light)), 0.0, 1.0);

    const sunlight = vec3f(0.9,0.9, 0.85);
    var sunColor = sunlight * rockDot;
    let ambient = vec3f(0.1, 0.1, 0.2)*(height)*4;

    var water = clamp(rawwater - 0.003, 0, 1);
    var depth = water * 20.0;
    
    let specular = pow(clamp(dot(reflection, rocknormal), 0, 1), 10)*0.25*reflectivity;

    var reflect = 0.6;
    if (water < 0.001) {
        reflect = mix(0.0, 0.6, water/0.001);
    }
    var subtractor = vec3f(0.12, 0.09, 0.08) * depth;
    var transit = sunColor * (1.0 - reflect);
    return (transit + ambient + specular - subtractor)*albedo*1.5;
}

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
    var vertex = vec3f(position.x, (hard + soft)*450, position.y);
    output.position = perspective * view * vec4f(vertex, 1);
    const light = vec3f(0.5, 0.5, 0.5);
    output.reflection = reflect(normalize(light), normalize(vertex - eye));

    output.height = hard + soft;
    output.rocknormal = rocknormal;
    output.waternormal = waternormal;
    output.albedo = albedo;
    output.water = water;
    output.reflectivity = 1 - clamp(soft * 200, 0, 1);
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOutput {
    var output: FragmentOutput;
    output.color = vec4f(color(fragData.rocknormal, fragData.height, fragData.water, fragData.albedo, fragData.reflection, fragData.reflectivity), 1);
    return output;
}