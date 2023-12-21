import { h } from "maquette";

export type NumberInputProps = {
    readonly name: string,
    readonly start: number,
    readonly min: number,
    readonly max: number,
    readonly onchange?: (value: number) => void,
}

export function createSliderInput({name, start, min, max, onchange}: NumberInputProps) {
    let value = start;
    return {
        get() {
            return value;
        },
        realize()  {
            return [
                h("label", [name]),
                h("input", {
                    key: name,
                    type: "range",
                    step: "0.01",
                    min: min.toString(),
                    max: max.toString(),
                    value: value.toFixed(2),
                    onchange: e => {
                        value = Number.parseFloat((e.target as HTMLInputElement).value);
                        onchange?.(value);
                    }
                }, [])
            ]
        }
    }
}