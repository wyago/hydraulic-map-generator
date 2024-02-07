struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) rocknormal : vec3f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
    @location(3) waternormal : vec3f,
    @location(4) height : f32,
    @location(5) reflection : vec3f,
    @location(6) reflectivity : f32,
    @location(7) dirt : f32,
    @location(8) view : vec3f,
    @location(9) light : vec3f,
}

@group(0) @binding(0)
var<uniform> perspective : mat4x4f;
@group(0) @binding(1)
var<uniform> view : mat4x4f;
@group(0) @binding(2)
var<uniform> eye : vec3f;

@group(1) @binding(0)
var<uniform> light : vec3f;

fn color(rocknormal: vec3f, height: f32, rawwater: f32, albedo: vec3f, reflection: vec3f, reflectivity: f32, dirt: f32, view: vec3f, light: vec3f) -> vec3f {
    const fogalbedo = vec3f(0.5,0.5,0.5); 

    var rockDot = clamp(dot(normalize(rocknormal), normalize(light)), 0.0, 1.0);

    const sunlight = vec3f(0.9,0.9, 0.85);
    var sunColor = sunlight * rockDot;
    let ambient = vec3f(0.1, 0.1, 0.2)*clamp((height - 0.2)*8, 0, 1);

    var water = clamp(rawwater, 0, 1);
    var depth = water * 20.0;
    
    let specular = pow(clamp(dot(reflection, light), 0, 1), 10)*0.5*reflectivity;

    var reflect = 0.8;
    if (water < 0.001) {
        reflect = mix(0.0, 0.8, water/0.001);
    }
    var transit = sunColor*(1-reflectivity);
    let coniness =  (1 - dirt*clamp(dot(normalize(view), normalize(rocknormal))*0.8, 0, 1));
    return clamp(transit + ambient + specular, vec3f(0), vec3f(1))*albedo*coniness*0.5;
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
    @location(7) aquifer: f32,
) -> VertexOut {
    var output: VertexOut;
    var vertex = vec3f(position.x, (hard + soft)*450, position.y);
    output.position = perspective * view * vec4f(vertex, 1);
    output.reflection = reflect(normalize(rocknormal), normalize(vertex - eye));
    output.view = vertex - eye;

    var softness = clamp((soft / (hard + soft)) * 10, 0, 1);
    var vegetation = clamp(aquifer*1.01/(soft+0.01), 0, 1);
    output.dirt =clamp(min(vegetation, softness + 0.5), 0, 1);
    output.height = hard + soft;
    output.rocknormal = rocknormal;
    output.waternormal = waternormal;
    output.albedo = albedo;
    output.water = water;
    output.light = normalize(light);
    output.reflectivity = clamp(1 - softness, 0, 0.2);
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOutput {
    var output: FragmentOutput;
    var reflect = 0.8;
    if (fragData.water < 0.001) {
        reflect = mix(0.0, 0.8, fragData.water/0.001);
    }
    output.color = vec4f(color(fragData.rocknormal, fragData.height, fragData.water, fragData.albedo, fragData.reflection, fragData.reflectivity, fragData.dirt, fragData.view, fragData.light), reflect);
    return output;
}