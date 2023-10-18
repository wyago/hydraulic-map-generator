
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

export function byMax<T>(array: ArrayLike<T>, f: (t: T) => number) {
    return byMin(array, t => -f(t));
}

export function shuffle<T>(array: T[]) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }
  
export function lerp(a: number, b: number, factor: number) {
    factor = clamp(factor, 0, 1);
    return (1 - factor)*a + (factor)*b;
}

export function sumBy<T>(x: T[], f: (t: T) => number) {
    let sum = 0;
    for (let i = 0; i < x.length; ++i) {
        sum += f(x[i]);
    }
    return sum;
}

export function sum(x: number[]) {
    let sum = 0;
    for (let i = 0; i < x.length; ++i) {
        sum += x[i];
    }
    return sum;
}

export function id<T>(t: T): T {
    return t;
}