import Delaunator from "delaunator";
import RBush from "rbush";
import { clamp } from "../math";
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
    air(i: number) {
        return 2 - this.totalElevation(i)*2;
    }
    vertices: Vertices;
    count: number;

    hard: Float32Array;
    soft: Float32Array;
    water: Float32Array;
    river: Float32Array;
    vegetation: Float32Array;
    fog: Float32Array;

    downhills: number[];
    uphill: number[];
    adjacents: number[][];

    constructor(points: Tile[]) {
        this.hard = new Float32Array(points.length);
        this.soft = new Float32Array(points.length);
        this.water = new Float32Array(points.length);
        this.river = new Float32Array(points.length);
        this.vegetation = new Float32Array(points.length);
        this.fog = new Float32Array(points.length);

        this.count = points.length;
        this.vertices = {
            count: points.length,
            points: new RBush<BushVertex>(),
            xs: new Float32Array(points.length),
            ys: new Float32Array(points.length),
        }
        this.uphill = new Array<number>(points.length);
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
            this.hard[i] = t.hardRock;
            this.soft[i] = t.softRock;
            this.water[i] = t.water;
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

    totalElevation(i: number) {
        return this.hard[i] + Math.max(this.soft[i], this.water[i]);
    }

    rockElevation(i: number) {
        return this.hard[i] + this.soft[i];
    }

    surfaceWater(i: number) {
        return Math.max(0, this.water[i] - this.soft[i]);
    }

    surfaceRock(i: number) {
        return clamp(this.rockElevation(i) - this.surfaceWater(i), 0, 1);
    }

    waterTable(i: number) {
        return this.hard[i] + this.water[i];
    }

    marshal() {
        return `{
            xs: [${[...this.vertices.xs].map(x => x.toFixed(4)).join(",")}],
            ys: [${[...this.vertices.ys].map(x => x.toFixed(4)).join(",")}],
            hard: [${[...this.hard].map(x => x.toFixed(4)).join(",")}],
            soft: [${[...this.soft].map(x => x.toFixed(4)).join(",")}],
            water: [${[...this.water].map(x => x.toFixed(4)).join(",")}],
            vegetation: [${[...this.vegetation].map(x => x.toFixed(4)).join(",")}]
        }`
    }

    unmarshal(json: any) {
        this.vertices = {
            count: json.xs.length,
            points: new RBush<BushVertex>(),
            xs: new Float32Array(json.xs),
            ys: new Float32Array(json.ys),
        };
        this.count = this.vertices.count;
        this.hard = new Float32Array(json.hard);
        this.soft = new Float32Array(json.soft);
        this.water = new Float32Array(json.water);
        this.vegetation = new Float32Array(json.vegetation);
        this.river = new Float32Array(this.count);
        this.uphill = new Array<number>(this.count);

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
        return this;
    }
}