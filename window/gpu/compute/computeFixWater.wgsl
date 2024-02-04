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
var<storage, read_write> normals: array<vec3f>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u
) {
    // Avoid accessing the buffer out of bounds
    if (global_id.x >= $BUFFER_SIZE) {
        return;
    }

    var i = global_id.x;
    let tile = tiles[i];

    var rock_elevation = tile.hard + tile.soft;
    let capacity = tile.soft - tile.aquifer;

    var mul: f32 = 1;
    if (dot(normals[i], vec3f(1,0,0)) > 0) {
        mul = 0.0001;
    }
    //var add =  0.0001*mul;
    //let aquifer = min(add, capacity);
    //let rest = add - aquifer;
    //tiles[i].aquifer += aquifer;
    //tiles[i].water += rest;
    tiles[i].water += 0.000025*mul;
    if (rock_elevation < 0.2) {
        tiles[i].water = tiles[i].water*0.5 + clamp(0.2 - rock_elevation, 0, 1)*0.5;
        tiles[i].aquifer = 0.8*tile.soft;
        //tiles[i].fog += 0.000001;
    } else {
        //if (tiles[i].water > 0) {
            //var amount = clamp((0.001* tiles[i].water), 0, 1 - fog);
            //tiles[i].water -= amount;
            //tiles[i].fog += amount;
        //} else {
            //var amount = clamp((0.0001* tiles[i].aquifer), 0, 1 - fog);
            //tiles[i].aquifer -= amount;
            //tiles[i].fog -= amount;
        //}

        //var amount = ( 0.1 * tiles[i].fog);
        //tiles[i].fog -= amount;
        //tiles[i].water += amount;
    }
}