import { SimplexNoise } from "ts-perlin-simplex";
import { Field, createField } from "../field";

function point(context: CanvasRenderingContext2D, x: number, y: number, value: number) {
    let color = (~~(value * 255)).toString(16);
    if (color.length === 1) {
        color = "0" + color;
    }
    context.fillStyle = "#" + color + color + color;
    context.fillRect(x * 1, y * 1, 1, 1);
}

function hex(n: number) {
    let h = (~~(n * 255)).toString(16);
    if (h.length === 1) {
        h = "0" + h;
    }
    return h;
}

function spot(context: CanvasRenderingContext2D, x: number, y: number, red: number, green: number, blue: number) {
    const r = red;
    const g = green;
    const b = blue;

    context.fillStyle = "#" + hex(r) + hex(g) + hex(b);
    context.fillRect(x * 1, y * 1, 1, 1);
}


function createSimulator(heights: Field, waters: Field) {
    const size = heights.size;

    const velx = createField(size);
    const vely = createField(size);
    const silt = createField(size);

    function total(x: number, y: number) {
        return heights.get(x, y) + waters.get(x,y);
    }
    
    for (let i = 0; i < size; ++i)
    for (let j = 0; j < size; ++j) {
        waters.set(i,j, 0.2);
    }

    function step() {
        // Rain and evaporate
        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
            const center = waters.get(i,j);

            if (center < 0.2) {
                //waters.set(i,j, center + 0.001);
            } else if (center > 0.4) {
                //waters.set(i,j, center - 0.001);
            }
        }

        // Add velocities
        for (let x = 0; x < size; ++x)
        for (let y = 0; y < size; ++y) {
            const w = waters.get(x,y);
            const vx = (total(x + 1, y) - total(x - 1, y)) *  w;
            const vy = (total(x, y + 1) - total(x, y - 1)) *  w;

            if (vx !== vx || vy !== vy)
                debugger;

            velx.set(x, y, vx);
            vely.set(x, y, vy);
        }

        // Move water
        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
            const x = ~~(Math.random() * size);
            const y = ~~(Math.random() * size);

            const vx = ~~(velx.get(x, y)*400);
            const vy = ~~(vely.get(x, y)*400);

            const transfer = waters.get(x, y)*0.05;
            
            waters.set(x,y, waters.get(x, y) - transfer);
            waters.set(x + vx,y + vy, waters.get(x + vx, y + vy) + transfer);
        }

        // Transfer silt
        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
            const x = i;//~~(Math.random() * size);
            const y = j;//~~(Math.random() * size);
            const vx = velx.get(x,y);
            const vy = vely.get(x,y);
            const speed2 = Math.sqrt(vx*vx + vy*vy);

            const carry = speed2 * 2.1;

            const siltCenter = silt.get(x,y);
            let transfer = carry - siltCenter;

            if (transfer < 0) {
                transfer = Math.min(transfer, heights.get(x,y));
            } else {
                transfer = Math.max(transfer, siltCenter);
            }

            heights.set(x,y, heights.get(x, y) - transfer);
            silt.set(x,y, siltCenter + transfer);
        }

        // Move silt
        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
            const x = ~~(Math.random() * size);
            const y = ~~(Math.random() * size);

            const vx = velx.get(x,y)*0.3;
            const vy = vely.get(x,y)*0.3;

            if (vx !== vx || vy !== vy)
                debugger;

            silt.set(x+1, y, silt.get(x+1, y) - vx);
            silt.set(x-1, y, silt.get(x-1, y) + vx);

            silt.set(x, y+1, silt.get(x, y+1) - vy);
            silt.set(x, y-1, silt.get(x, y-1) + vy);
        }
    }

    return {
        step,
        velx,
        vely,
        silt
    }
}

function rain(x: number, y: number, heights: Field, hardness: Field) {
    const ix = ~~x;
    const iy = ~~y;

    const center = heights.get(ix, iy);
    const factor = hardness.get(ix, iy)*0.02;

    let remove = 0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
        const off = heights.get(ix + dx, iy + dy);
        const slope = off - center;
        if (slope < 0) {
            remove += factor;
            heights.set(ix + dx, iy + dy, off + factor);
        }
    });
    heights.set(ix, iy, center - remove);


    /*let silt = 0;
    for (let i = 0; i < 200; ++i) {
        const ix = ~~x;
        const iy = ~~y;
        const start = heights.get(ix,iy);
        const factor = hardness.get(ix,iy)*0.0001;//hardness.get(ix, iy);

        if (start > factor) {
            heights.set(ix,iy, start - factor);
            silt += factor;
        }

        const [dx, dy] = heights.gradient(ix,iy);
        const l = Math.sqrt(dx * dx + dy * dy);

        if (l < 0.01) {
            break;
        }

        const delta = [dx / l, dy / l];
        x -= delta[0] * 1.7;
        y -= delta[1] * 1.7;
    }
    
    for (let i = 0; i < 20; ++i) {
        const ix = ~~x;
        const iy = ~~y;
        const start = heights.get(ix,iy);
        const factor = silt *0.2;//hardness.get(ix, iy);

        heights.set(ix,iy, start + factor);
        silt -= factor;

        const [dx, dy] = heights.gradient(ix,iy);
        const l = Math.sqrt(dx * dx + dy * dy);

        const delta = [dx / l, dy / l];
        x -= delta[0] * 1.7;
        y -= delta[1] * 1.7;
    }

    heights.set(~~x, ~~y, heights.get(~~x, ~~y) + silt);*/
}

export function generateMap(size: number) {
    const heights = createField(size);
    const hardness = createField(size);
    const water = createField(size);
    
    const kernelSize = ~~(size/2);
    const rangePoints = [
        [50,50],
        [50,50],
    ];

    const kernel = createField(kernelSize);
    for (let j = 0; j < kernelSize; ++j)
    for (let i = 0; i < kernelSize; ++i)
    {
        const dx = i - kernelSize/2;
        const dy = j - kernelSize/2;
        const level = Math.max((kernelSize/2 - Math.sqrt(dx * dx + dy * dy)) / (kernelSize/2), 0)*0.6;
        kernel.set(i, j, level);
    }

    let velocities = [
        [1,1],
        [1,1],
    ];
    for (let i = 0; i < 100; ++i) {
        const l = rangePoints.length;
        for (let j = 0; j < l; ++j) {
            const rangePoint = rangePoints[j];
            const velocity = velocities[j];

            heights.operate(rangePoint[0], rangePoint[1], kernel, (a,b) => Math.max(a,b));

            velocity[0] += Math.random() * 0.2 - 0.1;
            velocity[1] += Math.random() * 0.2 - 0.1;
            const l = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
            velocity[0] = velocity[0] / l * 1;
            velocity[1] = velocity[1] / l * 1;
            rangePoint[0] += velocity[0];
            rangePoint[1] += velocity[1];
        }
    }

    const simplex = new SimplexNoise();
    for (let i = 0; i < size; ++i)
    for (let j = 0; j < size; ++j) {
        hardness.set(i,j, 
            (simplex.noise(j * 0.0002, i * 0.0002) * 0.4 + 0.2) +
            (simplex.noise(j * 0.002, i * 0.002) * 0.2 + 0.1));
        //heights.set(i,j,
            //heights.get(i,j) + 0.1 + Math.random() * 0.1 +
            //(simplex.noise(j * 0.0002, i * 0.0002) * 0.2 + 0.1) +
            //(simplex.noise(j * 0.002, i * 0.002) * 0.1 + 0.05))
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#000";
    context.fillRect(0,0, size, size);

    const { step, velx, vely, silt } = createSimulator(heights, water);

    function frame() {
        /*
        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
            rain(Math.random() * size, Math.random() * size, heights, hardness);
        }*/
        for (let i = 0; i < 1; ++i)
        step();

        for (let i = 0; i < size; ++i)
        for (let j = 0; j < size; ++j) {
    const vx = velx.get(i,j);
    const vy = vely.get(i,j);
    const speed = vx*vx + vy*vy;
            spot(context, i,j, vx*vx, vy*vy, water.get(i,j));
        } 
        requestAnimationFrame(frame);
    }
    frame();

    


    document.body.appendChild(canvas);
}