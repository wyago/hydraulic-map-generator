    
export class Tile {
    readonly x: number;
    readonly y: number;
    hardRock: number = 0;
    softRock: number = 0;
    water: number = 0;
    snow: number = 0;
    vegetation: number = 0;

    readonly adjacents: number[] = [];
    downhill: number = 0;
    riverAmount: number = 0;
    fog: number = 0;
    humidity: number = 0;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(x: number, y: number, hardRock: number, softRock: number) {
        this.x = x;
        this.y = y;
        this.hardRock = hardRock;
        this.softRock = softRock;
        this.water = Math.max(0.25 - hardRock, 0) + softRock;

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