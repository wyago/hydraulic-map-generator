import RBush from "rbush";
import { SimplexNoise } from "ts-perlin-simplex";

export type Point = {
    x: number,
    y: number,
    type: "ocean" | "land" | "mountain" | "hills";
}

function point({x,y, type}: Point): Point {
    return {
        x,
        y,
        type,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y,
    } as Point;
}

const noise = new SimplexNoise();

export function createDiscSampler(radius: number, onadd: (point: Point) => void, seeds?: {x:number,y:number}[]) {
    const points = new RBush<Point>();

    const actives = new Set<Point>();

    const firsts = seeds?.map((s, i) => point({
        x: s.x,
        y: s.y,
        type: i % 3 === 0 ? "land" : "ocean"
    })) || [];
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
                const length = (30 + Math.random() * 240)/radius;
                for (let i = 0; i < length; ++i) {
                    const l = Math.random() * radius + radius;
                    const dx = Math.cos(angle) * l;
                    const dy = Math.sin(angle) * l;
                    x += dx;
                    y += dy;

                    if (!near(x, y)) {
                        const create = point({
                            x,
                            y, 
                            type:  "mountain" 
                        });
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
            const { x: rx, y: ry, type } = next;

            for (let i = 0; i < 10; ++i) {
                const angle = Math.random() * 2 * Math.PI;
                let l = Math.random() * radius + radius;
                const dx = Math.cos(angle) * l;
                const dy = Math.sin(angle) * l;

                l *= 3 * (noise.noise((rx + dx)*0.001, (ry + dy)*0.001) + 1);
                if (filter(rx + dx, ry + dy) && !near(rx + dx, ry + dy)) {
                    let nextType = type;
                    if (type === "land" && Math.random() < l*0.004) {
                        nextType = "hills";
                    }
                    if (type === "land" && Math.random() < l*0.007) {
                        nextType = "ocean";
                    }
                    if (type === "ocean" && Math.random() < l*0.0005) {
                        nextType = "land";
                    }
                    if (type === "mountain" && Math.random() < l * 0.03) {
                        nextType = "hills";
                    }
                    if (type === "hills" && Math.random() < l * 0.02) {
                        nextType = "land";
                    }

                    const create = point({
                        x: rx + dx,
                        y: ry + dy, 
                        type: nextType
                    });
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