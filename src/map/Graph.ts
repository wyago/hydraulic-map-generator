import Delaunator from "delaunator";
import RBush from "rbush";
import { Tile } from "./Tile";

export type BushVertex = {
    readonly index: number;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

export type Vertices = {
    points: RBush<BushVertex>;
    count: number;
    xs: Float32Array;
    ys: Float32Array;
}

export class TileSet {
    vertices: Vertices;
    count: number;

    hardSoftWaterRiver: Float32Array;

    downhills: number[];
    adjacents: number[][];

    constructor(points: Tile[]) {
        this.hardSoftWaterRiver = new Float32Array(points.length * 4);
        this.count = points.length;
        this.vertices = {
            count: points.length,
            points: new RBush<BushVertex>(),
            xs: new Float32Array(points.length),
            ys: new Float32Array(points.length),
        }
        this.vertices.points.load(points.map((p, i) => ({
            index: i,
            maxX: p.x,
            minX: p.x,
            maxY: p.y,
            minY: p.y,
        })))

        this.downhills = points.map(i => 0);

        for (let i = 0; i < points.length; ++i) {
            const t = points[i];
            this.hardSoftWaterRiver[i*4 + 0] = t.hardRock;
            this.hardSoftWaterRiver[i*4 + 1] = t.softRock;
            this.hardSoftWaterRiver[i*4 + 2] = t.water;
            this.vertices.xs[i] = t.x;
            this.vertices.ys[i] = t.y;
        }
        
        const source = points.map(a => ([a.x, a.y]));

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

        this.adjacents = source.map(s => []);
        forEachTriangleEdge((p, q) => {
            this.adjacents[p].push(q);
            this.adjacents[q].push(p);

        });

        this.adjacents = this.adjacents.map((a,i) => {
            const sourcex = this.vertices.xs[i];
            const sourcey = this.vertices.ys[i];
            return a.sort((x, y) => {
                const leftx = this.vertices.xs[x];
                const lefty = this.vertices.ys[x];
                const rightx = this.vertices.xs[y];
                const righty = this.vertices.ys[y];
                return Math.atan2(lefty - sourcey, leftx - sourcex) > Math.atan2(righty - sourcey, rightx - sourcex) ? 1 : -1;
            })
        });
    }

    x(i: number) {
        return this.vertices.xs[i];
    }

    y(i: number) {
        return this.vertices.ys[i];
    }

    downhill(source: number) {
        return this.downhills[source];
    }

    hardRock(i: number) {
        return this.hardSoftWaterRiver[i*4];
    }

    softRock(i: number) {
        return this.hardSoftWaterRiver[i*4 + 1];
    }

    water(i: number) {
        return this.hardSoftWaterRiver[i*4 + 2];
    }

    river(i: number) {
        return this.hardSoftWaterRiver[i*4 + 3];
    }

    totalElevation(i: number) {
        return this.hardRock(i) + Math.max(this.softRock(i), this.water(i));
    }

    rockElevation(i: number) {
        return this.hardRock(i) + this.softRock(i);
    }

    surfaceWater(i: number) {
        return Math.max(0, this.water(i) - this.softRock(i));
    }

    waterTable(i: number) {
        return this.hardRock(i) + this.water(i);
    }

    marshal() {
        return JSON.stringify({
            xs: [...this.vertices.xs],
            ys: [...this.vertices.ys],
            terrain: [...this.hardSoftWaterRiver],
        });
    }

    unmarshal(text: string) {
        const json = JSON.parse(text);
        this.vertices = {
            count: json.xs.length,
            points: new RBush<BushVertex>(),
            xs: new Float32Array(json.xs),
            ys: new Float32Array(json.ys),
        };
        this.count = this.vertices.count;

        this.hardSoftWaterRiver = new Float32Array(json.terrain);
       
        this.vertices.points.load(json.xs.map((x, i) => ({
            index: i,
            maxX: x,
            minX: x,
            maxY: this.vertices.ys[i],
            minY: this.vertices.ys[i],
        })))

        this.downhills = json.xs.map(i => 0);
        
        const source = json.xs.map((x, i) => ([x, json.ys[i]]));

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

        this.adjacents = source.map(s => []);
        forEachTriangleEdge((p, q) => {
            this.adjacents[p].push(q);
            this.adjacents[q].push(p);
        });

        this.adjacents = this.adjacents.map((a,i) => {
            const sourcex = this.vertices.xs[i];
            const sourcey = this.vertices.ys[i];
            return a.sort((x, y) => {
                const leftx = this.vertices.xs[x];
                const lefty = this.vertices.ys[x];
                const rightx = this.vertices.xs[y];
                const righty = this.vertices.ys[y];
                return Math.atan2(lefty - sourcey, leftx - sourcex) > Math.atan2(righty - sourcey, rightx - sourcex) ? 1 : -1;
            })
        }); 
    }
}