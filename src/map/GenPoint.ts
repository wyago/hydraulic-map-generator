import { SimplexNoise } from "ts-perlin-simplex";

export type PointType =
    "flat" |
    "hills" |
    "mountain";

const naturalElevation = {
    "flat": 0.0,
    "hills": 0.7,
    "mountain": 1,
} as const;

const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();

export class GenPoint {
    x: number;
    y: number;
    readonly type: PointType;
    readonly elevation: number

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    river: boolean;

    constructor(x: number, y: number, type: PointType, elevation: number) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.elevation = elevation;

        if (this.x !== this.x) {
            debugger;
        }

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }

    noise() {
        let result = (noise.noise(
            (this.x + noiseX.noise(this.x * 0.001, this.y * 0.001) * 940) * 0.0003,
            (this.y + noiseY.noise(this.x * 0.001, this.y * 0.001) * 940) * 0.0003,
        ) * 0.35 + 0.35) + (noise.noise(
            (this.x + noiseX.noise(this.x * 0.01, this.y * 0.01) * 140) * 0.005,
            (this.y + noiseY.noise(this.x * 0.01, this.y * 0.01) * 140) * 0.005,
        ) * 0.15 + 0.15); 
        return Math.pow(result, 1)*0.8;
    }

    sample(radius: number) {
        const angle = Math.random() * 2 * Math.PI;
        let l = Math.random() * radius + radius;
        const dx = Math.cos(angle) * l;
        const dy = Math.sin(angle) * l;

        const type = this.nextType();

        let shift = (
            (this.noise() - this.elevation)*0.02
        );

        if (this.elevation + shift !== this.elevation + shift) {
            debugger;
        }

        return new GenPoint(
            this.x + dx,
            this.y + dy,
            type,
            Math.max(this.elevation + shift, 0)
        );
    }

    nextType() {
        let result = this.type;
        let shift = 0.8;
        if (this.noise() > 0.0) {
            shift = 0.2;
        }
        if (this.type === "flat") {
            const r = Math.random();
             if (r < 0.2 * shift) {
                result = "hills";
            }
        } else if (this.type === "hills") {
            if (Math.random() < 0.4 * shift) {
                result = "flat";
            }
        } else if (this.type === "mountain") {
            if (Math.random() < 0.4) {
                result = "hills";
            }
        }

        return result;
    }
}