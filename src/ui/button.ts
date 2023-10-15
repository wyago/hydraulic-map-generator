import { h } from "maquette";

export type ButtonProps = {
    readonly text: string;
    readonly onclick: () => void;
}

export function createButton({text,onclick}: ButtonProps) {
    const cache = h("button", {
        onclick
    }, [text]);
    return {
        realize()  {
            return cache;
        }
    }
}