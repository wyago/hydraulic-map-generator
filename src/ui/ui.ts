import { h } from "maquette";

import { TileSet } from "../map/Graph";
import { globalProjector } from "../projector";
import "./ui.css";

export function createUi(onseteroding: (eroding: boolean) => void, onsetbioming: (bioming: boolean) => void) {
  let info = h("div");

  return {
      inform(tiles: TileSet, i: number) {
        const softRock = tiles.softRock(i);
        const elevation = tiles.rockElevation(i);
        const totalElevation = tiles.totalElevation(i);

        info = h("div.modal", { key: "info" }, [
          h("p", ["SoftRock: " + softRock.toFixed(5)]),
          h("p", ["Elevation: " + elevation.toFixed(5)]),
          h("p", ["Total elevation: " + totalElevation.toFixed(5)]),
          h("p", ["Surface water: " + tiles.surfaceWater(i).toFixed(5)]),
          h("p", ["Water table: " + tiles.waterTable(i).toFixed(5)]),
          h("p", ["Id: " + i]),
          h("p", ["Water: " + tiles.water(i).toFixed(5)]),
        ])
        globalProjector.scheduleRender();
      },
      realize()  {
          return h("div#ui", [
            h("div.modal", [
              h("label", ["Erode"]),
              h("input", {
                type: "checkbox",
                onchange: e => {
                  onseteroding((e.target as HTMLInputElement).checked);
                }
              }),
              h("label", ["Biome"]),
              h("input", {
                type: "checkbox",
                onchange: e => {
                  onsetbioming((e.target as HTMLInputElement).checked);
                }
              })
            ]),
            info
          ]);
      }
  }
}