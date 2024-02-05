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
var<storage, read_write> buffer: array<Tile>;
@group(0) @binding(4)
var<storage, read_write> targetIndices: array<i32>;

fn elevation(i: Tile) -> f32 {
    return (i.hard + i.soft + i.water);
}
fn rockElevation(i: Tile) -> f32 {
    return (i.hard + i.soft);
}
fn totalDownhill(center: i32) -> i32 {
    var minimum = 1000.0f;
    var base = adjacent_indices[center].base;
    var downhill = -1;
    var adjacent_count = adjacent_indices[center].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var e = rockElevation(tiles[adj]);
        if (e < minimum) {
            downhill = adj;
            minimum = e;
        }
    }
    return downhill;
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

    var sourceI = i32(global_id.x);
    var source = tiles[sourceI];

    var d = totalDownhill(sourceI);
    targetIndices[sourceI] = d;

    tiles[sourceI].hard += clamp(source.original - 0.02, 0, 1)*0.000003;

    const siltAngle = 0.01;
    const rockAngle = 0.02;
    var delta = rockElevation(source) - rockElevation(tiles[d]);
    if (delta > rockAngle) {
        var transfer = min((delta - rockAngle) * 0.4, source.hard);

        tiles[sourceI].hard -= transfer;
        buffer[sourceI].hard += transfer;
    } else {
        d = totalDownhill(sourceI);
        targetIndices[sourceI] = d;
        delta = rockElevation(source) - rockElevation(tiles[d]);
        if (delta > siltAngle) {
            var transfer = min((delta - siltAngle) * 0.4, source.soft);

            tiles[sourceI].soft -= transfer;
            buffer[sourceI].soft += transfer;
        }
    } 
}
