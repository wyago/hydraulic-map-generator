import { SimplexNoise } from "ts-perlin-simplex";

export type PointType =
    "land" |
    "hills" |
    "mountain";

const naturalElevation = {
    "land": 0.0,
    "hills": 0.7,
    "mountain": 1,
}

const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();

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

        let shift = (
            (naturalElevation[type] - this.elevation)*0.02 + Math.random() * 0.1 - 0.05
        )
        if ( noise.noise(
            (this.x + noiseX.noise(this.x * 0.02, this.y * 0.02) * 200) * 0.001,
            (this.y + noiseY.noise(this.x * 0.02, this.y * 0.02) * 200) * 0.001,
        ) > 0.5) {
            //shift *= 1.5;
        }

        return new GenPoint(
            this.x + dx,
            this.y + dy,
            type,
            this.elevation + shift
        );
    }

    nextType() {
        let result = this.type;
        let shift = 1;
        if ( noise.noise(
            (this.x + noiseX.noise(this.x * 0.02, this.y * 0.02) * 200) * 0.001,
            (this.y + noiseY.noise(this.x * 0.02, this.y * 0.02) * 200) * 0.001,
        ) > 0.2) {
            shift = 0.5;
        }
        if (this.type === "land") {
            const r = Math.random();
             if (r < 0.05 * shift) {
                result = "hills";
            }
        } else if (this.type === "hills") {
            if (Math.random() < 0.2 * shift) {
                result = "land";
            }
        } else if (this.type === "mountain") {
            if (Math.random() < 0.6 * shift) {
                result = "hills";
            }
        }

        return result;
    }
}