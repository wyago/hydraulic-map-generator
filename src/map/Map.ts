import { byMin, clamp, lerp } from "../math";
import { TileSet } from "./Graph";

export class Map {
    //readonly allTiles: Tile[];
    readonly tiles: TileSet;
    //readonly tiles: RBush<Tile>;

    constructor(tiles: TileSet) {
        //this.tiles = new RBush<Tile>();

        this.tiles = tiles;
        //this.tiles.load(this.allTiles);
        
        for (let i = 0; i < tiles.count; ++i) {
            tiles.downhills[i] = byMin(tiles.adjacents[i], i =>  this.tiles.totalElevation(i));
        }
    }

    carry() {
        this.deriveDownhills();

        for (let i = 0; i < this.tiles.count; ++i) {
            let current = i;
            let silt = 0.001;
            if (this.tiles.softRock(current) > silt) {
                this.tiles.hardSoftWaterRiver[i * 4 + 1] -= silt;
            } else {
                continue;
            }

            for (let j = 0; j < 100; ++j) {
                let target = this.tiles.downhills[current];
                const delta = this.tiles.totalElevation(target) - this.tiles.totalElevation(target);
                if (delta > 0 || this.tiles.surfaceWater(current) > 0) {
                    break;
                }
                current = target;
            }
            this.fill(current, silt);
        }
    }

    setRivers() {
        this.deriveDownhills();

        for (let i = 0; i < this.tiles.count; ++i) {
            const surface = this.tiles.surfaceWater(i);
            if (surface > 0.2) {
                this.tiles.hardSoftWaterRiver[i * 4 + 2] -= (surface - 0.2) * 0.3;
            }
            this.tiles.hardSoftWaterRiver[i*4+3] *= 0.9;
            if (this.tiles.water(i) < 0) {
                this.tiles.hardSoftWaterRiver[i*4+2] = 0;
            }
        }
        for (let i = 0; i < this.tiles.count; ++i) {
            let current = i;
            let silt = 0;
            for (let j = 0; j < 100; ++j) {
                let target = this.tiles.downhills[current];
                const delta = this.tiles.totalElevation(current) - this.tiles.totalElevation(target);
                if (delta < 0 || this.tiles.surfaceWater(current) > 0) {
                    break;
                }
                current = target;
                this.tiles.hardSoftWaterRiver[current*4 + 3] += 0.001 * delta;

                const transfer = Math.min(delta*0.5*this.tiles.softRock(i)*this.tiles.softRock(i)*this.tiles.softRock(i), this.tiles.softRock(i));
                silt += transfer;
                this.tiles.hardSoftWaterRiver[i * 4 + 1] -= transfer;
            }
            this.fill(current, silt);

            if (this.tiles.rockElevation(current) > 0.5) {
                //this.tiles.hardSoftWaterRiver[i * 4 + 2] += 0.0001;
            }
        }
    }

    fill(start: number, silt: number) {
        // We need to discover a fill area that can accomodate the silt.
        // So we repeatedly check whether we have enough room, and if not,
        // we add the lowest adjacent.
        while (silt > 0.0001) {
            let bar = Number.MAX_VALUE;
            let which = 0;
            const adj = this.tiles.adjacents[start];
            for (let i = 0; i < adj.length; ++i) {
                const elevation = this.tiles.rockElevation(adj[i]);
                if (elevation < bar) {
                    bar = elevation;
                    which = adj[i];
                }
            }

            if (this.tiles.rockElevation(which) < this.tiles.rockElevation(start)) {
                start = which;
            }

            silt -= 0.0001;
            this.tiles.hardSoftWaterRiver[start*4 + 1] += 0.0001;
        }
    }


    fog() {
        const vx = 1;
        const vy = 1;
        for (let i = 0; i < this.tiles.count; ++i) {
            const source = this.allTiles[i];
            if (source.surfaceWater() > 0) {
                source.humidity = clamp(source.humidity + Math.random()*0.05, 0, 1);
            }

            if (source.fog) {
                let moisten = source.fog*0.01;
                const air = 1 - source.totalElevation();
                if (air < source.fog) {
                    moisten = Math.min(source.fog, source.fog - air);
                }
                source.vegetation += moisten;
                if (source.vegetation > 1) {
                    source.vegetation = 1;
                }
                source.fog -= moisten;
            }

            let next = 0;
            let lowest = Number.MAX_VALUE;
            for (let a = 0; a < source.adjacents.length; ++a) {
                const target = this.allTiles[source.adjacents[a]];

                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dot = dx*vx + dy*vy;
                if (dot < lowest) {
                    lowest = dot;
                    next = a;
                }
            }

            const target = this.allTiles[source.adjacents[next]];

            let transfer = (source.humidity - target.humidity)*0.1;
            if (target.totalElevation() > source.totalElevation()) {
                target.fog += transfer*0.5;
                transfer *= 0.5;
            }
            source.humidity -= transfer;
            target.humidity += transfer;

        }
    }

    simpleErosion() {
        for (let source = 0; source < this.tiles.count; ++source) {
            for (let a = 0; a < this.tiles.adjacents[source].length; ++a) {
                const target = this.tiles.adjacents[source][a];
                const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));

                if (delta < 0) {
                    continue;
                }

                const softFactor = Math.min((this.tiles.softRock(source) - this.tiles.softRock(target))*0.5,  delta*0.5* (this.tiles.surfaceWater(source) + 0.2));
                this.tiles.hardSoftWaterRiver[source*4 + 1] -= softFactor;
                this.tiles.hardSoftWaterRiver[target*4 + 1] += softFactor;
                this.tiles.hardSoftWaterRiver[source*4 + 2] -= softFactor;
                this.tiles.hardSoftWaterRiver[target*4 + 2] += softFactor;

                const hardFactor = Math.min((this.tiles.hardRock(source) - this.tiles.hardRock(target))*0.5,  delta*0.1 * (this.tiles.surfaceWater(source) + 0.3));
                this.tiles.hardSoftWaterRiver[source*4 + 0] -= hardFactor;
                this.tiles.hardSoftWaterRiver[target*4 + 0] += hardFactor;
            }
        } 
    }

    deriveDownhills() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const original = this.tiles.downhills[source];
            let next = original;
            let lowest = Number.MAX_VALUE;
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];
                const factor = this.tiles.totalElevation(target);
                if (factor < lowest) {
                    next = target;
                    lowest = factor;
                }
            }

            this.tiles.downhills[source] = next;
        }
    }

    iterateRivers() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhill(source);
            const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));
            if (delta < 0) {
                continue;
            }

            let pressure = 0.8*this.tiles.river(source)*(1 - this.tiles.softRock(source));

            const erosion = Math.min(pressure, this.tiles.hardRock(source));
            this.tiles.hardSoftWaterRiver[source*4+0] -= erosion;
            this.tiles.hardSoftWaterRiver[source*4+1] += erosion;
        }
    }

    iterateSpread() {
        for (let source = 0; source < this.tiles.count; ++source) {
            this.tiles.hardSoftWaterRiver[source*4 + 2] += 0.0001;
            this.tiles.hardSoftWaterRiver[source*4 + 3] *= 0.99;
        }
        this.deriveDownhills();
        for (let source = 0; source < this.tiles.count; ++source) {
            if (this.tiles.water(source) > 0)
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];

                const delta = this.tiles.waterTable(source) - this.tiles.waterTable(target);
                if (delta < 0) {
                    continue;
                }
                this.tiles.hardSoftWaterRiver[source*4+2] = Math.max(this.tiles.water(source), 0);
                let transfer = Math.min(delta / this.tiles.adjacents[source].length, this.tiles.water(source));
                transfer = Math.min((this.tiles.water(source) - this.tiles.water(target))*0.5, transfer);

                transfer *= lerp(1,0.01, this.tiles.softRock(source) - this.tiles.water(source));
                transfer *= lerp(1,0.1, this.tiles.softRock(target) - this.tiles.water(target));

                //this.tiles.hardSoftWaterRiver[source*4 + 3] += transfer;

                this.tiles.hardSoftWaterRiver[source*4+2] -= transfer;
                this.tiles.hardSoftWaterRiver[target*4+2] += transfer;

                //transfer = Math.min((this.tiles.rockElevation(source) - this.tiles.rockElevation(target))*0.5, transfer * 0.5, this.tiles.softRock(source));
                //this.tiles.hardSoftWaterRiver[source*4+1] -= transfer;
                //this.tiles.hardSoftWaterRiver[target*4+1] += transfer;
            }
        }
        
        if(false)
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]

            if (source.surfaceWater() > 0)
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const delta = (source.rockElevation() - target.rockElevation());

                if (delta < 0) {
                    continue;
                }

                const lake = source.surfaceWater() + target.surfaceWater();
                const factor = Math.min((source.softRock - target.softRock)*0.5,  delta * lake * 0.1);
                target.softRock += factor;
                source.softRock -= factor;
            }
        }
    }
}