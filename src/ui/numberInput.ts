import { h } from "maquette";

export type NumberInputProps = {
    readonly name: string,
    readonly start: number,
    readonly onchange?: (value: number) => void,
}

export function createNumberInput({name, start, onchange}: NumberInputProps) {
    let value = start;
    return {
        get() {
            return value;
        },
        realize()  {
            return [
                h("label", [name]),
                h("input", {
                    type: "number",
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