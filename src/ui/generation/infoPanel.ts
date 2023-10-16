import { VNodeChild, h } from "maquette";

import { globalProjector } from "../../projector";
import { TileSet } from "../../terrain/PointSet";

export function createInfoPanel() {
    let info: VNodeChild = [];

    return {
        inform(tiles: TileSet, i: number) {
            const totalElevation = tiles.totalElevation(i);

            if (i === -1) {
                info = [];
                return;
            }

            const soft = tiles.soft[i];
            const hard = tiles.hard[i];
            const water = tiles.water[i];

            info = h("details.modal", { key: "info" }, [
                h("summary", ["Tile info"]),
                h("p", ["Id: " + i]),
                h("p", ["X: " + tiles.vertices.xys[i*2].toFixed(0)]),
                h("p", ["Y: " + tiles.vertices.xys[i*2+1].toFixed(0)]),
                h("p", ["vX: " + tiles.vx[i].toFixed(4)]),
                h("p", ["vY: " + tiles.vy[i].toFixed(4)]),
                h("p", ["Elevation: " + totalElevation.toFixed(2)]),
                h("svg", {
                    width: "200",
                    height: "200",
                    viewBox: "0 0 1 1"
                }, [
                    h("defs", [
                        h("pattern", { id: "diagonalhatch", patternUnits: "userSpaceOnUse", width: "0.1", height: "0.1", patternTransform: "rotate(45)" }, [
                            h("rect", { width: "0.1", height: "0.05", fill: "#123" })
                        ]),
                    ]),
                    h("rect", { width: "1", height: "1", fill: "#dde"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - water).toFixed(4), fill: "#123"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - soft).toFixed(4), fill: "#532"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard - water).toFixed(4), fill: "url(#diagonalhatch)"}),
                    h("rect", { width: "1", height: 1, y: (1 - hard).toFixed(4), fill: "#555" }),
                ]),
                h("details", [
                    h("summary", ["Ground: " + tiles.rockElevation(i).toFixed(2)]),
                    h("p", ["Rock: " + tiles.hard[i].toFixed(2)]),
                    h("p", ["Silt: " + tiles.soft[i].toFixed(2)]),
                ]),
                h("details", [
                    h("summary", ["Surface water: " + tiles.surfaceWater(i).toFixed(2)]),
                    h("p", ["Water table: " + tiles.waterTable(i).toFixed(2)]),
                    h("p", ["Aquifer + surface: " + tiles.water[i].toFixed(2)]),
                ]),
            ])
            globalProjector.scheduleRender();
        },
        realize() {
            return info;
        }
    }
}