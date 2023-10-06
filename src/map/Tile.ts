import { SimplexNoise } from "ts-perlin-simplex";
import { PointLike } from "./PointLike";

export type Roughness =
    "flat" |
    "hills" |
    "mountain";

const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
export class Tile {
    readonly x: number;
    readonly y: number;
    readonly roughness: Roughness;
    elevation: number;

    readonly adjacents: number[] = [];
    readonly points: PointLike[] = [];
    downhill: number = 0;
    riverAmount: number = 0;
    lake: number = 0;

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

    totalElevation() {
        return this.elevation + this.lake;
    }
}