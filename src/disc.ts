import RBush from "rbush";
import { SimplexNoise } from "ts-perlin-simplex";
import { GenPoint } from "./map/GenPoint";

const noise = new SimplexNoise();

export function createDiscSampler(radius: number, onadd: (point: GenPoint) => void, seeds?: {x:number,y:number}[]) {
    const points = new RBush<GenPoint>();

    const actives = new Set<GenPoint>();

    const firsts = seeds?.map((s, i) => new GenPoint(
        s.x,
        s.y,
        i % 3 === 0 ? "mountain" : "ocean",
        1
    )) || [];
    points.load(firsts);
    firsts.forEach(f => actives.add(f));

    function near(nx: number, ny: number) {
        const r = radius;
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
        mountainStep(rx: number, ry: number) {
            const rootAngle = Math.random() * 2 * Math.PI;

            function iteration(angle: number, x: number, y: number) {
                const length = (270 + Math.random() * 380)/radius;
                for (let i = 0; i < length; ++i) {
                    const l = Math.random() * radius + radius;
                    const dx = Math.cos(angle) * l;
                    const dy = Math.sin(angle) * l;
                    x += dx;
                    y += dy;

                    if (!near(x, y)) {
                        const create = new GenPoint(
                            x,
                            y, 
                            "mountain",
                            1
                        );
                        points.insert(create);
                        actives.add(create);
                        onadd(create);
                    } else {
                        break;
                    }

                    angle += Math.random() * 0.5 - 0.25;
                }

                return { x, y };
            }

            iteration(rootAngle, rx, ry);
            iteration(rootAngle + Math.PI/2 + Math.random(), rx, ry);
            iteration(rootAngle + Math.PI, rx, ry);

            return true;
        },
        step(filter: (x: number, y: number) => boolean) {
            if (actives.size === 0) {
                return false;
            }

            const active = Array.from(actives)[~~(Math.random() * actives.size)];

            for (let i = 0; i < 10; ++i) {
                const sample = active.sample(radius);
                if (filter(sample.x, sample.y) && !near(sample.x, sample.y)) {
                    points.insert(sample);
                    actives.add(sample);
                    onadd(sample);
                }
            }

            actives.delete(active);
            return true;
        },
        points
    }
}