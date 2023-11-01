import Delaunator from "delaunator";
import * as THREE from "three";
import { Vector2 } from "three";
import { PointLike } from "../PointLike";
import { clamp } from "../math";
import { Graph } from "./Graph";

export class TileSet {
    air(i: number) {
        return 0.7 - this.totalElevation(i);
    }
    vertices: Graph;
    count: number;

    hard: Float32Array;
    soft: Float32Array;
    water: Float32Array;
    aquifer: Float32Array;
    river: Float32Array;
    vegetation: Float32Array;
    occlusion: Float32Array;
    snow: Float32Array;
    silt: Float32Array;

    adjacents: number[][];
    invertLengths: number[][];

    constructor(vertices: Graph) {
        this.hard = new Float32Array(vertices.count);
        this.soft = new Float32Array(vertices.count);
        this.water = new Float32Array(vertices.count);
        this.aquifer = new Float32Array(vertices.count);
        this.river = new Float32Array(vertices.count);
        this.vegetation = new Float32Array(vertices.count);
        this.occlusion = new Float32Array(vertices.count);
        this.snow = new Float32Array(vertices.count);
        this.silt = new Float32Array(vertices.count);

        this.occlusion.fill(1);

        this.count = vertices.count;
        this.vertices = vertices;
        
        const source = vertices.map((x,y) => [x, y]);

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

        this.adjacents = source.map(_ => []);
        forEachTriangleEdge((p, q) => {
            this.adjacents[p].push(q);
            this.adjacents[q].push(p);
        });

        this.adjacents = this.adjacents.map((a,i) => {
            const sourcex = this.vertices.xys[i*2];
            const sourcey = this.vertices.xys[i*2+1];
            return a.sort((x, y) => {
                const leftx = this.vertices.xys[x*2];
                const lefty = this.vertices.xys[x*2+1];
                const rightx = this.vertices.xys[y*2];
                const righty = this.vertices.xys[y*2+1];
                return Math.atan2(lefty - sourcey, leftx - sourcex) > Math.atan2(righty - sourcey, rightx - sourcex) ? 1 : -1;
            })
        });

        this.invertLengths = this.adjacents.map((a,i) => {
            const center = new Vector2(this.x(i), this.y(i));
            return a.map(j => {
                const target = new Vector2(this.x(j), this.y(j));
                target.sub(center);
                return 1/target.length();
            })
        })
    }

    x(i: number) {
        return this.vertices.xys[i*2];
    }

    y(i: number) {
        return this.vertices.xys[i*2+1];
    }

    downhill(i: number) {
        let min = Number.MAX_VALUE;
        const adjacents = this.adjacents[i];
        let result = 0;
        for (let j = 0; j < adjacents.length; ++j) {
            const target = adjacents[j];
            const e = this.totalElevation(target);
            if (e < min) {
                min = e;
                result = target;
            }
        }
        return result;
    }

    downhillIndex(i: number) {
        let min = Number.MAX_VALUE;
        const adjacents = this.adjacents[i];
        let result = 0;
        for (let j = 0; j < adjacents.length; ++j) {
            const target = adjacents[j];
            const e = this.totalElevation(target);
            if (e < min) {
                min = e;
                result = j;
            }
        }
        return result;
    }

    waterTableDownhill(i: number) {
        let min = Number.MAX_VALUE;
        const adjacents = this.adjacents[i];
        let result = 0;
        for (let j = 0; j < adjacents.length; ++j) {
            const target = adjacents[j];
            const e = this.waterTable(target);
            if (e < min) {
                min = e;
                result = target;
            }
        }
        return result;
    }

    totalElevation(i: number) {
        return this.hard[i] + this.soft[i] + this.water[i];
    }

    rockElevation(i: number) {
        return this.hard[i] + this.soft[i];
    }

    surfaceWater(i: number) {
        return this.water[i];
    }

    waterTable(i: number) {
        return this.hard[i] + this.aquifer[i] + this.water[i];
    }

    soak(i: number) {
        if (this.soft[i] === 0) {
            return 1;
        }
        return clamp(this.aquifer[i] / (this.soft[i]), 0, 1);
    }

    aquiferSpace(i: number) {
        return clamp(this.aquiferCapacity(i) - this.aquifer[i], 0, 1);
    }
    
    aquiferCapacity(i: number) {
        return clamp(this.soft[i], 0, 1);
    }

    siltSpace(i: number) {
        return clamp(this.water[i] - this.silt[i], 0, 1);
    }

    gradient(i: number, output: { x: number, y: number, l: number}) {
        const cx = this.x(i);
        const cy = this.y(i);

        const d = this.waterTableDownhill(i);
        if (this.waterTable(d) > this.waterTable(i)) {
            output.x = 0;
            output.y = 0;
            output.l = 0;
            return;
        }
        let dx = this.x(d) - cx;
        let dy = this.y(d) - cy;

        const l = Math.sqrt(dx*dx + dy*dy);
        if (l > 0) {
            dx /= l;
            dy /= l;
        }

        output.x = dx;
        output.y = dy;
        output.l = l;
    }

    fall(pos: PointLike) {
        let closest = this.vertices.closest(pos.x, pos.y, 12);
        const output = { x: 0, y: 0, l: 1 };
        const path = new Array<PointLike>();
        for (let i = 0; closest && this.water[closest] < 0.05 && output.l > 0 && i < 10000; ++i) {
            this.gradient(closest, output);

            pos.x += output.x;
            pos.y += output.y;
            path.push({ ...pos });
            closest = this.vertices.closest(pos.x, pos.y, 12);
        }
        return path;
    }

    byDirection(i: number, v: THREE.Vector2, result: number[], angle = 0.5): number {
        const adjacents = this.adjacents[i];
        const center = new THREE.Vector2(this.x(i), this.y(i));

        let c = 0;
        for (let j = 0; j < adjacents.length; ++j) {
            const d = new THREE.Vector2(this.x(adjacents[j]), this.y(adjacents[j]));
            d.sub(center);
            d.normalize();
            const dot = d.dot(v);
            if (dot > angle) {
                result[c] = adjacents[j];
                c += 1;
            }
        }
        return c;
    }

    marshal() {
        return `{
            "tilesetversion": 1,
            "xys": [${[...this.vertices.xys].map(x => x.toFixed(1)).join(",")}],
            "hard": [${[...this.hard].map(x => x.toFixed(5)).join(",")}],
            "soft": [${[...this.soft].map(x => x.toFixed(5)).join(",")}],
            "water": [${[...this.water].map(x => x.toFixed(5)).join(",")}],
            "aquifer": [${[...this.aquifer].map(x => x.toFixed(5)).join(",")}],
            "vegetation": [${[...this.vegetation].map(x => x.toFixed(5)).join(",")}],
            "snow": [${[...this.snow].map(x => x.toFixed(5)).join(",")}]
        }`
    }

    unmarshal(json: any) {
        this.vertices = new Graph(json.xys);
        this.count = json.hard.length;
        this.hard = new Float32Array(json.hard);
        this.soft = new Float32Array(json.soft);
        this.water = new Float32Array(json.water);
        this.aquifer = new Float32Array(json.aquifer);
        this.vegetation = new Float32Array(json.vegetation);
        this.snow = json.snow ? new Float32Array(json.snow) : new Float32Array(this.count);
        this.river = new Float32Array(this.count);
        this.silt = new Float32Array(this.count);
        this.occlusion = new Float32Array(this.count);

        const source = new Array<any>(this.count);
        for (let i = 0; i < this.count; ++i) {
            source[i] = [
                this.vertices.xys[i*2],
                this.vertices.xys[i*2+1]];
        }

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
            const sourcex = this.vertices.xys[i*2];
            const sourcey = this.vertices.xys[i*2+1];
            return a.sort((x, y) => {
                const leftx = this.vertices.xys[x*2];
                const lefty = this.vertices.xys[x*2+1];
                const rightx = this.vertices.xys[y*2];
                const righty = this.vertices.xys[y*2+1];
                return Math.atan2(lefty - sourcey, leftx - sourcex) > Math.atan2(righty - sourcey, rightx - sourcex) ? 1 : -1;
            })
        }); 
        this.invertLengths = this.adjacents.map((a,i) => {
            const center = new Vector2(this.x(i), this.y(i));
            return a.map(j => {
                const target = new Vector2(this.x(j), this.y(j));
                target.sub(center);
                return target.length();
            })
        })
        return this;
    }
}