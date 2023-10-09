import Delaunator from "delaunator";
import { byMin, clamp } from "../math";
import { Tile } from "./Tile";



export class Map {
    readonly allTiles: Tile[];
    //readonly tiles: RBush<Tile>;

    constructor(tiles: Tile[]) {
        //this.tiles = new RBush<Tile>();

        this.allTiles = tiles;
        //this.tiles.load(this.allTiles);
        
        const source = tiles.map(a => ([a.x, a.y]));

        function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
        const delaunay = Delaunator.from(source);
        function forEachTriangleEdge(callback: (p: number, q: number) => void) {
            for (let e = 0; e < delaunay.triangles.length; e++) {
                if (e > delaunay.halfedges[e]) {
                    const p = delaunay.triangles[e];
                    const q = delaunay.triangles[nextHalfedge(e)];
                    callback(p, q);
                }
            }
        }

        forEachTriangleEdge((p, q) => {
            tiles[p].adjacents.push(q);
            tiles[q].adjacents.push(p);
        });
        
        this.allTiles.forEach(source => {
            source.adjacents.sort((x, y) => {
                const left = tiles[x];
                const right = tiles[y];
                return Math.atan2(left.y - source.y, left.x - source.x) > Math.atan2(right.y - source.y, right.x - source.x) ? 1 : -1;
            })
            source.downhill = byMin(source.adjacents, i =>  this.allTiles[i].totalElevation());
        });
    }

    setRivers() {
        this.deriveDownhills();

        for (let i = 0; i < this.allTiles.length; ++i) {
            const current = this.allTiles[i];
            const surface = this.allTiles[i].surfaceWater();
            if (surface > 0.2) {
                this.allTiles[i].water -= (surface - 0.2) * 0.1;
            }
            this.allTiles[i].riverAmount *= 0.99;
            if (current.water < 0) {
                current.water = 0;
            }

            if (false)
            if (current.rockElevation() > 0.98) {
                current.snow += 0.01;
            } else if(current.rockElevation() < 0.9) {
                if (current.snow > 0) {
                    current.water += 0.0001;
                }
                current.snow = clamp(current.snow - 0.01, 0, 1);
            }
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            let current = this.allTiles[i];
            for (let j = 0; j < 1000; ++j) {
                let target = this.allTiles[current.downhill];
                const delta = target.totalElevation() - current.totalElevation();
                if (delta > 0 || current.snow > 0.1) {
                    break;
                }
                current = target;
                current.riverAmount += 0.01;
            }
            
            current.water += 0.0001;
        }
    }

    simpleErosion() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]

            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const delta = (source.rockElevation() - target.rockElevation());

                if (delta < 0.001) {
                    continue;
                }

                const softFactor = Math.min((source.softRock - target.softRock)*0.5,  delta*0.1);
                target.softRock += softFactor;
                source.softRock -= softFactor;

                const hardFactor = Math.min((source.hardRock - target.hardRock)*0.5,  delta*0.01);
                target.hardRock += hardFactor;
                source.hardRock -= hardFactor;
            }
        } 
    }

    deriveDownhills() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            const original = source.downhill;
            let next = original;
            let lowest = Number.MAX_VALUE;
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const factor = target.totalElevation();
                if (factor < lowest) {
                    next = source.adjacents[j];
                    lowest = factor;
                }
            }

            source.downhill = next;
        }
    }

    iterateRivers() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];
            const target = this.allTiles[source.downhill];
            const delta = (source.totalElevation() - target.totalElevation());
            if (delta < 0) {
                continue;
            }

            let pressure = 10*source.riverAmount * source.riverAmount;

            if (source.softRock > 0) {
                pressure  = Math.min(pressure, (source.softRock - target.softRock)*0.5);
                source.softRock -= pressure;
                target.softRock += pressure;
            } else {
                const erosion = Math.min(pressure * 0.1, source.hardRock);
                source.hardRock -= erosion;
                source.softRock += erosion;
            }

            if (source.snow > target.snow) {
                const snow = (source.snow - target.snow)*0.1;
                source.snow -= snow;
                target.snow += snow;
                let erosion = Math.min(snow, (source.rockElevation() - target.rockElevation()) * 0.4);
                
                if (source.softRock > 0) {
                    erosion = Math.min((source.softRock - target.softRock)*0.3, erosion);
                    source.softRock -= erosion;
                    target.softRock += erosion;
                } else {
                    erosion = Math.min(source.hardRock, erosion*0.05);
                    source.hardRock -= erosion;
                    source.softRock += erosion;
                }
            }
        }
    }

    iterateSpread() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];

            if (source.water > 0)
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];

                const delta = source.waterTable() - target.waterTable();
                if (delta < 0) {
                    continue;
                }
                source.water = Math.max(source.water, 0);
                let transfer = Math.min(delta / source.adjacents.length, source.water);

                transfer *= clamp(source.water / (source.softRock + 1), 0, 1);

                source.water -= transfer;
                target.water += transfer;

                transfer = Math.min((source.softRock - target.softRock)*0.5, transfer * 0.01);
                source.softRock -= transfer;
                target.softRock += transfer;
            }
        }
        
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]

            if (source.surfaceWater() > 0)
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const delta = (source.rockElevation() - target.rockElevation());

                if (delta < 0.01) {
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