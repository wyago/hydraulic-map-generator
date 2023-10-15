import { pointRenderer } from "../src/render/pointRenderer";
import { Vertices } from "../src/terrain/Graph";
import { TileSet } from "../src/terrain/TileSet";
import { createDiscSampler } from "../src/terrain/discSampler";

export class Gameboard {
    vertices: Vertices;

    constructor(original: TileSet, discRadius: number, searchRadius: number) {
        const sampler = createDiscSampler(discRadius, (x, y) => {
            return original.vertices.points.collides({
                maxX: x + searchRadius,
                minX: x - searchRadius,
                maxY: y + searchRadius,
                minY: y - searchRadius,
            });
        });

        while (sampler.step());

        this.vertices = sampler.vertices();
    }

    renderObject() {
        return pointRenderer(this.vertices.xys);
    }
}