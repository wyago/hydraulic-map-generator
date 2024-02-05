struct Tile {
    hard: f32,
    soft: f32,
    water: f32,
    aquifer: f32,
    fog: f32,
    silt: f32
}
struct AdjacentIndex {
    base: i32,
    length: i32
}

@group(0) @binding(0)
var<storage, read_write> tiles: array<Tile>;
@group(0) @binding(1)
var<storage, read_write> buffer: array<Tile>;
@group(0) @binding(2)
var<storage, read_write> targetIndices: array<i32>;
@group(0) @binding(3)
var<storage, read_write> adjacents: array<i32>;
@group(0) @binding(4)
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

    let index = i32(global_id.x);
    let indices = adjacent_indices[index];
    let base = indices.base;
    let adjacent_count = indices.length;
    for (var i = 0; i < adjacent_count; i++) {
        let adj = adjacents[base + i];
        let othertarget = targetIndices[adj];
        if (othertarget == index) {
            let source = buffer[adj];
            tiles[index].hard += source.hard;
            tiles[index].soft += source.soft;
            tiles[index].water += source.water;
            tiles[index].aquifer += source.aquifer;
            tiles[index].fog += source.fog;
            tiles[index].silt += source.silt;
        }
    }
}
