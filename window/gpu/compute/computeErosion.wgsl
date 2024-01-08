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

fn simpleErode(center: Tile, i: i32, amount: f32) {
    var hardFactor = clamp(amount*0.1 * center.hard*(0.1 -  center.soft), 0,  center.hard);
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
    var transfer = min(delta * 0.4, tile.water);
    var siltTransfer = min(transfer / tile.water * tile.silt, tile.silt);
    var packet: Packet;
    simpleErode(tile, i, transfer*70);
    tiles[i].water -= transfer;
    tiles[i].silt -= siltTransfer;
    tile = tiles[i];

    packet.water = transfer;
    packet.silt = siltTransfer;
    packet.soft = 0;

    if (rockDelta > 0) {
        var erosion = clamp(min(transfer*.5/(tile.water*1 + 1), min(tile.soft, min(rockDelta*0.5, delta * 0.1))), 0, 1);
        tiles[i].soft -= erosion;
        tiles[i].silt += erosion;
    }

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

fn spreadAquifer(source: i32, tile: Tile) {
    if (tile.aquifer <= 0) {
        return;
    }
    var down = waterTableDownhill(source);
    var delta = waterTable(tile) - waterTable(tile);
    if (delta < 0) {
        return;
    }
    
    var transfer = min(delta * 0.01, tile.aquifer);
    tiles[source].aquifer -= transfer;
    buffer[source].aquifer += transfer;
}

fn aquiferCapacity(i: Tile) -> f32 {
    return clamp(i.soft, 0, 1);
}

fn aquiferSpace(i: Tile) -> f32 {
    return clamp(aquiferCapacity(i) - i.aquifer, 0, 1);
}

fn spreadWater(tile: Tile, i: i32) {
    var water = tile.water;
    var aquifer_space = aquiferSpace(tile);
    if (aquifer_space > 0 && water > 0) {
        var soak = min(water*0.001, aquifer_space*0.001);
        tiles[i].aquifer += soak;
        tiles[i].water -= soak;
    }
    
    let release = tiles[i].aquifer - aquiferCapacity(tiles[i]);
    if (release > 0) {
        tiles[i].water += release;
        tiles[i].aquifer -= release;
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

    //spreadWater(source, sourceI);
    //spreadAquifer(sourceI, source);

    if (source.water <= 0) {
        return;
    }
    var down = totalDownhill(sourceI);
    var dtile = tiles[down];
    var delta = elevation(source) - elevation(dtile);
    if (delta < 0) {
        return;
    }

    var rockDelta = rockElevation(source) - rockElevation(dtile);
    var packet = extractPacket(source, sourceI, delta, rockDelta);
    
    placePacket(sourceI, down, packet);
    
    source = tiles[sourceI];
    var releaseFactor = 0.1 + clamp(0.7 - delta*20 - source.water*4, 0.01, 0.7);
    var release = tiles[sourceI].silt*releaseFactor;
    tiles[sourceI].soft += release;
    tiles[sourceI].silt -= release;
}
