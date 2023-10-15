import { h } from "maquette";
import { Component } from "./component";

export type PanelProps = {
    readonly title: string;
    readonly defaultOpen?: boolean;
    readonly children: Component[];
}

export function createPanel({title, defaultOpen, children}: PanelProps) {
    return {
        realize()  {
            return h("details.modal", {
                key: title,
                open: defaultOpen ? "" : undefined
            }, [
                h("summary", [title]),
                children.map(o =>  [
                    o.realize()
                ]),
            ]);
        }
    }
}