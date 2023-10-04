import RBush from "rbush";
import { Tile } from "./Tile";


export class Map {
    readonly allTiles: Tile[];
    readonly tiles: RBush<Tile>;

    constructor(tiles: Tile[]) {
        this.tiles = new RBush<Tile>();

        this.allTiles = tiles;
        this.tiles.load(this.allTiles);
    }


}