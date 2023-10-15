import RBush from "rbush";
import { BushVertex, Vertices } from "./Graph";

export function createDiscSampler(radius: number, filter: (x: number, y: number) => boolean) {
    let count = 1;
    let points = new RBush<BushVertex>(9);
    let xys = new Float32Array(1024*2);

    const actives: number[] = [0];

    xys[0] = Math.random() * radius*2 - radius;
    xys[1] = Math.random() * radius*2 - radius;

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
            const dx = xys[target.index*2] - nx;
            const dy = xys[target.index*2+1] - ny;
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
        sample.x = xys[index*2] + dx;
        sample.y = xys[index*2+1] + dy;
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
                if (count >= xys.length / 2) {
                    const capacity = xys.length * 2;
                    const newxys = new Float32Array(capacity);
                    newxys.set(xys);
                    xys = newxys;
                }

                xys[count*2] = sample.x;
                xys[count*2+1] = sample.y;
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
                xys: xys.subarray(0, count*2),
            }
        }
    };
}