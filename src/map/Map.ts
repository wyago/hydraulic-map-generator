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
            source.downhill = byMin(source.adjacents, i => source.elevation - this.allTiles[i].elevation);
        });
    }

    setRivers() {
        this.deriveDownhills();

        for (let i = 0; i < this.allTiles.length; ++i) {
            this.allTiles[i].riverAmount = 0;
        }
        for (let i = 0; i < this.allTiles.length; ++i) {
            let current = this.allTiles[i];
            const charge = current.lake * 0.1;
            current.lake *= 0.9;
            for (let j = 0; j < 1000; ++j) {
                let target = this.allTiles[current.downhill];
                if (target.totalElevation() > current.totalElevation()) {
                    if (current.elevation > 0.4) {
                        current.lake += 0.001;
                    }
                    break;
                }
                current.riverAmount += 0.001;
                current = target;
            }
            current.lake += charge;
        }
    }

    deriveDownhills() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i]
            let lowest = Number.MAX_VALUE;
            for (let j = 0; j < source.adjacents.length; ++j) {
                const dx = this.allTiles[source.adjacents[j]].totalElevation();
                if (dx < lowest) {
                    source.downhill = source.adjacents[j];
                    lowest = dx;
                }
            }
        }
    }

    iterateRivers() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];
            source.lake *= 0.99;
            let target = this.allTiles[source.downhill];
            const delta = (source.totalElevation() - target.totalElevation());
            if (delta < 0) {
                continue;
            }

            let pressure = Math.min(source.elevation - target.elevation, source.riverAmount)  * source.softRock;

            if (source.elevation < 0.4) {
                pressure *= 1;
            } else if (target.lake > 0.05) {
                pressure *= 1;
            }
            pressure *= 0.1;
            pressure  = Math.min(pressure, (source.elevation - target.elevation)*0.5);
            source.elevation -= pressure;
            target.elevation += pressure;
        }
    }

    iterateSpread() {
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];

            for (let j = 0; j < source.adjacents.length; ++j) {
                const target = this.allTiles[source.adjacents[j]];

                const delta = source.totalElevation() - target.totalElevation();
                let transfer = Math.min(delta / source.adjacents.length, source.lake);
                if (target.elevation < 0.4) {
                    transfer = source.lake;
                }
                source.lake -= transfer;

                const erosion = Math.min(transfer*transfer*0.3, (source.elevation - target.elevation)*0.1);
                source.elevation -= erosion * source.softRock;
                target.elevation += erosion * source.softRock;
            }
        }
    }
}