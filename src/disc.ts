import RBush from "rbush";
import { SimplexNoise } from "ts-perlin-simplex";
import { GenPoint } from "./map/GenPoint";
import { clamp } from "./math";

const noise = new SimplexNoise();

export function createDiscSampler(radius: number, onadd: (point: GenPoint) => void, seeds?: {x:number,y:number}[]) {
    const points = new RBush<GenPoint>();

    const actives = new Set<GenPoint>();

    const firsts = seeds?.map((s, i) => new GenPoint(
        s.x,
        s.y,
        i % 3 === 0 ? 1 : 0
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
                const length = (30 + Math.random() * 140)/radius;
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

            const next = Array.from(actives)[~~(Math.random() * actives.size)];
            const { x: rx, y: ry, elevation } = next;

            for (let i = 0; i < 10; ++i) {
                const angle = Math.random() * 2 * Math.PI;
                let l = Math.random() * radius + radius;
                const dx = Math.cos(angle) * l;
                const dy = Math.sin(angle) * l;

                const factor = (Math.random() - 0.41)*elevation * (noise.noise(rx*0.002,ry*0.002)*0.5 + 1);
                if (filter(rx + dx, ry + dy) && !near(rx + dx, ry + dy)) {

                    const create = new GenPoint(
                        rx + dx,
                        ry + dy, 
                        clamp(elevation - factor, 0, 1)
                    );
                    points.insert(create);
                    actives.add(create);
                    onadd(create);
                }
            }

            actives.delete(next);
            return true;
        },
        points
    }
}