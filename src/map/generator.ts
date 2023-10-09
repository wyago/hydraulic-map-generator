import { createDiscSampler } from "./disc";

import { SimplexNoise } from "ts-perlin-simplex";
import { GenPoint } from "../map/GenPoint";

const noiseC = new SimplexNoise();
function makePlates(size: number, plateRadius: number) {
    const {step: plateStep, points: plates} = createDiscSampler((x,y) => {
        return plateRadius;
    }, [new GenPoint(
        Math.random() * plateRadius - plateRadius/2,
        Math.random() * plateRadius - plateRadius/2,
        "mountain",
        1
    )]);
    while (plateStep((x,y) => {
        return x*x*0.1 + y*y*0.5 < Math.pow(size, 2);
    }));

    return plates.all().filter(x => Math.random() < 0.4);
}

const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
export function generateMap(size: number) {
    const radius = 8;

    function filter(x, y) {
        return x*x*0.1 + y*y*0.5 < Math.pow(size*3, 2);
    }

    const plates = makePlates(size*2, radius * 400);

    const {step, mountainStep, list, add} = createDiscSampler(() => radius, [new GenPoint(
        Math.random()*radius*2 - radius,
        Math.random()*radius*2 - radius,
        "mountain",
        1
    )]);

    for (let i = 0; i < 1; ++i) {
        mountainStep(
            Math.random() * radius * 200 - radius*100,
            Math.random() * radius * 200 - radius*100
        );
    }

    plates.forEach(p => {
        mountainStep(
            p.x,
            p.y
        );
    })

    return {
        step() {
            return step(filter);
        },
        count() {
            return list.length;
        },
        graph() {
            return list;
        }
    }
}