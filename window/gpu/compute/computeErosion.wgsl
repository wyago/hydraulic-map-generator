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

fn elevation(i: i32) -> f32 {
    return (tiles[i].hard + tiles[i].soft + tiles[i].water);
}

fn rockElevation(i: i32) -> f32 {
    return (tiles[i].hard + tiles[i].soft);
}

fn simpleErode(center: i32, amount: f32) {
    var hardFactor = clamp(amount*0.1 *tiles[center].hard*(0.1 - tiles[center].soft), 0, tiles[center].hard);
    buffer[center].hard -= hardFactor;
    buffer[center].soft += hardFactor;
}

struct Packet {
    silt: f32,
    selfSilt: f32,
    water: f32,
    soft: f32
}

fn extractPacket(source: i32, delta: f32, rockDelta: f32) -> Packet {
    var transfer = min(delta * 0.1, tiles[source].water);
    var siltTransfer = min(transfer / tiles[source].water * tiles[source].silt, tiles[source].silt);
    var packet: Packet;
    simpleErode(source, transfer*50);
    packet.water = transfer;
    buffer[source].water -= transfer;
    buffer[source].silt -= siltTransfer;
    packet.silt = siltTransfer;
    packet.soft = 0;

    if (rockDelta > 0) {
        var erosion = clamp(min(transfer*.5/(tiles[source].water*1 + 1), min(tiles[source].soft, min(rockDelta*0.5, delta * 0.1))), 0, 1);
        buffer[source].soft -= erosion;
        packet.selfSilt = erosion;
    }

    return packet;
}

fn placePacket(source: i32, down: i32, packet: Packet) {
    buffer[down].water += packet.water;
    buffer[down].silt += packet.silt;
    buffer[source].silt += packet.selfSilt;
    buffer[down].soft += packet.soft;
}

fn waterTable(adj: i32) -> f32 {
    return tiles[adj].water + tiles[adj].aquifer + tiles[adj].hard;
}

fn waterTableDownhill(center: i32) -> i32 {
    var minimum = 1000.0f;
    var base = adjacent_indices[center].base;
    var downhill = -1;
    var adjacent_count = adjacent_indices[center].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var e = tiles[adj].water + tiles[adj].aquifer + tiles[adj].hard;
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
        var e = elevation(adj);
        if (e < minimum) {
            downhill = adj;
            minimum = e;
        }
    }
    return downhill;
}

fn spreadAquifer(source: i32) {
    if (tiles[source].aquifer <= 0) {
        return;
    }
    var down = waterTableDownhill(source);
    var delta = waterTable(source) - waterTable(down);
    if (delta < 0) {
        return;
    }
    
    var transfer = min(delta * 0.01, tiles[source].aquifer);
    buffer[source].aquifer -= transfer;
    buffer[down].aquifer += transfer;
}

fn aquiferCapacity(i: i32) -> f32 {
    return clamp(tiles[i].soft, 0, 1);
}

fn aquiferSpace(i: i32) -> f32 {
    return clamp(aquiferCapacity(i) - tiles[i].aquifer, 0, 1);
}

fn spreadWater(i: i32) {
    var water = tiles[i].water;
    var aquifer_space = aquiferSpace(i);
    if (aquifer_space > 0 && water > 0) {
        var soak = min(water*0.001, aquifer_space*0.001);
        buffer[i].aquifer += soak;
        buffer[i].water -= soak;
    }
    
    let release = tiles[i].aquifer - aquiferCapacity(i);
    if (release > 0) {
        buffer[i].water += release;
        buffer[i].aquifer -= release;
    }
}


fn landslide(source: i32) {
    var siltAngle = 0.06;
    var rockAngle = 0.1;

    var down = totalDownhill(source);
    var delta = rockElevation(source) - rockElevation(down);
    if (delta > siltAngle) {
        var transfer = min((delta - siltAngle) * 0.1, tiles[source].soft);

        buffer[source].soft -= transfer;
        buffer[down].soft += transfer;
    }

    down = totalDownhill(source);
    delta = rockElevation(source) - rockElevation(down);
    if (delta > rockAngle) {
        var transfer = min((delta - rockAngle) * 0.1, tiles[source].hard);

        buffer[source].hard -= transfer;
        buffer[down].hard += transfer;
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

    var source = i32(global_id.x);

    spreadWater(source);
    spreadAquifer(source);
    landslide(source);

    if (tiles[source].water <= 0) {
        return;
    }
    var down = totalDownhill(source);
    var delta = elevation(source) - elevation(down);
    if (delta < 0) {
        return;
    }

    var rockDelta = rockElevation(source) - rockElevation(down);
    var packet = extractPacket(source, delta, rockDelta);
    
    placePacket(source, down, packet);
    
    var releaseFactor = 0.05 + clamp(0.7 - delta*20 - tiles[source].water*4, 0.01, 0.7);
    var release = buffer[source].silt*releaseFactor;
    buffer[source].soft += release;
    buffer[source].silt -= release;
}

    /*for (let i = 0; i < this.points.count; ++i) {
        this.points.water[i] += this.waterBuffer[i];
        this.points.soft[i] += this.softBuffer[i];
        this.points.silt[i] += this.siltBuffer[i];
        this.points.aquifer[i] += this.aquiferBuffer[i];
        
        const releaseFactor = 0.05;
        const release = this.points.silt[i]*releaseFactor;
        this.points.soft[i] += release//25/(adjs.length + 25);
        this.points.silt[i] -= release;
    }*/
    /*var center = i32(global_id.x);

    var minimum = 1000.0f;
    var base = adjacent_indices[center].base;
    var downhill = -1;
    var adjacent_count = adjacent_indices[center].length;
    for (var i = 0; i < adjacent_count; i++) {
        var adj = adjacents[base + i];
        var e = elevation(adj);
        if (e < minimum) {
            downhill = adj;
            minimum = e;
        }
    }

    if (downhill < 0) {
        return;
    }

    var center_elevation = elevation(center);
    var downhill_elevation = elevation(downhill);
    var center_water = tiles[center].water;

    var deposition = tiles[center].silt*0.05;
    buffer[center].silt -= deposition;
    buffer[center].soft += deposition;

    var waterfall = min((center_elevation - downhill_elevation)*0.3, center_water);
    if (waterfall > 0) {
        buffer[center].water -= waterfall;
        buffer[downhill].water += waterfall;

        var erosion = min(tiles[center].hard, waterfall*0.1*tiles[center].hard*(0.1 - tiles[center].soft));
        buffer[center].hard -= erosion;
        buffer[center].soft += erosion;

        var liquefaction = clamp(min(waterfall*0.5/(center_water + 1), min(tiles[center].soft, waterfall*0.1)), 0, 1);
        buffer[center].soft -= liquefaction;
        buffer[center].silt += liquefaction;

        var release = clamp(0.7 - waterfall*20 - tiles[center].water*4, 0.01, 0.7)*tiles[center].silt;
        buffer[downhill].soft += release;
        buffer[downhill].silt -= release;

        var transfer = min(waterfall / center_water * buffer[center].silt, buffer[center].silt);
        buffer[center].silt -= transfer;
        buffer[downhill].silt += transfer;
    }*/
/*
    extractPacket(source: number, delta: number, rockDelta: number) {
        const transfer = Math.min(delta * 0.2, this.points.water[source]);
        const siltTransfer = Math.min(transfer / this.points.water[source] * this.points.silt[source], this.points.silt[source]);
        this.simpleErode(source, transfer*70);
        this.packet.water = transfer;
        this.waterBuffer[source] -= transfer;
        this.siltBuffer[source] -= siltTransfer;
        this.packet.silt = siltTransfer;
        this.packet.soft = 0;

        if (rockDelta > 0) {
            const erosion = clamp(Math.min(transfer*.5/(this.points.water[source]*1 + 1), this.points.soft[source], rockDelta*0.5, delta * 0.1), 0, 1);
            this.softBuffer[source] -= erosion;
            this.packet.selfSilt = erosion;
        }
    }

    placePacket(source: number, target: number) {
        this.waterBuffer[target] += this.packet.water;
        this.siltBuffer[target] += this.packet.silt;
        this.siltBuffer[source] += this.packet.selfSilt;
        this.softBuffer[target] += this.packet.soft;
    }*/