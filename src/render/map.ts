import { SimplexNoise } from "ts-perlin-simplex";
import { createDiscSampler } from "../disc";

import Delaunator from "delaunator";
import RBush from "rbush";
import { GenPoint } from "../map/GenPoint";

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
    context.fillRect(x * 1, y * 1, 2, 2);
}

function pix(context: CanvasRenderingContext2D, x: number, y: number, style: string) {
    context.fillStyle = style;
    context.fillRect(x * 1, y * 1, 2, 2);
}


function graph(context: CanvasRenderingContext2D, points: RBush<GenPoint>, radius: number, size: number) {
    const all = points.all();

    const source = all.map(a => ([a.x, a.y]));

    function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
    const delaunay = Delaunator.from(source);
    function forEachTriangleEdge(callback: (p: GenPoint, q: GenPoint) => void) {
        for (let e = 0; e < delaunay.triangles.length; e++) {
            if (e > delaunay.halfedges[e]) {
                const p = delaunay.triangles[e];
                const q = delaunay.triangles[nextHalfedge(e)];
                callback(all[p], all[q]);
            }
        }
    }

    context.fillStyle = "#000";
    forEachTriangleEdge((p,q) => {
        if (p.type() === "land") {
            context.strokeStyle = "#373";
        } else if (p.type() === "mountain") {
            context.strokeStyle = "#753";
        } else {
            context.strokeStyle = "#338";
        }
        context.beginPath();
        context.moveTo(p[0] + size/2, p[1] + size/2);
        context.lineTo(q[0] + size/2, q[1] + size/2);
        context.stroke(); 
    });

    /*all.forEach(a => {
        const region = points.search({
            minX: a.x - radius*2,
            minY: a.y - radius*2,
            maxX: a.x + radius*2,
            maxY: a.y + radius*2
        }).filter(x => x !== a);

        if (region.length > 1)
        for (let i = 0; i < region.length; ++i) {
            const b = region[i];
            const center: Point = {
                x: (a.x + b.x)/2,
                y: (a.y + b.y)/2,
                isLand: true
            };
            //if (distance(a, b) < radius*radius*1.5*1.5) {
            if (distance(a, b)/2 <
                region
                    .filter(x => x !== b)
                    .map(c => distance(center, c))
                    .reduce((x,y) => Math.min(x,y))) {
                context.strokeStyle = "#0005";
                context.fillStyle = "#000";

                context.beginPath();
                context.moveTo(a.x + size/2, a.y + size/2);
                context.lineTo(b.x + size/2, b.y + size/2);
                context.stroke();
            }

        }
    });*/
}

const noiseA = new SimplexNoise();
const noiseB = new SimplexNoise();
const noiseC = new SimplexNoise();

function render(context: CanvasRenderingContext2D, cx: number, cy: number, renderRadius: number, radius: number, points: RBush<GenPoint>, size: number) {
    /*const all = points.all();
    const source = all.map(a => ([a.x, a.y]));

    function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
    const delaunay = Delaunator.from(source);
    function forEachTriangleEdge(callback: (p: Point, q: Point) => void) {
        for (let e = 0; e < delaunay.triangles.length; e++) {
            if (e > delaunay.halfedges[e]) {
                const p = delaunay.triangles[e];
                const q = delaunay.triangles[nextHalfedge(e)];
                callback(all[p], all[q]);
            }
        }
    }

    context.clearRect(0, 0, size, size);
    context.fillStyle = "#000";
    forEachTriangleEdge((p,q) => {
        if (p.isLand) {
            context.strokeStyle = "#373";
        } else {
            context.strokeStyle = "#338";
        }
        context.beginPath();
        context.moveTo(p.x + size/2, p.y + size/2);
        context.lineTo(q.x + size/2, q.y + size/2);
        context.stroke(); 
    });*/
    const ix = ~~cx;
    const iy = ~~cy;

    for (let x = ix - renderRadius; x < ix + renderRadius; ++x) 
    for (let y = iy - renderRadius; y < iy + renderRadius; ++y)  {
        let nearest = Number.MAX_VALUE;
        let finalType = "ocean";
        let any = false;
        const modulus = noiseC.noise(0.005 * x, 0.005 * y)*0.5 + 0.5;
        //const ax = x + (noiseA.noise(0.01 * x, 0.01 * y) * 20 +
        //noiseA.noise(0.05 * x, 0.05 * y) * 3 +
        //noiseA.noise(0.1 * x, 0.1 * y) * 1)*modulus;
        //const ay = y + (noiseB.noise(0.01 * x, 0.01 * y) * 20 +
        //noiseB.noise(0.05 * x, 0.05 * y) * 3 +
        //noiseB.noise(0.1 * x, 0.1 * y) * 1)*modulus;
        const ax = x;
        const ay = y;
        const region = points.search({
            minX: ax - radius*2,
            minY: ay - radius*2,
            maxX: ax + radius*2,
            maxY: ay + radius*2
        });
        region.forEach(point => {
            const dx = point.x - ax;
            const dy = point.y - ay;
            const d = dx*dx + dy*dy ;
            if (d < nearest) {
                nearest = d;
                finalType = point.type();
                any = true;
            }
        })

        let style = "#333444";
        if (finalType !== "ocean") {
            style = "#aba055"
        }

        pix(context, x + size/2, y + size/2, style);
    }
}

export function generateMap(size: number) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#000";
    context.fillRect(0,0, size, size);
    const radius = 8;

    function filter(x, y) {
        return x*x + y*y < Math.pow(size/2, 2);
    }

    const plateRadius = radius * 50;
    const {step: plateStep, points: plates} = createDiscSampler(plateRadius, () => {
    }, [{x:Math.random() * plateRadius - plateRadius/2,y: Math.random() * plateRadius - plateRadius/2}]);
    while (plateStep((x,y) => {
        return x*x + y*y < Math.pow(size, 2);
    }));

    context.fillStyle = "#fff";
    const {step, mountainStep, points} = createDiscSampler(radius, (point) => {
        render(context, point.x, point.y, radius*1.5, radius, points, size);
    });//, plates.all().map(p => ({x: p.x, y: p.y })));

    plates.all().forEach(p => {
        mountainStep(p.x, p.y);
    })

    let current = 0;
    function frame() {
        current += 1;
        for(let i = 0; i < 50; ++i) {
            if (!step(filter)) {
                const mountain = document.getElementById("mountain") as HTMLCanvasElement;
                const hills = document.getElementById("hills") as HTMLCanvasElement;
                points.all().forEach(p => {
                    const factor = p.relativeElevation()*0.7 + 0.7;
                    if (p.type() === "mountain") 
                        context.drawImage(mountain, p.x + size/2 - radius/2*factor, p.y + size/2 - radius/2*factor, radius*factor, radius*factor);
                    if (p.type() === "hills") 
                        context.drawImage(hills, p.x + size/2 - radius/2*factor, p.y + size/2 - radius/2*factor, radius*factor, radius*factor);
                });
                //graph(context, points, radius, size);
                return;
            }
        }
        requestAnimationFrame(frame);
    }

    frame();

    document.body.appendChild(canvas);
}