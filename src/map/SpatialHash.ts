const deltas = [
    [-1,-1],
    [1,-1],
    [1,1],
    [-1,1],
    [-1,0],
    [1,0],
    [0,1],
    [0,-1],
]
export class SpatialHash {
    map: {[i:number]: number[]} = {};
    radius: number;

    constructor(radius: number) {
        this.radius = radius;
    }

    add(x: number, y: number, i: number) {
        const ix = (~~x)%this.radius;
        const iy = (~~y)%this.radius;

        let a = this.map[ix + iy * 10000] ?? [];
        a.push(i);
        this.map[ix + iy * 10000] = a;
    }

    get(x: number, y: number, target: Int32Array): number {
        let i = 0;

        const ix = (~~x)%this.radius;
        const iy = (~~y)%this.radius;

        for (let j = 0; j < deltas.length; ++j) {
            const [x,y] = deltas[j];
            const a = this.map[x + ix + (y + iy) * 10000];
            if (a) {
                for (let k = 0; k < a.length; ++k) {
                    target[i] = a[k];
                    i += 1;
                }
            }
        }

        return i;
    }
}