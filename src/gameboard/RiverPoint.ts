import { Tile } from "./Tile";

export class RiverPoint {
    next?: Tile;
    depth: number;

    constructor(depth: number, next?: Tile) {
        this.depth = depth;
        this.next = next;
    }
}