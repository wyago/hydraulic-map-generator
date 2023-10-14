import { h } from "maquette";

import { Component } from "../component";

export type CreateProps = {
    panels: Component[];
}

export function createUi({ panels }: CreateProps) {
    return {
        realize()  {
            return h("div#ui", panels.map(p => p.realize()));
        }
    }
}