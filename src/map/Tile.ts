import { SimplexNoise } from "ts-perlin-simplex";
import { clamp } from "../math";
import { PointLike } from "./PointLike";

export type Roughness =
    "flat" |
    "hills" |
    "mountain";

const hardHeight = {
    "mountain": 0.95,
    "hills": 0.9,
    "flat": 0.5
} as const;

const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
function fbm(x: number, y: number) {
    let result = 0;
    x = x + noiseX.noise(x * 0.001, x * 0.001) * 2000;
    y = y + noiseY.noise(y * 0.001, y * 0.001) * 2000;
    for (let i = 0; i < 4; ++i) {
        const factor = Math.pow(2, i+1);
        result = noise.noise(x / factor * 0.001, y / factor * 0.001) / factor;
    }
    return result * 0.5 + 0.5;
}
    
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
    silt = 0.;
    snow: number = 0;
    vegetation: number = 0;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(x: number, y: number, roughness: Roughness, elevation: number) {
        this.x = x;
        this.y = y;
        this.roughness = roughness;
        this.elevation = elevation;
        this.lake = Math.max(0.4 - this.elevation, 0);

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }

    totalElevation() {
        return this.elevation + this.lake;
    }

    hardHeight() {
        return hardHeight[this.roughness];
    }

    hardness() {
        return clamp(0.2 + this.silt*0.7 + Math.max(0, this.elevation - hardHeight[this.roughness])*0.75 - this.elevation*0.5, 0.01, 1) * fbm(this.x*0.01, this.y*0.01);
    }
}