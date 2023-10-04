import { PointLike } from "./PointLike";

export class HalfBoundary {
    readonly a: PointLike;
    readonly b: PointLike;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(a: PointLike, b: PointLike) {
        this.a = a;
        this.b = b;

        this.minX = Math.min(this.a.x, this.b.x);
        this.maxX = Math.max(this.a.y, this.b.y);

        this.minY = Math.min(this.a.x, this.b.x);
        this.maxY = Math.max(this.a.y, this.b.y);
    }
}