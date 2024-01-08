struct Tile {
    hard: f32,
    soft: f32,
    water: f32,
    aquifer: f32,
    occlusion: f32,
    silt: f32
}

@group(0) @binding(0)
var<storage, read_write> tiles: array<Tile>;
@group(0) @binding(1)
var<storage, read_write> buffer: array<Tile>;
@group(0) @binding(2)
var<storage, read_write> targetIndices: array<i32>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    var i = i32(global_id.x);
    var t = targetIndices[i];
    var source = buffer[i];

    tiles[t].hard += source.hard;
    tiles[t].soft += source.soft;
    tiles[t].water += source.water;
    tiles[t].aquifer += source.aquifer;
    tiles[t].silt += source.silt;

    buffer[i].hard = 0;
    buffer[i].soft = 0;
    buffer[i].water = 0;
    buffer[i].aquifer = 0;
    buffer[i].silt = 0;
}
