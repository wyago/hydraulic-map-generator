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

@group(0) @binding(0)
var<storage, read_write> tiles: array<Tile>;
@group(0) @binding(1)
var<storage, read_write> adjacents: array<i32>;
@group(0) @binding(2)
var<storage, read_write> adjacent_indices: array<AdjacentIndex>;
@group(0) @binding(3)
var<storage, read_write> normals: array<vec2f>;
@group(1) @binding(0)
var<storage, read_write> rain: f32;

@compute @workgroup_size(256)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    var i = global_id.x;
    let tile = tiles[i];

    var rock_elevation = tile.hard + tile.soft;
    let capacity = tile.soft - tile.aquifer;

    var mul: f32 = 1;
    if (dot(normals[i], vec2f(1,0)) > 0.05) {
        mul = 0.000;
    }

    var add =  0.00002*mul*rain;
    //let aquifer = clamp(add, 0, capacity);
    //let rest = add - aquifer;
    //tiles[i].aquifer += aquifer;
    //tiles[i].water += rest;
    tiles[i].water += add;
    if (rock_elevation < 0.2) {
        tiles[i].water = tiles[i].water * 0.9 +clamp(0.2 - rock_elevation, 0, 1)*0.1;
        tiles[i].aquifer = 0.8*tile.soft;
    } else {
        tiles[i].water *= 0.995;
        tiles[i].aquifer *= 0.9995;
    }
}