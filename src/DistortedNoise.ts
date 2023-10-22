import { FbmNoise } from "./FbmNoise";

export class DistortedNoise {
    main: FbmNoise;
    xnoise: FbmNoise;
    ynoise: FbmNoise;

    constructor(scale = 1, iterations = 30) {
        this.main = new FbmNoise(scale, iterations)
        this.xnoise = new FbmNoise(scale*0.05, 20)
        this.ynoise = new FbmNoise(scale*0.05, 20)
    }

    noise(x: number, y: number) {
        return this.main.noise(x + this.xnoise.noise(x, y)/this.main.scale*5, y + this.ynoise.noise(x, y)/this.main.scale*5);
    }
}