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

fn elevation(i: i32) -> f32 {
    return (tiles[i].hard + tiles[i].soft + tiles[i].water);
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

    var center = i32(global_id.x);

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

    var waterfall = min((center_elevation - downhill_elevation)*0.1, center_water);
    if (waterfall > 0) {
        tiles[center].water -= waterfall;
        tiles[downhill].water += waterfall;

        var erosion = min(tiles[center].hard, waterfall*0.2);
        tiles[center].hard -= erosion;
        tiles[center].soft += erosion;

        var liquefaction = clamp(min(waterfall*0.01/(center_water + 1), min(tiles[center].soft, waterfall*0.1)), 0, 1);
        tiles[center].soft -= liquefaction;
        tiles[center].silt += liquefaction;
        
        var transfer = min(waterfall / center_water * tiles[center].silt, tiles[center].silt);
        tiles[center].silt -= transfer;
        tiles[downhill].silt += transfer;
    }
}
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