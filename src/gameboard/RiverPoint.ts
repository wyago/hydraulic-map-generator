import { Tile } from "./Tile";

export class RiverPoint {
    next?: Tile;
    width: number;
    depth: number;
    spring: boolean;
    sink: boolean;

    constructor(width: number, depth: number, spring: boolean, sink: boolean, next?: Tile) {
        this.width = width;
        this.depth = depth;
        this.next = next;
    }
}