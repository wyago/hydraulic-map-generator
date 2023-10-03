export type Field = {
    size: number;
    get(x: number, y: number): number;
    gradient(x: number, y: number): [number, number];
    set(x: number, y: number, value: number): Field;
    operate(x: number, y: number, value: Field, f: (a: number, b: number) => number): Field;
}

export function createField<T>(size: number): Field {
    const elements = new Float32Array(size*size);
    const get = (x: number, y: number) => {
        x = Math.max(0, Math.min(x, size-1));
        y = Math.max(0, Math.min(y, size-1));
        return elements[x + y * size];
    };
    const field = {
        size,
        get,
        gradient(x: number, y: number): [number, number] {
            let resultx = 0;
            let resulty = 0;
            const center = get(x, y);
            resultx -= get(x - 1, y) - center;
            resultx += get(x + 1, y) - center;
            resulty -= get(x, y - 1) - center;
            resulty += get(x, y + 1) - center;

            return [resultx + Math.random()*0.01, resulty + Math.random()*0.01];
        },
        set(x: number, y: number, value: number) {
            x = Math.max(0, Math.min(x, size-1));
            y = Math.max(0, Math.min(y, size-1));
            elements[x + y * size] = value;
            return field;
        },
        operate(x: number, y: number, value: Field, f: (a: number, b: number) => number) {
            x = ~~x;
            y = ~~y;
            for (let j = 0; j < value.size; ++j)
            for (let i = 0; i < value.size; ++i) {
                const rx = x + i;
                const ry = y + j;

                elements[rx + ry * size] = f(elements[rx + ry * size], value.get(i,j));
            }
            return field;
        }
    };

    return field;
}
