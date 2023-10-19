import { SimplexNoise } from "ts-perlin-simplex";

export class FbmNoise {
    internal = new SimplexNoise();
    scale: number;
    iterations: number;

    constructor(scale = 1, iterations = 30) {
        this.scale = scale;
        this.iterations = iterations;
    }

    noise(x: number, y: number) {
        let result = 0;
    
        let mul = 0.5 * this.scale;
        let div = 0.5;
        for (let i = 0; i < this.iterations; ++i) {
            result += this.internal.noise(x * mul, y * mul) * div;
            mul *= 2;
            div *= 0.6;
        }
        return result;
    }

    noise3(x: number, y: number, z: number) {
        let result = 0;
    
        let mul = 0.5 * this.scale;
        let div = 0.5;
        for (let i = 0; i < this.iterations; ++i) {
            result += this.internal.noise3d(x * mul, y * mul, z * mul) * div;
            mul *= 2;
            div *= 0.5;
        }
        return result;
    }
}