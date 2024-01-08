import Delaunator from "delaunator";
import { Graph } from "../terrain/Graph";

function generateAdjacents(graph: Graph) {
    const source = graph.map((x,y) => [x, y]);

    function nextHalfedge(e: number) { return (e % 3 === 2) ? e - 2 : e + 1; }
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

    const adjacents: number[][] = source.map(_ => []);
    forEachTriangleEdge((p, q) => {
        adjacents[p].push(q);
        adjacents[q].push(p);
    });

    return adjacents.map((a,i) => {
        const sourcex = graph.xys[i*2];
        const sourcey = graph.xys[i*2+1];
        return a.sort((x, y) => {
            const leftx = graph.xys[x*2];
            const lefty = graph.xys[x*2+1];
            const rightx = graph.xys[y*2];
            const righty = graph.xys[y*2+1];
            return Math.atan2(lefty - sourcey, leftx - sourcex) > Math.atan2(righty - sourcey, rightx - sourcex) ? 1 : -1;
        })
    });
}

export type Buffers = {
    instanceCount: number,
    triangle: GPUBuffer,
    positions: GPUBuffer,
    normals: GPUBuffer,
    tiles: GPUBuffer,
    tileBuffer: GPUBuffer,
    tileAdjacentIndices: GPUBuffer,
    targetIndices: GPUBuffer,
    tileAdjacents: GPUBuffer
};

export function createBuffers(device: GPUDevice, initial: Graph): Buffers {
    const count = initial.count;

    const positions = device.createBuffer({
        size: (count * 2)*Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE  | GPUBufferUsage.COPY_DST
    });

    const triangle = device.createBuffer({
        size: (4 * 2)*Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    const tileBuffer = device.createBuffer({
        size: count * 6 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const tiles = device.createBuffer({
        size: count * 6 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const normals = device.createBuffer({
        size: count * 4 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX |  GPUBufferUsage.STORAGE
    });

    const tileAdjacentIndices = device.createBuffer({
        size: count * 2 * Int32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    
    const targetIndices = device.createBuffer({
        size: count * Int32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const triangleData = new Float32Array(4 * 2);
    triangleData[0] = -16;
    triangleData[1] = -16;
    triangleData[2] = 16;
    triangleData[3] = -16;
    triangleData[4] = -16;
    triangleData[5] = 16;
    triangleData[6] = 16;
    triangleData[7] = 16;

    const adjacents = generateAdjacents(initial);
    const indices = new Int32Array(adjacents.length*2);
    let acc = 0;
    for (let i = 0; i < count; ++i) {
        indices[i*2] = acc; 
        indices[i*2+1] = adjacents[i].length;
        acc += adjacents[i].length;
    }

    const flattened = new Int32Array(adjacents.flatMap(x => x));

    const tileAdjacents = device.createBuffer({
        size: flattened.length * Int32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE  | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(tileAdjacents, 0, flattened);
    device.queue.writeBuffer(tileAdjacentIndices, 0, indices);
    device.queue.writeBuffer(triangle, 0, triangleData);
    device.queue.writeBuffer(positions, 0, initial.xys);

    return {
        instanceCount: count,
        triangle,
        positions,
        normals,
        tiles,
        tileBuffer,
        tileAdjacentIndices,
        tileAdjacents,
        targetIndices
    };
}