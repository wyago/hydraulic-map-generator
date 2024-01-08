struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) color : vec3f,
    @location(1) offset : vec2f
}

@group(0) @binding(0)
var<uniform> zoom : f32;
@group(0) @binding(1)
var<uniform> mode : i32;

fn albedo(hard: f32, soft: f32, aquifer: f32) -> vec3f {
    const silt_albedo = vec3f(0.69, 0.43, 0.2);
    const rock_albedo = vec3f(0.49, 0.38, 0.36);
    const softrock_albedo = vec3f(0.69, 0.43, 0.2);
    const vegetation_albedo = vec3f(0.13, 0.17, 0.11); 

    var height = (hard + soft - 0.28)*4;
    var vegetation = clamp(aquifer*1.01/(soft+0.01), 0, 1);

    var result: vec3f;
    var softness = (soft / (hard + soft)) * 3;
    var siltPortion = max(softness, 0);
    result.x = mix(rock_albedo.r, silt_albedo.r, siltPortion);
    result.y = mix(rock_albedo.g, silt_albedo.g, siltPortion);
    result.z = mix(rock_albedo.b, silt_albedo.b, siltPortion);

    result.x = mix(result.x, vegetation_albedo.r, min(vegetation, softness + 0.5));
    result.y = mix(result.y, vegetation_albedo.g, min(vegetation, softness + 0.5));
    result.z = mix(result.z, vegetation_albedo.b, min(vegetation, softness + 0.5));
    return result;
}

@vertex
fn vertex_main(
    @location(0) position: vec2f,
    @location(1) offset: vec2f,
    @location(2) hard: f32,
    @location(3) water: f32,
    @location(4) rocknormal: vec3f,
    @location(5) soft: f32,
    @location(6) silt: f32,
    @location(7) aquifer: f32,
) -> VertexOut {
    var output: VertexOut;
    output.position = vec4f((position + offset)*zoom, 0, 1);
    output.offset = position;

    if (mode == 0) {
        var albedo = albedo(hard, soft, aquifer);

        var light = vec3f(0.5, 0.5, 0.5);
        var rockDot = clamp(dot(rocknormal, light), 0.0, 1.0);

        var sunlight = vec3f(0.9,0.9, 0.85);
        var sunColor = sunlight * rockDot + sunlight * 0.4;
        var ambient = vec3f(0.2, 0.2, 0.25);

        var depth = water * 10.0;

        var reflect = 0.8;
        if (water < 0.004) {
            reflect = mix(0.0, 0.4, water/0.004);
        }
        var subtractor = mix(vec3f(0.12, 0.09, 0.08), vec3f(0.12, 0.35, 0.58), silt) * depth;
        var transit = sunColor * (1.0 - reflect) - subtractor;
        output.color = (transit + ambient)*albedo + vec3f(0,0.05,0.12)*water;
    } else {
        output.color = vec3f(hard + soft, aquifer, water);
    }

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