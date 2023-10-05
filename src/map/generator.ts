import { createDiscSampler } from "../disc";

import RBush from "rbush";
import { SimplexNoise } from "ts-perlin-simplex";
import { GenPoint } from "../map/GenPoint";
import { Tile } from "./Tile";

function graph(points: RBush<GenPoint>) {
    const all = points.all();

    /*
    const source = all.map(a => ([a.x, a.y]));

    function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
    const delaunay = Delaunator.from(source);
    function forEachTriangleEdge(callback: (p: number, q: number) => void) {
        for (let e = 0; e < delaunay.triangles.length; e++) {
            if (e > delaunay.halfedges[e]) {
                const p = delaunay.triangles[e];
                const q = delaunay.triangles[nextHalfedge(e)];
                callback(p, q);
            }
        }
    }
    function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }

function pointsOfTriangle(delaunay, t) {
    return edgesOfTriangle(t)
        .map(e => delaunay.triangles[e]);
}

function forEachTriangle(points, delaunay, callback: (t: number, points: GenPoint[]) => void) {
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
            callback(delaunay.triangles[e], p, q);
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
function forEachVoronoiCell(points, delaunay, callback: (p: number, vertices: number[][]) => void) {
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

    const tiles = new Array<Tile>(delaunay.triangles.length/3);
    forEachTriangle(all, delaunay, (t: number, points: GenPoint[]) => {
        tiles[t] = new Tile(
            points.map(p => p.x).reduce((x,y) => x + y) / points.length,
            points.map(p => p.y).reduce((x,y) => x + y) / points.length,
            points[~~(Math.random() * points.length)].type,
            points.map(p => p.elevation).reduce((x,y) => x + y) / points.length,
        )
        tiles[t].points.push(...points.reverse());
    });*/

    /*forEachTriangleEdge((p, q) => {
        tiles[p].adjacents.push(q);
        tiles[q].adjacents.push(p);
    });

    /*forEachVoronoiEdge(source, delaunay, (e, p, q) => {
        map.allTiles[e].boundaries.push(new HalfBoundary(
            { x: p[0], y: p[1] },
            { x: q[0], y: q[1] },
        ));
    });*/

    return all.map(x => {
        return new Tile(
            x.x,
            x.y,
            x.type,
            x.elevation
        );
    });
}

const noiseC = new SimplexNoise();
function makePlates(size: number, plateRadius: number) {
    const {step: plateStep, points: plates} = createDiscSampler((x,y) => {
        x += noiseX.noise(x * 0.001, y * 0.001)*250;
        y += noiseY.noise(x * 0.001, y * 0.001)*250;
        return plateRadius + noiseC.noise(x * 0.0001, y * 0.0001) * 2000 + 2000;
    }, () => {
    }, [new GenPoint(
        Math.random() * plateRadius - plateRadius/2,
        Math.random() * plateRadius - plateRadius/2,
        "mountain",
        1
    )]);
    while (plateStep((x,y) => {
        return x*x + y*y*2 < Math.pow(size*2, 2);
    }));

    return plates.all();
}

function makeSeeds(size: number, plateRadius: number) {
    const {step: plateStep, points: plates} = createDiscSampler((x,y) => {
        return plateRadius;
    }, () => {
    }, [new GenPoint(
        Math.random() * plateRadius - plateRadius/2,
        Math.random() * plateRadius - plateRadius/2,
        "mountain",
        1
    )]);

    while (plateStep((x,y) => {
        return x*x + y*y*2 < Math.pow(size*2, 2);
    }));

    return plates.all();
}


const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
export function generateMap(size: number) {
    const radius = 8;

    function filter(x, y) {
        return true;
        //return x*x*0.1 + y*y*0.5 < Math.pow(size*4, 2);
    }

    const plates = makePlates(size*3, radius*60);

    const {step, mountainStep, points} = createDiscSampler(() => radius, (point) => {
        //render(context, point.x, point.y, radius*2, radius, points, size);
    }, plates.map(p => {
        const ocean = Math.random() > 0.5;
        return new GenPoint(
            p.x,
            p.y,
            ocean ? "flat" : "mountain",
            ocean ? 0 : 1
        ) }));


    return {
        step() {
            return step(filter);
        },
        graph() {
            return graph(points);
        }
    }
}