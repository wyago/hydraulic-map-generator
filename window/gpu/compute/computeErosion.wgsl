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
    var hardFactor = clamp(amount * center.hard*(0.2 -  center.soft), 0,  center.hard);
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
    var transfer = min(delta * 0.2, tile.water);
    let factor = (transfer / 0.02) * (transfer / 0.02);
    simpleErode(tile, i, factor*1.8);
    var silt = tile.silt;
    if (rockDelta > 0) {
        var erosion = clamp(factor*5.8*tile.soft, 0, min(tile.soft, rockDelta));
        tiles[i].soft -= erosion;
        tiles[i].silt += erosion;
        silt += erosion;
    }
    var siltTransfer = transfer / tile.water * silt;
    var packet: Packet;
    tiles[i].water -= transfer;
    tiles[i].silt -= siltTransfer;

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



fn elevation(i: Tile) -> f32 {
    return (i.hard + i.soft + i.water);
}
fn totalDownhill(center: i32) -> i32 {
    var minimum = 1000.0f;
    let indices = adjacent_indices[center];
    let base = indices.base;
    var downhill = -1;
    let adjacent_count = indices.length;
    for (var i = 0; i < adjacent_count; i++) {
        let adj = adjacents[base + i];
        let e = elevation(tiles[adj]);
        if (e < minimum) {
            downhill = adj;
            minimum = e;
        }
    }
    return downhill;
}

@compute @workgroup_size(256)
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

    let factor = delta/0.01;
    var release = source.silt*mix(0.001, 0.8, 1 - clamp(factor*factor*5, 0, 1));//clamp((source.silt - source.water*0.1), -source.soft, source.silt);
    tiles[sourceI].soft += release;
    tiles[sourceI].silt -= release;
    if (delta < 0) {
        return;
    }

    source.soft += release;
    source.silt -= release;
    let rockDelta = rockElevation(source) - rockElevation(dtile);
    let packet = extractPacket(source, sourceI, delta, rockDelta);
    placePacket(sourceI, down, packet);
}
