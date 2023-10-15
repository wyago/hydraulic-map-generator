import { h } from "maquette";

export type DropdownProps = {
    readonly label: string;
    readonly values: {
        key: string,
        display: string,
    }[];
    readonly start: string;
    readonly onchange?: (key: string) => void;
}

export function createDropdown({label, values, start, onchange}: DropdownProps) {
    let value = start;
    const cache = h("div.pair", {
        key: label
    }, [
        h("label", [label]),
        h("select", {
            onchange: e => {
                value = (e.target as HTMLSelectElement).value;
                onchange?.(value);
            }
        }, values.map(v => h("option", { key: v.key, value: v.key }, [v.display])))
    ]);
    return {
        get() {
            return value;
        },
        realize()  {
            return cache;
        }
    }
}