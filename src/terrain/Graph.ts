import RBush from "rbush";

export type BushVertex = {
    readonly index: number;

    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

export type Vertices = {
    points: RBush<BushVertex>;
    count: number;
    xys: Float32Array;
}

export function mapVertices<T>(vertices: Vertices, f: (x: number, y: number, i: number) => T) {
    let result = new Array<T>(vertices.count);
    for (let i = 0; i < vertices.count; ++i) {
        result[i] = f(vertices.xys[i*2], vertices.xys[i*2+1], i);
    }
    return result;
}