import { h } from "maquette"

import "./codeLink.css"

export function createCodeLink() {
    return {
        realize() {
            return h("div.code-link", [
                h("a", {href: "https://github.com/wyago/hydraulic-map-generator"}, ["Source code"])
            ])
        }
    }
}