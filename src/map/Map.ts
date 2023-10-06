import Delaunator from "delaunator";
import { SimplexNoise } from "ts-perlin-simplex";
import { byMin } from "../math";
import { Tile } from "./Tile";


const hardness = {
    "mountain": 0.01,
    "hills": 0.1,
    "flat": 1
} as const;

const noise = new SimplexNoise();

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
            for (let j = 0; j < 100; ++j) {
                let target = this.allTiles[current.downhill];
                if (target.elevation < 0.4 || target.totalElevation() > current.totalElevation()) {
                    break;
                }
                current.riverAmount += 0.005;
                current = target;
            }
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
        this.deriveDownhills();
        for (let i = 0; i < this.allTiles.length; ++i) {
            const source = this.allTiles[i];
            if (source.lake > 0.4) {
                source.lake -= 0.01;
            }
            let target = this.allTiles[source.downhill];
            const delta = (source.totalElevation() - target.totalElevation());
            if (delta < 0) {
                if (source.elevation > 0.4) {
                    source.lake += 0.002;
                }
                continue;
            }

            let pressure = (source.elevation - target.elevation) * hardness[source.roughness];

            if (source.elevation < 0.4) {
                pressure *= 10;
            } else if (target.lake > 0.05) {
                pressure *= 5;
            }
            source.elevation -= pressure * 0.01;
            target.elevation += pressure * 0.01;
        }
    }
}