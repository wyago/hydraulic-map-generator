import { SimplexNoise } from "ts-perlin-simplex";
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
    hardRock: number = 0;
    softRock: number = 0;
    water: number = 0;
    snow: number = 0;
    vegetation: number = 0;

    readonly adjacents: number[] = [];
    readonly points: PointLike[] = [];
    downhill: number = 0;
    riverAmount: number = 0;
    fog: number = 0;
    humidity: number = 0;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(x: number, y: number, roughness: Roughness, hardRock: number, softRock: number) {
        this.x = x;
        this.y = y;
        this.roughness = roughness;
        this.hardRock = hardRock;
        this.softRock = softRock;
        this.water = Math.max(0.4 - hardRock - softRock, 0);

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }

    totalElevation() {
        return this.hardRock + this.softRock + this.water;
    }

    rockElevation() {
        return this.hardRock + this.softRock;
    }

    surfaceWater() {
        return this.water;
        //return Math.max(0, this.water - this.softRock);
    }

    waterTable() {
        return this.hardRock + this.water;
    }
}