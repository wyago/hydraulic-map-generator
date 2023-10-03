const threshold = {
    mountain: 0.95,
    hills: 0.4,
    land: 0.1,
    ocean: 0.0
} as const;

export class GenPoint {
    readonly x: number;
    readonly y: number;
    readonly elevation: number;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;

    constructor(x: number, y: number, elevation: number) {
        this.x = x;
        this.y = y;
        this.elevation = elevation;

        this.minX = this.x;
        this.maxX = this.x;
        this.minY = this.y;
        this.maxY = this.y;
    }

    type(): "ocean" | "land" | "hills" | "mountain" {
        if (this.elevation < threshold.land) {
            return "ocean";
        } else if (this.elevation < threshold.hills) {
            return "land";
        } else if (this.elevation < threshold.mountain) {
            return "hills";
        } else {
            return "mountain";
        }
    }

    relativeElevation() {
        const type = this.type();

        return (this.elevation - threshold[type]) / (1-threshold[type]);
    }
}