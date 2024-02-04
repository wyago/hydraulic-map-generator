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


fn rockElevation(i: Tile) -> f32 {
    return (i.hard + i.soft);
}

fn simpleErode(center: Tile, i: i32, amount: f32) {
    var hardFactor = clamp(amount*0.1 * center.hard*(0.2 -  center.soft), 0,  center.hard);
    tiles[i].hard -= hardFactor;
    tiles[i].soft += hardFactor;
}

struct Packet {
    silt: f32,
    selfSilt: f32,
    water: f32,
    soft: f32
}

fn extractPacket(source: Tile, i: i32, delta: f32, rockDelta: f32) -> Packet {
    var tile = source;
    var transfer = min(delta * 0.1, tile.water);
    if (rockDelta > 0) {
        var erosion = clamp(transfer*2.25, 0, min(tile.soft, rockDelta));
        tiles[i].soft -= erosion;
        tiles[i].silt += erosion;
    }
    var siltTransfer = min(transfer / tile.water * tiles[i].silt, tiles[i].silt);
    var packet: Packet;
    simpleErode(tile, i, transfer*40);
    tiles[i].water -= transfer;
    tiles[i].silt -= siltTransfer;
    tile = tiles[i];

    packet.water = transfer;
    packet.silt = siltTransfer;
    packet.soft = 0;


    return packet;
}

fn placePacket(source: i32, down: i32, packet: Packet) {
    targetIndices[source] = down;
    buffer[source].water += packet.water;
    buffer[source].silt += packet.silt;
    buffer[source].soft += packet.soft;
}

fn waterTable(adj: Tile) -> f32 {
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

fn elevation(i: Tile) -> f32 {
    return (i.hard + i.soft + i.water);
}
fn totalDownhill(center: i32) -> i32 {
    var minimum = 1000.0f;
    var base = adjacent_indices[center].base;
    var downhill = -1;
    var adjacent_count = adjacent_indices[center].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var e = elevation(tiles[adj]);
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

    if (source.water <= 0) {
        return;
    }
    var down = totalDownhill(sourceI);
    var dtile = tiles[down];
    var delta = elevation(source) - elevation(dtile);
    var releaseFactor = clamp(0.7 - clamp(delta, 0, 1)*20, 0.1, 0.7);
    var release = tiles[sourceI].silt*releaseFactor;
    tiles[sourceI].soft += release;
    tiles[sourceI].silt -= release;
    source = tiles[sourceI];
    if (delta < 0) {
        return;
    }

    var rockDelta = rockElevation(source) - rockElevation(dtile);
    var packet = extractPacket(source, sourceI, delta, rockDelta);
    
    placePacket(sourceI, down, packet);
    
}
