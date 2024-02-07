struct Tile {
    hard: f32,
    soft: f32,
    water: f32,
    aquifer: f32,
    original: f32,
    silt: f32
}

struct AdjacentIndex {
    base: i32,
    length: i32
}

struct Normals {
    rocknormal: vec3f,
    waternormal: vec3f
}

@group(0) @binding(0)
var<storage, read_write> tiles: array<Tile>;
@group(0) @binding(1)
var<storage, read_write> adjacents: array<u32>;
@group(0) @binding(2)
var<storage, read_write> adjacent_indices: array<AdjacentIndex>;
@group(0) @binding(3)
var<storage, read_write> normals: array<vec3f>;
@group(0) @binding(4)
var<storage, read_write> positions: array<vec2f>;
@group(0) @binding(5)
var<storage, read_write> albedos: array<vec3f>;
@group(0) @binding(6)
var<storage, read_write> waternormals: array<vec3f>;


fn albedo(hard: f32, soft: f32, aquifer: f32) -> vec3f {
    const silt_albedo = vec3f(0.39, 0.23, 0.1);
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

fn rockElevation(i: u32) -> f32 {
    return (tiles[i].hard + tiles[i].soft)*450.0;
}
fn elevation(i: u32) -> f32 {
    return (tiles[i].hard + tiles[i].soft + tiles[i].water)*450.0;
}

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    let center = global_id.x;
    var min = 1000.0f;
    let indices = adjacent_indices[center];
    let base = indices.base;
    let adjacent_count = indices.length;

    var rocknormal = vec3f(0,0,0);
    var waternormal = vec3f(0,0,0);
    let position = positions[center];
    let center_position = vec3f(position.x, rockElevation(center), position.y);
    let half = adjacent_count/2;
    for (var i = 0; i <adjacent_count; i++) {
        let adj1 = adjacents[base + i];
        let adj2 = adjacents[base + (i+1)%adjacent_count];

        let p1 = positions[adj1];
        let p2 = positions[adj2];

        let firstr = vec3f(p1.x, rockElevation(adj1), p1.y) - center_position;
        let secondr = vec3f(p2.x, rockElevation(adj2), p2.y) - center_position;

        let wfirstr = vec3f(p1.x, elevation(adj1), p1.y) - center_position;
        let wsecondr = vec3f(p2.x, elevation(adj2), p2.y) - center_position;

        rocknormal += cross(firstr, secondr);
        waternormal += cross(wfirstr, wsecondr);
    }

    rocknormal /= f32(adjacent_count);
    waternormal /= f32(adjacent_count);
    normals[center]= normalize(rocknormal);
    waternormals[center]= normalize(waternormal);
    let tile = tiles[center];
    albedos[center] = albedo(tile.hard, tile.soft, tile.aquifer);
}