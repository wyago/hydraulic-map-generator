import { Graph } from "./Graph";

export function createGrid(width: number, height: number, r: number) {
    const r2 = r*2;

    width = Math.floor(width/r2);
    height = Math.floor(height/r2);

    let xys = new Float32Array(width*height*2);

    for (let i = 0; i < width; ++i)
    for (let j = 0; j < height; ++j) {
        const index = i * height + j;
        xys[index*2+0] = i*r2 - width*r2/2;
        xys[index*2+1] = j*r2 - height*r2/2;
    }

    return new Graph(xys);
}