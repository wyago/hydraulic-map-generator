import * as THREE from "three";
import { TileSet as PointSet } from "../terrain/PointSet";
import { River } from "./River";

export class Gameboard {
    object: THREE.Object3D;
    points: PointSet;
    rivers: River[];

    constructor(original: PointSet) {
        this.object = new THREE.Object3D();
        this.points = original;
        this.rivers = [];
    }

    marshal() {
        return {
            gameboardversion: "0",
            points: this.points.marshal(),
            rivers: this.rivers.map(r => r.marshal(this.rivers))
        }
    }

    getSprings() {
        const result = new Array<number>();
        for (let i = 0; i < this.points.count; ++i) {
            if (this.points.rockElevation(i) < 0.25 && this.points.water[i] > 0.002) {
                continue;
            }

            result.push(i);
        }
        return result;
    }

    setRiverScale(scale: number) {
        this.rivers.forEach(river => river.setScale(scale));
    }

    deriveRivers() {
        const indices = this.getSprings();
        indices.sort((a, b) => this.points.totalElevation(b) - this.points.totalElevation(a));
        indices.forEach(x => this.points.river[x] = 0.02 * this.points.exposure(x) + 0.1*this.points.spill(x));

        const checked = new Set<number>();
        const springs = new Array<number>();

        for (let i = 0; i < indices.length; ++i) {
            const center = indices[i];
            if (!checked.has(center) && this.points.river[center] > 0.2) {
                springs.push(center);
            }
            checked.add(center);

            const downhill = this.points.downhill(center);

            if (this.points.rockElevation(downhill) < 0.25 && this.points.water[downhill] > 0.002) {
                continue;
            }

            if (this.points.totalElevation(downhill) < this.points.totalElevation(center)) {
                this.points.river[downhill] += this.points.river[center];
            }
        }

        const assigned = new Set<number>();
        for (let i = 0; i < springs.length; ++i) {
            const spring = springs[i];
            if (assigned.has(spring)) {
                continue;
            }

            const river = new River();

            let current: number | undefined = spring;
            while (current !== undefined && this.points.river[current] > 0.5 && !assigned.has(current)) {
                assigned.add(current);
                river.tiles.push(current);
                current = this.points.downhill(current);
            }

            if (current) {
                river.tiles.push(current);
            }

            river.initialize(this.points);

            this.rivers.push(river);
            this.object.add(river.renderObject);
        }
    }

    renderObject() {
        return this.object;
    }
}