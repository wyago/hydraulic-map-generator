import * as THREE from "three";
import { rivers } from "../render/rivers";
import { Graph } from "../terrain/Graph";
import { TileSet } from "../terrain/PointSet";
import { RiverPoint } from "./RiverPoint";
import { Tile } from "./Tile";

export class Gameboard {
    object: THREE.Object3D;
    tiles: Tile[];
    graph: Graph;

    constructor(original: TileSet) {
        this.object = new THREE.Object3D();
        this.graph = original.graph;
        this.tiles = new Array<Tile>(original.count);
        for (let i = 0; i < original.count; ++i) {
            this.tiles[i] = new Tile(original, i);
        }
    }

    getSprings() {
        const result = new Array<Tile>();
        for (let i = 0; i < this.tiles.length; ++i) {
            const tile = this.tiles[i];
            
            if (tile.rockElevation() < 0.25 && tile.water > 0.002) {
                continue;
            }

            result.push(tile);
        }
        return result;
    }

    setRiverScale(scale: number) {
        this.object.children[0].removeFromParent();
        this.object.add(rivers(this, scale));
    }

    deriveRivers() {
        const boundary = this.getSprings();
        boundary.sort((a, b) => a.totalElevation() - b.totalElevation());

        boundary.forEach(x => x.riverPoint = new RiverPoint(0.1, 0.07 * x.exposure + x.snow*0.05, false, false));

        while (boundary.length > 0) {
            const highest = boundary[boundary.length - 1];
            boundary.splice(boundary.length - 1, 1);

            const target = highest.downhill(this.tiles);
            const from = highest.riverPoint!;
            from.next = target;

            if (target.rockElevation() < 0.25 && target.water > 0.002) {
                highest.riverPoint!.sink = true;
                continue;
            }

            if (target.totalElevation() < highest.totalElevation()) {
                target.riverPoint!.depth += from.depth - (highest.dirt - highest.aquifer)*0.6;
            }
        }

        this.object.add(rivers(this, 0.1));
    }

    renderObject() {
        return this.object;
    }
}