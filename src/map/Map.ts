import Delaunator from "delaunator";
import RBush from "rbush";
import { byMin } from "../math";
import { Tile } from "./Tile";


const hardness = {
    "mountain": 0.01,
    "hills": 0.1,
    "flat": 1
} as const;

export class Map {
    readonly allTiles: Tile[];
    readonly tiles: RBush<Tile>;

    constructor(tiles: Tile[]) {
        this.tiles = new RBush<Tile>();

        this.allTiles = tiles;
        this.tiles.load(this.allTiles);
        
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
            source.riverDirection = byMin(source.adjacents, i => source.elevation - this.allTiles[i].elevation);
        });
    }

    setRivers() {
        this.allTiles.forEach(source => {
            if (source.water > 0.43) {
                source.water -= 0.02;
            } else if (source.water < 0.2) {
                source.water += 0.05;
            }

            source.softening = source.softening * 0.99 + source.water * 0.01;
            source.adjacents.forEach(a => {
                const target = this.allTiles[source.riverDirection];
                const pressure = (source.elevation - target.elevation);
                if (pressure > 0) {
                    const transfer = pressure * source.softening;
                    target.elevation += transfer;
                    source.elevation -= transfer;
                }
            });
        });
        for (let i = 0; i < 30; ++i)
            this.iterateRivers();
    }

    iterateRivers() {
        this.allTiles.forEach(source => {
            source.riverDirection = byMin(source.adjacents, i => this.allTiles[i].totalElevation() - source.totalElevation());

            let target = this.allTiles[source.riverDirection];
            const pressure = (source.totalElevation() - target.totalElevation());

            //if (source.riverAmount === newDirection) {
                source.velocity = source.velocity*0.99 + pressure*0.05;
            //} else {
                //source.velocity = source.velocity*0.5 + pressure*0.08;
            //}

            if (source.velocity < 0) {
                source.velocity = 0;
            }

            //const erosion = pressure * 0.2;
            //target.elevation += erosion;
            //source.elevation -= erosion;

            //const transfer = pressure * 0.4;
            //target.riverAmount += transfer;
            //source.riverAmount -= transfer;

        });
        this.allTiles.forEach(source => {
            const target = this.allTiles[source.riverDirection];
            const erosion = source.velocity*source.velocity * 0.2 * hardness[source.roughness] * source.water;
            target.elevation += erosion;
            source.elevation -= erosion;

            const transfer = source.velocity*source.velocity * 0.9 * source.water;
            target.water += transfer;
            source.water -= transfer;
        });
    }
}