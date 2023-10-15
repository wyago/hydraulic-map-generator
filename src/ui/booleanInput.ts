import { h } from "maquette";

export type BooleanInputProps = {
    name: string,
    start?: boolean,
    onchange?: (value: boolean) => void,
}

export function createBooleanInput({name, start, onchange}: BooleanInputProps) {
    let value = start ?? false;
    return {
        get() {
            return value;
        },
        realize()  {
            return h("div.pair", {
                key: name
            }, [
                h("label", [name]),
                h("input", {
                    type: "checkbox",
                    checked: start,
                    onchange: e => {
                        value = (e.target as HTMLInputElement).checked;
                        onchange?.(value);
                    }
                }, []),
            ]);
        }
    }
}