import { TileSet } from "../terrain/PointSet";
import { River } from "./River";
import { RiverPoint } from "./RiverPoint";

export class Tile {
    i: number;
    x: number;
    y: number;

    rock: number;
    dirt: number;
    water: number;
    aquifer: number;
    snow: number;
    exposure: number;
    adjacents: number[];

    river: RiverPoint;
    features: River[];

    constructor(original: TileSet, i: number) {
        this.i = i;
        this.x = original.x(i);
        this.y = original.y(i);
        this.rock = original.hard[i];
        this.dirt = original.soft[i];
        this.water = original.water[i];
        this.aquifer = original.aquifer[i];
        this.snow = original.snow[i];
        this.adjacents = original.adjacents[i];
        this.exposure = original.rockElevation(i) - original.occlusion[i] > 0 ? 1 : 0;
        this.river = new RiverPoint(0);
        this.features = [];
    }

    totalElevation() {
        return this.rock + this.dirt + this.water;
    }

    waterTable() {
        return this.rock + this.aquifer;
    }
    
    rockElevation() {
        return this.rock + this.dirt;
    }

    downhill(tiles: Tile[]) {
        let min = Number.MAX_VALUE;
        let result = tiles[0];
        for (let j = 0; j < this.adjacents.length; ++j) {
            const target = tiles[this.adjacents[j]];
            const e = target.totalElevation();
            if (e < min) {
                min = e;
                result = target;
            }
        }
        return result;
    }

    downWaterTable(tiles: Tile[]) {
        let min = Number.MAX_VALUE;
        let result = tiles[0];
        for (let j = 0; j < this.adjacents.length; ++j) {
            const target = tiles[this.adjacents[j]];
            const e = target.waterTable();
            if (e < min) {
                min = e;
                result = target;
            }
        }
        return result;
    }
}