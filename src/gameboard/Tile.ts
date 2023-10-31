import { TileSet } from "../terrain/PointSet";

export class Tile {
    x: number;
    y: number;

    rock: number;
    dirt: number;
    water: number;
    aquifer: number;
    snow: number;
    adjacents: number[];

    constructor(original: TileSet, i: number) {
        this.x = original.x(i);
        this.y = original.y(i);
        this.rock = original.hard[i];
        this.dirt = original.soft[i];
        this.water = original.water[i];
        this.aquifer = original.aquifer[i];
        this.snow = original.snow[i];
        this.adjacents = original.adjacents[i];
    }
}