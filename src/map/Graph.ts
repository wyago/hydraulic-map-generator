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
    xs: Float32Array;
    ys: Float32Array;
}