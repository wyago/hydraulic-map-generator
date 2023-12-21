import { h } from "maquette";

export type ButtonProps = {
    readonly text: string;
    readonly onclick: () => void;
}

export function createButton({text,onclick}: ButtonProps) {
    const cache = h("button", {
        key: text,
        onclick
    }, [text]);
    return {
        realize()  {
            return cache;
        }
    }
}