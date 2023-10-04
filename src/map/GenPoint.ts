import { SimplexNoise } from "ts-perlin-simplex";

export type PointType =
    "ocean" |
    "coast" |
    "land" |
    "hills" |
    "mountain";

const naturalElevation = {
    "ocean": 0,
    "coast": 0.1,
    "land": 0.5,
    "hills": 0.7,
    "mountain": 1,
}

const noise = new SimplexNoise();

export class GenPoint {
    readonly x: number;
    readonly y: number;
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

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }

    sample(radius: number) {
        const angle = Math.random() * 2 * Math.PI;
        let l = Math.random() * radius + radius;
        const dx = Math.cos(angle) * l;
        const dy = Math.sin(angle) * l;

        const type = this.nextType();

        const shift = (naturalElevation[type] - this.elevation)*0.07 + Math.random() * 0.1 - 0.05;

        return new GenPoint(
            this.x + dx,
            this.y + dy,
            type,
            this.elevation + shift
        );
    }

    nextType() {
        let result = this.type;
        if (this.type === "land") {
            const r = Math.random();
            if (r < 0.02 * (noise.noise(this.x * 0.01, this.y * 0.01) + 1)) {
                result = "coast";
            } else if (r < 0.09) {
                result = "hills";
            }
        } else if (this.type === "ocean") {
            if (Math.random() < 0.1) {
                result = "coast";
            }
        } else if (this.type === "coast") {
            const r = Math.random();
            if (r < 0.05) {
                result = "land";
            } else if (r < 0.2) {
                result = "ocean";
            }
        } else if (this.type === "hills") {
            if (Math.random() < 0.2) {
                result = "land";
            }
        } else if (this.type === "mountain") {
            if (Math.random() < 0.6) {
                result = "hills";
            }
        }

        return result;
    }
}