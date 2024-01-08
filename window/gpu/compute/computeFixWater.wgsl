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

@group(0) @binding(0)
var<storage, read_write> tiles: array<Tile>;
@group(0) @binding(1)
var<storage, read_write> adjacents: array<i32>;
@group(0) @binding(2)
var<storage, read_write> adjacent_indices: array<AdjacentIndex>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    var i = global_id.x;

    var rock_elevation = tiles[i].hard + tiles[i].soft;
    
    //if (tiles[i].water > 0) {
        //var amount = (0.0001* tiles[i].water);
        //tiles[i].water -= amount;
    //} else {
        //var amount = (0.0001* tiles[i].aquifer);
        //tiles[i].aquifer -= amount;
    //}

    tiles[i].water += clamp(0.00002, 0, 1);
    if (rock_elevation < 0.2) {
        tiles[i].water = min(clamp(0.2 - rock_elevation, 0, 1), tiles[i].water);
    }
}