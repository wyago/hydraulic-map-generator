
export function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

export function clamp(x: number, a: number, b: number) {
    return Math.max(a, Math.min(x, b));
}

export function byMin<T>(array: ArrayLike<T>, f: (t: T) => number) {
    let min = Number.MAX_VALUE;
    let value: T = array[0];

    for (let i = 0; i < array.length; ++i) {
        const v = array[i];
        const d = f(v);
        if (d < min) {
            min = d;
            value = v;
        }
    }

    return value;
}