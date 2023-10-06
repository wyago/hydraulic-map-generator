import Delaunator from "delaunator";
import { byMin } from "../math";
import { Tile } from "./Tile";


const hardness = {
    "mountain": 0.01,
    "hills": 0.1,
    "flat": 1
} as const;


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
            this.allTiles[i].riverAmount = 0;
            if (this.allTiles[i].lake > 0.44) {
                this.allTiles[i].lake -= 0.04;
            }
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            let current = this.allTiles[i];
            for (let j = 0; j < 40; ++j) {
                let target = this.allTiles[current.downhill];
                const delta = target.totalElevation() - current.totalElevation();
                if (delta > 0) {
                    break;
                }
                current.riverAmount += 0.01;
                current = target;
            }
            current.lake += 0.00001;
        }
    }

    deriveDownhills() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            let lowest = Number.MAX_VALUE;
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const factor = target.totalElevation() - (source.vx * dx + source.vy * dy);
                if (factor < lowest) {
                    source.downhill = source.adjacents[j];
                    lowest = factor;
                }
            }
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            const target = this.allTiles[source.downhill];
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const de = source.totalElevation() - target.totalElevation();
            source.vx += dx * de * 1;
            source.vy += dy * de * 1;
            source.vx *= 0.9;
            source.vy *= 0.9;
            if (source.vx < 0) {
                source.vx = 0;
            }
            if (source.vy < 0) {
                source.vy = 0;
            }
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            const target = this.allTiles[source.downhill];
            const de = source.totalElevation() - target.totalElevation();
            const transferx = source.vx * de;
            const transfery = source.vy * de;

            source.vx -= transferx;
            source.vy -= transfery;
            target.vx += transferx;
            target.vy += transfery;
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

            let pressure = source.speed2();

            if (source.elevation < 0.4) {
                pressure *= 1;
            } else if (target.lake > 0.05) {
                pressure *= 1;
            }
            pressure *= 0.5;
            pressure  = Math.min(pressure, (source.elevation - target.elevation)*0.1);
            source.elevation -= pressure;
            target.elevation += pressure;

            const silt = Math.min(source.silt*0.1, pressure);
            source.silt -= silt;
            target.silt += silt;
        }
    }

    iterateSpread() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];

            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];

                const delta = source.totalElevation() - target.totalElevation();
                let transfer = Math.min(delta / source.adjacents.length, source.lake);
                source.lake -= transfer;
                target.lake += transfer;

                if (transfer > 0.01) {
                    const erosion = Math.min(transfer*transfer*0.001, (source.elevation - target.elevation)*0.1);
                    source.elevation -= erosion;
                    target.elevation += erosion;
                }
            }
        }
        
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            if (source.lake > 0.1)
            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];
                const factor = (source.elevation - target.elevation)*source.lake;
                target.elevation += factor*0.3;
                source.elevation -= factor*0.3;

                const silt = (source.silt - target.silt)*source.lake;
                source.silt -= silt;
                target.silt += silt;
            }
        }
    }
}