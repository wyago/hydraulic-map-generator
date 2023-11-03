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
            
            if (tile.rockElevation() < 0.25 || tile.aquifer < 0.0001) {
                continue;
            }

            result.push(tile);
        }
        return result;
    }

    deriveRivers() {
        const boundary = this.getSprings();
        boundary.sort((a, b) => a.rockElevation() - b.rockElevation());

        boundary.forEach(x => x.riverPoint = new RiverPoint(0.1, 0.5, true, false));

        while (boundary.length > 0) {
            const highest = boundary[boundary.length - 1];
            boundary.splice(boundary.length - 1, 1);

            const target = highest.downhill(this.tiles);
            const from = highest.riverPoint!;
            from.next = target;

            if (target.rockElevation() < 0.25) {
                highest.riverPoint!.sink = true;
                continue;
            }

            if (target.riverPoint) {
                target.riverPoint.depth += from.depth;
            } else {
                const ratio = highest.aquifer/highest.dirt;
                if (Number.isFinite(ratio)) {
                    target.riverPoint = new RiverPoint(from.width, Math.max(from.depth + (ratio - 0.9)*0.05, 0.1), false, false);
                } else {
                    target.riverPoint = new RiverPoint(from.width, from.depth, false, false);
                }
                boundary.push(target);
            }
            
            boundary.sort((a, b) => a.rockElevation() - b.rockElevation());
        }

        this.object.add(rivers(this));
    }

    renderObject() {
        return this.object;
    }
}