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
var<storage, read_write> adjacents: array<i32>;
@group(0) @binding(2)
var<storage, read_write> adjacent_indices: array<AdjacentIndex>;
@group(0) @binding(3)
var<storage, read_write> buffer: array<Tile>;
@group(0) @binding(4)
var<storage, read_write> targetIndices: array<i32>;

fn waterTable(adj: Tile) -> f32 {
    if (adj.aquifer < adj.soft*0.9) {
        return adj.aquifer + adj.hard;
    } 
    return adj.water + adj.aquifer + adj.hard;
}

fn waterTableDownhill(center: i32) -> i32 {
    var minimum = 1000.0f;
    var base = adjacent_indices[center].base;
    var downhill = -1;
    var adjacent_count = adjacent_indices[center].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var t = tiles[adj];
        var e = t.water + t.aquifer + t.hard;
        if (e < minimum) {
            downhill = adj;
            minimum = e;
        }
    }
    return downhill;
}

fn spreadAquifer(source: i32, tile: Tile) {
    if (tile.aquifer <= 0) {
        return;
    }
    var down = waterTableDownhill(source);
    var delta = waterTable(tile) - waterTable(tiles[down]);
    if (delta < 0) {
        return;
    }
    
    targetIndices[source] = down;

    var transfer = min(delta * 0.005, tile.aquifer);
    tiles[source].aquifer -= transfer;
    buffer[source].aquifer += transfer;

    var erosion = min(transfer*0.05, tile.soft*0.05);
    tiles[source].soft -= erosion;
    buffer[source].soft += erosion;
}

fn aquiferCapacity(i: Tile) -> f32 {
    return clamp(i.soft, 0, 1);
}

fn aquiferSpace(i: Tile) -> f32 {
    return clamp(aquiferCapacity(i) - i.aquifer, 0, 1);
}

fn soak(tile: Tile, i: i32) {
    var aquifer_space = aquiferSpace(tile);
    let release = tile.aquifer - aquiferCapacity(tile);
    if (release > 0) {
        tiles[i].water += release;
        tiles[i].aquifer -= release;
    }

    if (aquifer_space > 0 && tiles[i].water > 0) {
        var soak = min(tiles[i].water*0.008, aquifer_space);
        tiles[i].aquifer += soak;
        tiles[i].water -= soak;
    }
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

    soak(source, sourceI);
    spreadAquifer(sourceI, tiles[sourceI]);
}
