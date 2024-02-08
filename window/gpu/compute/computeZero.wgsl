struct Tile {
    hard: f32,
    soft: f32,
    water: f32,
    aquifer: f32,
    fog: f32,
    silt: f32
}

@group(0) @binding(0)
var<storage, read_write> buffer: array<Tile>;

@compute @workgroup_size(256)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    var i = i32(global_id.x);
    buffer[i].hard = 0;
    buffer[i].soft = 0;
    buffer[i].water = 0;
    buffer[i].aquifer = 0;
    buffer[i].fog = 0;
    buffer[i].silt = 0;
}
