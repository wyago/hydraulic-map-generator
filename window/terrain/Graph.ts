import KDBush from "kdbush";
import { byMin } from "../math";

export type BushVertex = {
    readonly index: number;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

export class Graph {
    points: KDBush;
    count: number;
    xys: Float32Array;

    constructor(xys: Float32Array) {
        this.count = xys.length/2;
        this.xys = xys;
        this.points = new KDBush(this.count);
        for (let i = 0; i < this.count; ++i) {
            this.points.add(xys[i*2], xys[i*2+1]);
        }
        this.points.finish();
    }

    map<T>(f: (x: number, y: number, i: number) => T) {
        let result = new Array<T>(this.count);
        for (let i = 0; i < this.count; ++i) {
            result[i] = f(this.xys[i*2], this.xys[i*2+1], i);
        }
        return result;
    }

    closest(x: number, y: number, searchRadius: number) {
        return byMin(this.points.within(x,y, searchRadius), i => {
            const dx = this.x(i) - x;
            const dy = this.y(i) - y;
            return dx *dx + dy*dy;
        });
    }

    x(i: number) {
        return this.xys[i * 2];
    }

    y(i: number) {
        return this.xys[i * 2 + 1];
    }

    export() {
        return JSON.stringify([...this.xys]);
    }
}
