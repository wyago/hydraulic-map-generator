import { SimplexNoise } from "ts-perlin-simplex";
import { createDiscSampler } from "../disc";

import Delaunator from "delaunator";
import RBush from "rbush";
import { GenPoint } from "../map/GenPoint";
import { clamp } from "../math";

function hex(n: number) {
    let h = (~~(clamp(n, 0, 1) * 255)).toString(16);
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

function distance(a: {x: number, y: number}, b: {x: number, y: number}) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
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
    function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }

function pointsOfTriangle(delaunay, t) {
    return edgesOfTriangle(t)
        .map(e => delaunay.triangles[e]);
}

function forEachTriangle(points, delaunay, callback) {
    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
        callback(t, pointsOfTriangle(delaunay, t).map(p => points[p]));
    }
}

function triangleOfEdge(e)  { return Math.floor(e / 3); }

function trianglesAdjacentToTriangle(delaunay, t) {
    const adjacentTriangles: number[] = [];
    for (const e of edgesOfTriangle(t)) {
        const opposite = delaunay.halfedges[e];
        if (opposite >= 0) {
            adjacentTriangles.push(triangleOfEdge(opposite));
        }
    }
    return adjacentTriangles;
}
function circumcenter(a, b, c) {
    /*const ad = a[0] * a[0] + a[1] * a[1];
    const bd = b[0] * b[0] + b[1] * b[1];
    const cd = c[0] * c[0] + c[1] * c[1];
    const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    return [
        1 / D * (ad * (b[1] - c[1]) + bd * (c[1] - a[1]) + cd * (a[1] - b[1])),
        1 / D * (ad * (c[0] - b[0]) + bd * (a[0] - c[0]) + cd * (b[0] - a[0])),
    ];*/
    return [
        (a[0] + b[0] + c[0])/3,
        (a[1] + b[1] + c[1])/3
    ]
}  
function triangleCenter(points, delaunay, t) {
    const vertices = pointsOfTriangle(delaunay, t).map(p => points[p]);
    return circumcenter(vertices[0], vertices[1], vertices[2]);
}
function forEachVoronoiEdge(points, delaunay, callback) {
    for (let e = 0; e < delaunay.triangles.length; e++) {
        if (e < delaunay.halfedges[e]) {
            const p = triangleCenter(points, delaunay, triangleOfEdge(e));
            const q = triangleCenter(points, delaunay, triangleOfEdge(delaunay.halfedges[e]));
            callback(p, q);
        }
    }
}
function edgesAroundPoint(delaunay, start) {
    const result: any[] = [];
    let incoming = start;
    do {
        result.push(incoming);
        const outgoing = nextHalfedge(incoming);
        incoming = delaunay.halfedges[outgoing];
    } while (incoming !== -1 && incoming !== start);
    return result;
}
function forEachVoronoiCell(points, delaunay, callback) {
    const seen = new Set();  // of point ids
    for (let e = 0; e < delaunay.triangles.length; e++) {
        const p = delaunay.triangles[nextHalfedge(e)];
        if (!seen.has(p)) {
            seen.add(p);
            const edges = edgesAroundPoint(delaunay, e);
            const triangles = edges.map(triangleOfEdge);
            const vertices = triangles.map(t => triangleCenter(points, delaunay, t));
            callback(p, vertices);
        }
    }
}
    context.strokeStyle = "#0005";
    forEachVoronoiCell(source, delaunay, (p,vs) => {
        context.beginPath();

        context.moveTo(vs[0][0], vs[0][1]);
        for (let i = 1; i < vs.length + 1; ++i) {
            const j = i % vs.length;
            context.lineTo(vs[j][0], vs[j][1]);
        }
        
        const type = all[p].type;
        context.fillStyle = "#333444" + hex(1.5 -all[p].elevation);
        if (type === "coast") {
            context.fillStyle = "#334450" + hex(1.5 -all[p].elevation);
        } else if (type !== "ocean") {
            context.fillStyle = "#aba055" + hex(1.5 -all[p].elevation);
        }
        context.stroke(); 
        context.fill(); 
    });

    /*const edges: { a: GenPoint, b: GenPoint }[] = [];
    const edgeMap = new Map<GenPoint, number[]>();

    function map(a: GenPoint, edge: number) {
        const start = edgeMap.get(a) || [];
        edgeMap.set(a, [...start, edge]);
    }

    context.strokeStyle = "#f005";
    context.fillStyle = "#000";
    all.forEach(a => {
        const region = points.search({
            minX: a.x - radius*2,
            minY: a.y - radius*2,
            maxX: a.x + radius*2,
            maxY: a.y + radius*2
        }).filter(x => x !== a);

        if (region.length > 1)
        for (let i = 0; i < region.length; ++i) {
            const b = region[i];
            const center = {
                x: (a.x + b.x)/2,
                y: (a.y + b.y)/2,
            };
            //if (distance(a, b) < radius*radius*1.5*1.5) {
            if (distance(a, b)/2 <
                region
                    .filter(x => x !== b)
                    .map(c => distance(center, c))
                    .reduce((x,y) => Math.min(x,y))) {

                edges.push({ a, b });
                map(a, edges.length - 1);
                map(b, edges.length - 1);
            }
        }
    });


    type DualVertex = {x: number, y: number};
    const dualVertices: DualVertex[] = edges.map(e => ({
        x: (e.a.x + e.b.x)*0.5,
        y: (e.a.y + e.b.y)*0.5,
    }));

    all.forEach(a => {
        const dualVs = edgeMap.get(a)?.map(x => dualVertices[x]) || [];
        const count = dualVs.length;
        const color = "#" + hex(Math.random()) + hex(Math.random()) + hex(Math.random())
        context.strokeStyle = color;

        function angle(p: {x:number,y:number}, q: {x:number,y:number}) {
            const x = q.x - p.x;
            const y = q.y - p.y;
            return Math.atan2(y, x);
        }

        dualVs.sort((left, right) => {
            return angle(a, left) > angle(a, right) ? 1 : -1;
        });

        pix(context, a.x, a.y, color);
        for (let i = 0; i < count; ++i) {
            const left = dualVs[i];
            const right = dualVs[(i + 1)%count];
            context.beginPath();
            context.moveTo(left.x, left.y);
            context.lineTo(right.x, right.y);
            context.stroke();
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
        const ax = x + (noiseA.noise(0.05 * x, 0.05 * y) * 3 +
        noiseA.noise(0.15 * x, 0.15 * y) * 1)*modulus;
        const ay = y + (noiseB.noise(0.05 * x, 0.05 * y) * 3 +
        noiseB.noise(0.15 * x, 0.15 * y) * 1)*modulus;
        //const ax = x;
        //const ay = y;
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
                finalType = point.type;
                any = true;
            }
        })

        let style = "#333444";
        if (finalType === "coast") {
            style = "#334450";
        } else if (finalType !== "ocean") {
            style = "#aba055";
        }

        pix(context, x, y, style);
    }
    
    const mountain = document.getElementById("mountain") as HTMLCanvasElement;
    const hills = document.getElementById("hills") as HTMLCanvasElement;
    points.search({
        minX: ix - renderRadius*1.5,
        maxX: ix + renderRadius*1.5,
        minY: iy - renderRadius*1.5,
        maxY: iy + renderRadius*1.5,
    }).forEach(p => {
        const factor = Math.random()*0.2 + 1;
        const ix = ~~p.x;
        const iy = ~~p.y;
        if (p.river || p.type === "mountain") 
            context.drawImage(mountain, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        if (p.type === "hills") 
            context.drawImage(hills, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        if (p.type === "land" && Math.random() < 0.7)  {
            const factor = Math.random() * 0.2 + 0.6;
            const i = ~~(Math.random() * 3) + 1;
            context.drawImage(document.getElementById("field" + i) as any, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        }
    });
}

function fullRender(context: CanvasRenderingContext2D, radius: number, size: number, points: RBush<GenPoint>) {
    const mountain = document.getElementById("mountain") as HTMLCanvasElement;
    const hills = document.getElementById("hills") as HTMLCanvasElement;
    points.all().forEach(p => {
        const factor = Math.random()*0.2 + 1;
        const ix = ~~p.x;
        const iy = ~~p.y;
        if (p.river || p.type === "mountain") 
            context.drawImage(mountain, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        if (p.type === "hills") 
            context.drawImage(hills, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        if (p.type === "land" && Math.random() < 0.7)  {
            const factor = Math.random() * 0.2 + 0.6;
            const i = ~~(Math.random() * 3) + 1;
            context.drawImage(document.getElementById("field" + i) as any, ix - radius/2*factor, iy - radius/2*factor, radius*factor, radius*factor);
        }
    }); 
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
        return x*x + y*y < Math.pow(size, 2);
    }

    const plateRadius = radius *80; 
    const {step: plateStep, points: plates} = createDiscSampler(plateRadius, () => {
    }, [{x:Math.random() * plateRadius - plateRadius/2,y: Math.random() * plateRadius - plateRadius/2}]);
    while (plateStep((x,y) => {
        return x*x + y*y < Math.pow(size, 2);
    }));

    context.translate(size/2, size/2);
    context.fillStyle = "#fff";
    const {step, mountainStep, points} = createDiscSampler(radius, (point) => {
        //render(context, point.x, point.y, radius*2, radius, points, size);
    });

    plates.all().forEach(p => {
        mountainStep(p.x, p.y);
    })

    let current = 0;
    function frame() {
        current += 1;
        for(let i = 0; i < 450; ++i) {
            if (!step(filter)) {
                graph(context, points, radius, size);
                fullRender(context, radius, size, points);
                return;
            }
        }
        context.clearRect(-size,-size, size*2, size*2);
        fullRender(context, radius, size, points);
        requestAnimationFrame(frame);
    }

    frame();

    document.body.appendChild(canvas);
}