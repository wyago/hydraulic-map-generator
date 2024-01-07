struct Tile {
    hard: f32,
    soft: f32,
    water: f32,
    aquifer: f32,
    occlusion: f32,
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

fn rockElevation(i: u32) -> f32 {
    return (tiles[i].hard + tiles[i].soft)*250.0;
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

    var center = global_id.x;

    var min = 1000.0f;
    var base = adjacent_indices[center].base;
    var adjacent_count = adjacent_indices[center].length;

    var rocknormal = vec3f(0,0,0);
    var rock_elevation = vec3f(positions[center].xy, rockElevation(center));
    var half = adjacent_count/2;
    for (var i = 0; i <adjacent_count; i++) {
        var adj1 = adjacents[base + i];
        var adj2 = adjacents[base + (i+1)%adjacent_count];

        var firstr = vec3f(positions[adj1].xy, rockElevation(adj1)) - rock_elevation;
        var secondr = vec3f(positions[adj2].xy, rockElevation(adj2)) - rock_elevation;

        rocknormal += cross(firstr, secondr);
    }

    rocknormal /= f32(adjacent_count);
    normals[center]= normalize(rocknormal);
}