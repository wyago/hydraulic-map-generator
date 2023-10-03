export function min(a: number[]): [number, number] {
    let min = Number.MAX_VALUE;
    let index = 0;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] < min) {
            min = a[i];
            index = i;
        }
    }
    return [min, index];
}

export function max(a: number[]): [number, number] {
    let max = Number.MIN_VALUE;
    let index = 0;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] > max) {
            max = a[i];
            index = i;
        }
    }
    return [max, index];
}

export function iota(length: number): number[] {
    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        result[i] = i;
    }
    return result;
}