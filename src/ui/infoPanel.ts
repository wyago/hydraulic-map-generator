import { VNodeChild, h } from "maquette";

import { TileSet } from "../map/TileSet";
import { globalProjector } from "../projector";
import "./ui.css";

export function createInfoPanel() {
    let info: VNodeChild = [];

    return {
        inform(tiles: TileSet, i: number) {
            const totalElevation = tiles.totalElevation(i);

            if (i === -1) {
                info = [];
                return;
            }

            info = h("details.modal", { key: "info" }, [
                h("summary", ["Tile info"]),
                h("p", ["Id: " + i]),
                h("p", ["X: " + tiles.vertices.xs[i].toFixed(0)]),
                h("p", ["Y: " + tiles.vertices.ys[i].toFixed(0)]),
                h("details", [
                    h("summary", ["Elevation: " + totalElevation.toFixed(2)]),
                    h("p", ["Rock: " + tiles.rockElevation(i).toFixed(2)]),
                    h("p", ["Soft: " + tiles.soft[i].toFixed(2)]),
                    h("p", ["Hard: " + tiles.hard[i].toFixed(2)]),
                ]),
                h("details", [
                    h("summary", ["Water: " + tiles.water[i].toFixed(2)]),
                    h("p", ["Surface water: " + tiles.surfaceWater(i).toFixed(2)]),
                    h("p", ["Water table: " + tiles.waterTable(i).toFixed(2)]),
                ]),
            ])
            globalProjector.scheduleRender();
        },
        realize() {
            return info;
        }
    }
}