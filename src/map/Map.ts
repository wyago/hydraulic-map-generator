import { byMin, clamp } from "../math";
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
                this.tiles.hardSoftWaterRiver[current*4 + 3] += 0.1 * delta;


                const transfer = Math.min(
                    delta*0.07*this.tiles.softRock(i),
                    this.tiles.softRock(i)
                );
                silt += transfer;
                this.tiles.hardSoftWaterRiver[i * 4 + 1] -= transfer;
            }
            this.fill(current, silt);

            if (this.tiles.rockElevation(current) > 0.2) {
                this.tiles.hardSoftWaterRiver[i * 4 + 2] += 0.0005* (1 - this.tiles.totalElevation(i));
            }
        }
    }

    fill(start: number, silt: number) {
        while (silt > 0.002) {
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

            silt -= 0.002;
            this.tiles.hardSoftWaterRiver[start*4 + 1] += 0.002
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

                const softFactor = Math.min((this.tiles.softRock(source) - this.tiles.softRock(target))*0.5,  delta*0.00001);
                this.tiles.hardSoftWaterRiver[source*4 + 1] -= softFactor;
                this.tiles.hardSoftWaterRiver[target*4 + 1] += softFactor;

                const hardFactor = Math.min((this.tiles.hardRock(source) - this.tiles.hardRock(target))*0.5,  delta*0.00001);
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

    deriveUphills() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const original = this.tiles.uphill[source];
            let next = original;
            let highest = Number.MIN_VALUE;
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];
                const factor = this.tiles.totalElevation(target);
                if (factor > highest) {
                    next = target;
                    highest = factor;
                }
            }

            this.tiles.uphill[source] = next;
        }
    }

    iterateRivers() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const target = this.tiles.downhill(source);
            const delta = (this.tiles.rockElevation(source) - this.tiles.rockElevation(target));
            if (delta < 0) {
                continue;
            }

            let pressure = 0.03*this.tiles.river(source)*clamp(1 - this.tiles.softRock(source)*4, 0, 1);

            const erosion = Math.min(pressure, this.tiles.hardRock(source));
            this.tiles.hardSoftWaterRiver[source*4+0] -= erosion;
            this.tiles.hardSoftWaterRiver[source*4+1] += erosion;
        }
    }

    iterateSpread() {
        for (let source = 0; source < this.tiles.count; ++source) {
            const surface = this.tiles.surfaceWater(source);
            if (this.tiles.totalElevation(source) > 0.2) {
                this.tiles.hardSoftWaterRiver[source * 4 + 2] -= clamp(surface - 0.0, 0, 1) * 0.07;
            }

            if (this.tiles.water(source) > 0)
            for (let j = 0; j < this.tiles.adjacents[source].length; ++j) {
                const target = this.tiles.adjacents[source][j];

                const delta = this.tiles.waterTable(source) - this.tiles.waterTable(target);
                if (delta < 0) {
                    continue;
                }
                let transfer = Math.min(delta * 0.5, this.tiles.water(source));

                this.tiles.hardSoftWaterRiver[source*4+2] -= transfer;
                this.tiles.hardSoftWaterRiver[target*4+2] += transfer;

                transfer = Math.min((this.tiles.rockElevation(source) - this.tiles.rockElevation(target))*0.5, transfer * 0.01, this.tiles.softRock(source));
                if (transfer < 0) {
                    continue;
                }
                this.tiles.hardSoftWaterRiver[source*4+1] -= transfer;
                this.tiles.hardSoftWaterRiver[target*4+1] += transfer;
            }
        }
    }

    fog(radius: number) {
        for (let i = 0; i < 10000; ++i) {
            const source = ~~(Math.random() * this.tiles.count);
            let humidity = this.tiles.surfaceWater(source) + this.tiles.river(source);
            humidity *= 5;
            if (humidity < 0.01) {
                continue;
            }


            let x = this.tiles.vertices.xs[source];
            let y = this.tiles.vertices.ys[source];

            for (let iter = 0; iter < 100 && humidity > 0; ++iter) {
                const region = this.tiles.vertices.points.search({
                    maxX: x + radius * 2,
                    minX: x - radius * 2,
                    maxY: y + radius * 2,
                    minY: y - radius * 2,
                }).map(x => x.index);
                if (region.length === 0 || region.some(i => Math.random() < this.tiles.totalElevation(i)*0.01)) {
                    break;
                }

                for (let i = 0; i < region.length; ++i) {
                    const target = region[i];

                    if (this.tiles.fog[target] < 0.99) {
                        const transfer = (0.00005 + this.tiles.totalElevation(i) * 0.001) * humidity;
                        this.tiles.fog[target] += transfer;
                    }
                }

                x += radius + radius * Math.random() * 8 - radius * 4;
                y += radius + radius * Math.random() * 8 - radius * 4;
            }
        }
    }
}