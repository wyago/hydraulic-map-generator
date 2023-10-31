import * as THREE from "three";
import { Graph } from "../terrain/Graph";
import { TileSet } from "../terrain/PointSet";
import { Tile } from "./Tile";

export class Gameboard {
    object: THREE.Object3D;
    tiles: Tile[];
    graph: Graph;

    constructor(original: TileSet) {
        this.object = new THREE.Object3D();
        this.graph = original.vertices;
        this.tiles = new Array<Tile>(original.count);
        for (let i = 0; i < original.count; ++i) {
            this.tiles[i] = new Tile(original, i);
        }
    }

    renderObject() {
        return this.object;
    }
}