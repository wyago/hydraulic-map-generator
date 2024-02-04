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

    var index = i32(global_id.x);
    /*var t = targetIndices[i];
    var source = buffer[i];

    tiles[t].hard += source.hard;
    tiles[t].soft += source.soft;
    tiles[t].water += source.water;
    tiles[t].aquifer += source.aquifer;
    tiles[t].fog += source.fog;
    tiles[t].silt += source.silt;

    buffer[i].hard = 0;
    buffer[i].soft = 0;
    buffer[i].water = 0;
    buffer[i].aquifer = 0;
    buffer[i].fog = 0;
    buffer[i].silt = 0;*/
    
    var base = adjacent_indices[index].base;
    var adjacent_count = adjacent_indices[index].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var othertarget = targetIndices[adj];
        if (othertarget == index) {
            var source = buffer[adj];
            tiles[index].hard += source.hard;
            tiles[index].soft += source.soft;
            tiles[index].water += source.water;
            tiles[index].aquifer += source.aquifer;
            tiles[index].fog += source.fog;
            tiles[index].silt += source.silt;
        }
    }
}
