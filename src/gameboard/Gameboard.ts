import * as THREE from "three";
import { gaussianRandom, sum, sumBy } from "../math";
import { Vertices } from "../terrain/Graph";
import { TileSet } from "../terrain/PointSet";
import { createDiscSampler } from "../terrain/discSampler";

export class Gameboard {
    vertices: Vertices;
    object: THREE.Object3D;
    radius: number;

    constructor(original: TileSet, discRadius: number, searchRadius: number) {
        this.radius = discRadius;
        const sampler = createDiscSampler(discRadius, (x, y) => {
            return original.vertices.points.search({
                maxX: x + searchRadius,
                minX: x - searchRadius,
                maxY: y + searchRadius,
                minY: y - searchRadius,
            }).some((p => {
                if (original.rockElevation(p.index) < 0.25) {
                    return false;
                }
                const px = original.x(p.index);
                const py = original.y(p.index);
                const dx = px - x;
                const dy = py - y;
                return dx*dx + dy*dy < searchRadius*searchRadius;
            }));
        });
        while (sampler.step());

        this.vertices = sampler.vertices();

        const positions = new Array<number>();
        for (let i = 0; i < this.vertices.count; ++i) {
            const cx = this.vertices.xys[i*2];
            const cy = this.vertices.xys[i*2+1];

            let region = original.vertices.points.search({
                maxX: cx + searchRadius*2,
                minX: cx - searchRadius*2,
                maxY: cy + searchRadius*2,
                minY: cy - searchRadius*2,
            });
            const distances = region.map(r => {
                const x = original.x(r.index);
                const y = original.y(r.index);
                const dx = x - cx;
                const dy = y - cy;
                return Math.sqrt(dx*dx + dy*dy);
            });
            region = region.filter((r, i) => {
                if (original.rockElevation(r.index) < 0.25) {
                    return false;
                }
                return distances[i] < searchRadius*2;
            });

            const elevations = region.map(r => original.rockElevation(r.index));
            const mean = sum(elevations) / elevations.length;

            const adjustedElevations = elevations.map((e,i) => {
                const factor = distances[i]/searchRadius/2;
                return e * (1 - factor) + mean * factor;
            })

            const offset = sumBy(adjustedElevations, e => e - mean) / elevations.length;

            if (offset < -0.001) {
                this.mountain(cx, cy, positions);
            } else if (offset < -0.0004) {
                this.hill(cx, cy, positions);
            } else {
                this.tree(cx, cy, positions);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 2 ) );

        this.object = new THREE.Object3D();
        const points = new THREE.LineSegments( geometry, new THREE.LineBasicMaterial({
            depthTest: false,
            color: 0x888888,
            blending: THREE.SubtractiveBlending
        }));
        points.renderOrder = 1;
        this.object.add(points);
    }

    hill(cx: number, cy: number, positions: number[]) {
        const w = this.radius/2 + gaussianRandom(0, this.radius*0.05);
        const h = this.radius/2 + gaussianRandom(0, this.radius*0.1);
        const xs = new Array<number>(8);
        const ys = new Array<number>(8);
        for (let i = 0; i < 8; ++i) {
            const rad = i/7 * Math.PI;
            xs[i] = cx + Math.cos(rad)*w + gaussianRandom(0, w*0.1);
            ys[i] = cy + Math.sin(rad)*h + gaussianRandom(0, h*0.1);
        }

        for (let i = 0; i < 7; ++i) {
            positions.push(
                xs[i], ys[i],
                xs[i+1], ys[i+1]
            )
        }
    }
    
    tree(cx: number, cy: number, positions: number[]) {
        const w = this.radius/6 + gaussianRandom(0, this.radius*0.05);
        const h = this.radius/2 + gaussianRandom(0, this.radius*0.1);

        positions.push(
            cx, cy,
            cx, cy + h,
        );

        for (let i = 0; i < 4; ++i) {
            positions.push(
                cx - w/(i/4 + 1), cy + i/4+ 0.1,
                cx + w/(i/4 + 1),  cy + i/4 + 0.1
            );
        }
    }

    mountain(cx: number, cy: number, positions: number[]) {
        const w = this.radius/2 + gaussianRandom(0, this.radius*0.05);
        const h = this.radius/2 + gaussianRandom(0, this.radius*0.1);
        const xs = new Array<number>(3);
        const ys = new Array<number>(3);
        xs[0] = cx - w;
        xs[1] = cx;
        xs[2] = cx + w;
        ys[0] = cy;
        ys[1] = cy + h;
        ys[2] = cy;

        for (let i = 0; i < 2; ++i) {
            positions.push(
                xs[i], ys[i],
                xs[i+1], ys[i+1]
            )
        }
    }

    renderObject() {
        return this.object;
    }
}