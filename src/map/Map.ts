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
            source.downhill = byMin(source.adjacents, i =>  this.allTiles[i].elevation);
        });
    }

    setRivers() {
        this.deriveDownhills();

        for (let i = 0; i < this.allTiles.length; ++i) {
            const current = this.allTiles[i];
            if ( this.allTiles[i].lake > 0.4) {
                this.allTiles[i].lake -= 0.005*this.allTiles[i].totalElevation();
            }
            this.allTiles[i].riverAmount *= 0.99;
            if (current.lake < 0) {
                current.lake = 0;
            }

            if (current.elevation > 0.98) {
                current.snow += 0.01;
            } else if(current.elevation < 0.9) {
                if (current.snow > 0) {
                    current.lake += 0.0001;
                }
                current.snow = clamp(current.snow - 0.01, 0, 1);
            }

            if (current.vegetation < current.silt / current.elevation) {
                current.vegetation += clamp(Math.log(current.riverAmount*0.1 * current.silt + 1), 0, 0.02);
            }
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            let current = this.allTiles[i];
            for (let j = 0; j < 1000; ++j) {
                let target = this.allTiles[current.downhill];
                const delta = target.totalElevation() - current.totalElevation();
                if (delta > 0 || target.lake > 0.01 || current.snow > 0.1) {
                    break;
                }
                current.riverAmount += 0.001;
                current = target;
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

            let pressure = 2.5 * source.hardness() * source.riverAmount * source.riverAmount;
            pressure  = Math.min(pressure, (source.elevation - target.elevation)*0.3);
            source.elevation -= pressure;
            target.elevation += pressure;

            const silt = Math.min(source.silt*0.5, pressure*(5 * (1-source.vegetation*0.8)));
            source.silt -= silt;
            target.silt += silt;

            if (source.silt < source.elevation) {
                source.silt = Math.min(source.silt + pressure*0.5 * (1-source.vegetation), source.elevation);
            }

            if (source.vegetation > 0.1 && source.silt < source.elevation) {
                source.silt += 0.01 * source.vegetation;
            }

            if (source.snow > target.snow) {
                const snow = (source.snow - target.snow)*0.1;
                source.snow -= snow;
                target.snow += snow;
                const erosion = Math.min(snow, (source.elevation - target.elevation) * 0.4);
                source.elevation -= erosion * 0.1;
                target.elevation += erosion * 0.1;
            }
        }
    }

    iterateSpread() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];

            if (source.lake > 0)
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];

                const delta = source.totalElevation() - target.totalElevation();
                if (delta < 0) {
                    continue;
                }
                source.lake = Math.max(source.lake, 0);
                let transfer = Math.min(delta / source.adjacents.length * source.lake, source.lake);
                source.lake -= transfer;
                target.lake += transfer;

                const erosion = Math.min(transfer*transfer*0.01, (source.elevation - target.elevation)*0.1) * source.hardness();
                source.elevation -= erosion;
                target.elevation += erosion;
            }
        }
        
        if (false)
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]

            if (source.lake > 0.1) {
                source.silt = Math.min(source.silt + source.lake*0.5, Math.max(source.silt, source.elevation * 0.1));
            }

            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const factor = (source.elevation - target.elevation) * source.hardness();

                const lake = source.lake + target.lake;

                if (lake > 0.1) {
                    target.elevation += factor*0.1*lake;
                    source.elevation -= factor*0.1*lake;
                }

                if (factor > 0.02) {
                    target.elevation += factor*0.1;
                    source.elevation -= factor*0.1;
                }
                
                const siltFactor = source.silt - target.silt;
                if (source.elevation - target.elevation > (0.5 - lake) && siltFactor > (0.5 - lake)) {
                    const silt = Math.min(source.elevation*0.1, Math.min(source.silt*0.1, siltFactor*0.1));
                    source.elevation -= silt;
                    target.elevation += silt;
                    source.silt -= silt;
                    target.silt += silt;
                }
            }
        }
    }
}