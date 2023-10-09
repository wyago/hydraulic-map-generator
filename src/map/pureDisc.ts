import RBush from "rbush";
import { BushVertex, Vertices } from "./Graph";

export function createDiscSampler(radius: (x: number, y: number) => number, filter: (x: number, y: number) => boolean): Vertices {
    const points = new RBush<BushVertex>();
    const list = new Array<{x: number, y: number}>();
    const actives = new Array<{x: number, y: number}>();

    const seed = {
        x: Math.random() * radius(0,0)*2 - radius(0,0),
        y: Math.random() * radius(0,0)*2 - radius(0,0),
    };
    list.push(seed);
    actives.push(seed);

    function near(nx: number, ny: number) {
        const r = radius(nx, ny);
        const region = points.search({
            minX: nx - r,
            minY: ny - r,
            maxX: nx + r,
            maxY: ny + r,
        });

        for (let i = 0; i < region.length; ++i) {
            const target = region[i];
            const dx = target.x - nx;
            const dy = target.y - ny;
            if (dx*dx + dy*dy < r*r) {
                return true;
            }
        }
        return false;
    }

    function makeSample(r: number, {x,y}: {x: number,y: number}) {
        const angle = Math.random() * 2 * Math.PI;
        let l = Math.random() * r + r;
        const dx = Math.cos(angle) * l;
        const dy = Math.sin(angle) * l;
        return { x: x + dx, y: y + dy };
    }

    while (actives.length) {
        const i = ~~(Math.random() * actives.length);
        const active = actives[i];
        const r = radius(active.x,active.y);

        let first = false;

        for (let i = 0; i < 7; ++i) {
            const sample = makeSample(r, active);
            if (filter(sample.x, sample.y) && !near(sample.x, sample.y)) {
                points.insert({
                    index: list.length,
                    minX: sample.x,
                    maxX: sample.x,
                    minY: sample.y,
                    maxY: sample.y,
                });
                list.push(sample);

                if (first) {
                    actives[i] = sample;
                    first = false;
                } else {
                    actives.push(sample);
                }
            }
        }

        if (first) {
            actives.splice(i, 1);
        }
    }

    return {
        points,
        xs: new Float32Array(list.map(p => p.x)),
        ys: new Float32Array(list.map(p => p.y)),
    };
}