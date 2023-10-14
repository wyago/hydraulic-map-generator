import RBush from "rbush";
import { BushVertex, Vertices } from "./Graph";

export function createDiscSampler(radius: number, filter: (x: number, y: number) => boolean) {
    let count = 1;
    let points = new RBush<BushVertex>(9);
    let xs = new Float32Array(1024);
    let ys = new Float32Array(1024);

    const actives: number[] = [0];

    xs[0] = Math.random() * radius*2 - radius;
    ys[0] = Math.random() * radius*2 - radius;

    function near(nx: number, ny: number) {
        const r = radius;
        const region = points.search({
            minX: nx - r,
            minY: ny - r,
            maxX: nx + r,
            maxY: ny + r,
        });

        for (let i = 0; i < region.length; ++i) {
            const target = region[i];
            const dx = xs[target.index] - nx;
            const dy = ys[target.index] - ny;
            if (dx*dx + dy*dy < r*r) {
                return true;
            }
        }
        return false;
    }

    let sample = {x:0,y:0};
    function makeSample(r: number, index) {
        const angle = Math.random() * 2 * Math.PI;
        let l = Math.random() * r + r;
        const dx = Math.cos(angle) * l;
        const dy = Math.sin(angle) * l;
        sample.x = xs[index] + dx;
        sample.y = ys[index] + dy;
    }

    function step() {
        if (actives.length === 0) {
            return false;
        }
        const i = ~~(Math.random() * actives.length);
        const active = actives[i];
        const r = radius;

        for (let i = 0; i < 7; ++i) {
            makeSample(r, active);
            if (filter(sample.x, sample.y) && !near(sample.x, sample.y)) {
                if (count >= xs.length) {
                    const capacity = xs.length * 2;
                    const newxs = new Float32Array(capacity);
                    const newys = new Float32Array(capacity);
                    newxs.set(xs);
                    newys.set(ys);
                    xs = newxs;
                    ys = newys;
                }

                xs[count] = sample.x;
                ys[count] = sample.y;
                points.insert({
                    index: count,
                    minX: sample.x - r,
                    maxX: sample.x + r,
                    minY: sample.y - r,
                    maxY: sample.y + r,
                });

                actives.push(count);
                count += 1;
            }
        }

        actives.splice(i, 1);
        return true;
    }

    return {
        step,
        vertices(): Vertices {
            count -= 1;
            return {
                points,
                count,
                xs: xs.subarray(0, count),
                ys: ys.subarray(0, count),
            }
        }
    };
}