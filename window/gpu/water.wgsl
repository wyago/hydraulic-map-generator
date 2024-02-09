struct VertexOut {
    @builtin(position) position : vec4f,
    @location(1) albedo : vec3f,
    @location(2) water : f32,
    @location(3) waternormal : vec3f,
    @location(4) reflection : vec3f,
    @location(5) view : vec3f,
    @location(6) vertex : vec3f,
    @location(7) light : vec3f,
    @location(8) dirt : f32,
}

@group(0) @binding(0)
var<uniform> perspective : mat4x4f;
@group(0) @binding(1)
var<uniform> view : mat4x4f;
@group(0) @binding(2)
var<uniform> eye : vec3f;
@group(0) @binding(3)
var<uniform> inverseView: mat4x4f;
@group(0) @binding(4)
var<uniform> time: f32;

@group(1) @binding(0)
var<uniform> light : vec3f;

@group(2) @binding(0)
var gBufferDepth: texture_depth_2d;
@group(2) @binding(1)
var gLand: texture_2d<f32>;

@vertex
fn vertex_main(
    @location(0) position: vec2f,
    @location(1) rocknormal: vec2f,
    @location(2) albedo: vec3f,
    @location(3) hard: f32,
    @location(4) soft: f32,
    @location(5) water: f32,
    @location(6) waternormal: vec2f,
    @location(7) aquifer: f32,
) -> VertexOut {
    var output: VertexOut;
    var vertex = vec3f(position.x, (hard + soft + water-0.0007)*450, position.y);
    var recoverWaterNormal = vec3f(waternormal.x, -sqrt(1 - waternormal.x*waternormal.x + waternormal.y*waternormal.y), waternormal.y);

    output.position = perspective * view * vec4f(vertex, 1);
    output.reflection = reflect(normalize(recoverWaterNormal), normalize(vertex - eye));
    output.view = normalize(vertex - eye);
    output.vertex = vertex;
    output.waternormal = normalize(recoverWaterNormal);
    output.albedo = albedo;
    output.water = water;
    output.light = normalize(light);
    var softness = clamp((soft / (hard + soft)) * 10, 0, 1);
    var vegetation = clamp(aquifer*1.01/(soft+0.01), 0, 1);
    output.dirt =clamp(min(vegetation, softness + 0.5), 0, 1);
    return output;
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

fn world_from_screen_coord(coord : vec2<f32>, depth_sample: f32) -> vec3<f32> {
  // reconstruct world-space position from the screen coordinate.
  let posClip = vec4(coord.x * 2.0 - 1.0, (1.0 - coord.y) * 2.0 - 1.0, depth_sample, 1.0);
  let posWorldW = inverseView * posClip;
  let posWorld = posWorldW.xyz / posWorldW.www;
  return posWorld;
}

fn gammacomponent(cl: f32) -> f32 {
    if (cl > 1.0) {
         return 1.0;
     } else if (cl < 0.0) {
         return 0.0;
     } else if (cl < 0.0031308) {
         return 12.92 * cl;
     } else {
         return 1.055 * pow(cl, 0.41666) - 0.055;
     }
}

fn ACESFilm(x: vec3f) -> vec3f {
    const a = 2.51;
    const b = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), vec3f(0), vec3f(1));
}

fn gamma(cl: vec3f) -> vec3f {
    return vec3f(gammacomponent(cl.x), gammacomponent(cl.y), gammacomponent(cl.z));
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
     var land = textureLoad(
        gLand,
        vec2<i32>(floor(fragData.position.xy)),
        0
    );

    let bufferSize = textureDimensions(gBufferDepth);
    let coordUV = fragData.position.xy / vec2<f32>(bufferSize);
    let far = world_from_screen_coord(coordUV.xy, depth);
    let near = world_from_screen_coord(coordUV.xy, fragData.position.z);
    let farDist = length(far - eye);
    let nearDist = length(near - eye);
    var waterDepth = max((farDist - nearDist)*0.5, 0);
    var specular = pow(clamp(dot(fragData.reflection, fragData.light), 0, 1), 128)*0.5;

    var reflected = 0.7;
    if (waterDepth < 0.2) {
        reflected = mix(0.0, 0.7, waterDepth/0.2);
    }

    let extinctionColor = vec3f(0.3, 0.09, 0.08);
    var transmittance = exp(-waterDepth * extinctionColor);
    let waterColor = vec3f(0.08, 0.2, 0.21)*0.3;
    let scattering = (1 - transmittance)*waterColor * (vec3f(0.1, 0.1, 0.2) + clamp(-fragData.light.y, 0, 1)*sunlight);

    //output.color = vec4f(gamma(mix(land.rgb, waterColor, waterDepth) + specular), 1);
    let linearColor = (land.rgb*1.2*transmittance + scattering)*(1 - reflected) + specular*reflected;
    output.color = vec4f(ACESFilm(linearColor*3), 1);
    return output;
}