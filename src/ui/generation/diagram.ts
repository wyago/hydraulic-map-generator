import { VNodeChild, h } from "maquette";

import { globalProjector } from "../../projector";
import { TileSet } from "../../terrain/PointSet";

export function createDiagramPanel() {
    let info: VNodeChild = [];

    return {
        inform(tiles: TileSet, i: number) {
            if (i === -1) {
                info = [];
                return;
            }

            const soft = tiles.soft[i];
            const hard = tiles.hard[i];
            const water = tiles.water[i];
            const aquifer = tiles.aquifer[i];
            const silt = tiles.silt[i];

            info = h("details.modal", { key: "diagram", open: "" }, [
                h("summary", ["Tile diagram"]),
                h("svg", {
                    styles: {
                        margin: "20px auto"
                    },
                    width: "270",
                    height: "270",
                    viewBox: "0 0 1 1"
                }, [
                    h("defs", [
                        h("pattern", { id: "bluehatch", patternUnits: "userSpaceOnUse", width: "0.1", height: "0.1", patternTransform: "rotate(45)" }, [
                            h("rect", { width: "0.1", height: "0.05", fill: "#123" })
                        ]),
                        h("pattern", { id: "brownhatch", patternUnits: "userSpaceOnUse", width: "0.04", height: "0.04" }, [
                            h("circle", { r: "0.01", cx: "0.02", cy: "0.02", fill: "#532" })
                        ]),
                    ]),
                    h("rect", { width: "1", height: "1", fill: "#aac"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - soft - water).toFixed(4), fill: "#123"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - soft - silt).toFixed(4), fill: "url(#brownhatch)"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - soft).toFixed(4), fill: "#532"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - aquifer).toFixed(4), fill: "url(#bluehatch)"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard).toFixed(4), fill: "#555" }),
                ]),
            ])
            globalProjector.scheduleRender();
        },
        realize() {
            return info;
        }
    }
}