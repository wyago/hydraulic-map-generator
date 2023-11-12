import * as THREE from "three";
import { Graph } from "../terrain/Graph";
import { TileSet } from "../terrain/PointSet";
import { River } from "./River";
import { Tile } from "./Tile";
import { makeName } from "./names";

export class Gameboard {
    object: THREE.Object3D;
    tiles: Tile[];
    rivers: River[];
    graph: Graph;

    constructor(original: TileSet) {
        this.object = new THREE.Object3D();
        this.graph = original.graph;
        this.tiles = new Array<Tile>(original.count);
        for (let i = 0; i < original.count; ++i) {
            this.tiles[i] = new Tile(original, i);
        }
        this.rivers = [];
        makeName();
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
        this.rivers.forEach(river => river.setScale(scale));
    }

    deriveRivers() {
        const indices = this.getSprings();
        indices.sort((a, b) => b.totalElevation() - a.totalElevation());
        indices.forEach(x => x.river.depth = 0.06 * x.exposure + x.snow*0.05 + 30*x.spill(this.tiles));

        const checked = new Set<Tile>();
        const springs = new Array<Tile>();

        for (let i = 0; i < indices.length; ++i) {
            const center = indices[i];
            if (!checked.has(center) && center.river.depth > 0.5) {
                springs.push(center);
            }
            checked.add(center);

            const downhill = center.downhill(this.tiles);

            center.river.next = downhill;

            if (downhill.rockElevation() < 0.25 && downhill.water > 0.002) {
                continue;
            }

            if (downhill.totalElevation() < center.totalElevation()) {
                downhill.river.depth += center.river.depth - (downhill.dirt - downhill.aquifer);
            }
        }

        const assigned = new Set<Tile>();
        for (let i = 0; i < springs.length; ++i) {
            const spring = springs[i];
            if (assigned.has(spring)) {
                continue;
            }

            const river = new River();

            let current: Tile | undefined = spring;
            while (current && current.river.depth > 0.5 && !assigned.has(current)) {
                assigned.add(current);
                river.tiles.push(current);
                current.features.push(river);
                current = current.river.next;
            }

            if (current) {
                river.tiles.push(current);
                current.features.push(river);
            }

            river.initialize();

            this.rivers.push(river);
            this.object.add(river.renderObject);
        }
    }

    renderObject() {
        return this.object;
    }
}