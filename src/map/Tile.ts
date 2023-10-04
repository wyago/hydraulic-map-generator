import { PointLike } from "./PointLike";

export type Roughness =
    "flat" |
    "hills" |
    "mountain";

export class Tile {
    readonly x: number;
    readonly y: number;
    readonly roughness: Roughness;
    readonly elevation: number;

    readonly adjacents: number[] = [];
    readonly points: PointLike[] = [];

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(x: number, y: number, roughness: Roughness, elevation: number) {
        this.x = x;
        this.y = y;
        this.roughness = roughness;
        this.elevation = elevation;

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }
}