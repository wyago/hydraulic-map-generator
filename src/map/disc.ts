import RBush from "rbush";
import { SimplexNoise } from "ts-perlin-simplex";
import { GenPoint } from "./GenPoint";

const noise = new SimplexNoise();

export function createDiscSampler(radius: (x: number, y: number) => number, seeds?: GenPoint[]) {
    const points = new RBush<GenPoint>();
    const list = new Array<GenPoint>();

    const actives = new Array<GenPoint>();

    const firsts = seeds || [];
    points.load(firsts);
    firsts.forEach(f => actives.push(f));

    function near(nx: number, ny: number) {
        const r = radius(nx, ny);
        const region = points.search({
            minX: nx - r,
            minY: ny - r,
            maxX: nx + r,
            maxY: ny + r,
        });
        return region.some(({ x, y }) => {
            const dx = x - nx;
            const dy = y - ny;
            return dx*dx + dy*dy < r*r;
        });
    }

    return {
        add(sample: GenPoint) {
            points.insert(sample);
            list.push(sample);
            if (sample.elevation > 0)
                actives.push(sample);
        },
        mountainStep(inX?: number, inY?: number) {
            let rootAngle = Math.random() * 1 - 0.5;

            if (actives.length === 0) {
                return false;
            }

            let rx = 0;
            let ry = 0;

            if (!inX || !inY) {
                const i = ~~(Math.random() * actives.length);
                const active = actives[i];
                const r = radius(active.x,active.y);

                const rx = active.x;
                const ry = active.y;

                for (let i = 0; i < 7; ++i) {
                    const angle = Math.random() * 2 * Math.PI;
                    let l = Math.random() * r + r;
                    const dx = Math.cos(angle) * l;
                    const dy = Math.sin(angle) * l;
            
                    if (!near(rx + dx, ry + dy)) {
                        rootAngle = angle;
                        break;
                    }
                }
            } else {
                rx = inX;
                ry = inY;
            }


            function iteration(angle: number, x: number, y: number) {
                const r = radius(x, y);
                const length = (10 + Math.random() * (inX ? 1500 : 1580))/r;
                for (let i = 0; i < length; ++i) {
                    let l = Math.random() * r*1 + r*1;
                    let dx = Math.cos(angle) * l;
                    let dy = Math.sin(angle) * l;
                    const region = points.search({
                        minX: x - 100,
                        minY: y - 100,
                        maxX: x + 100,
                        maxY: y + 100,
                    });
                    region.forEach(o => {
                        dx -= (o.x - x)*0.04;
                        dy -= (o.y - y)*0.04;
                    })

                    x += dx;
                    y += dy;

                    if (!near(x, y)) {
                        const create = new GenPoint(
                            x,
                            y, 
                            "mountain",
                            (inX ? 1 - Math.random() * 0.2 : 1)
                        );
                        points.insert(create);
                        list.push(create);
                        actives.push(create);
                    } else {
                        break;
                    }

                    angle += Math.random() * 0.2 - 0.1;
                }

                return { x, y };
            }

            iteration(rootAngle, rx, ry);

            return true;
        },
        step(filter: (x: number, y: number) => boolean) {
            if (actives.length === 0) {
                return false;
            }

            const i = ~~(Math.random() * actives.length);
            const active = actives[i];
            const r = radius(active.x,active.y);

            for (let i = 0; i < 7; ++i) {
                const sample = active.sample(r);
                if (filter(sample.x, sample.y) && !near(sample.x, sample.y)) {
                    points.insert(sample);
                    list.push(sample);
                    if (sample.elevation > 0)
                        actives.push(sample);
                }
            }

            actives.splice(i, 1);
            return true;
        },
        points,
        list
    }
}