import { h } from "maquette";

import { TileSet } from "../map/Graph";
import { globalProjector } from "../projector";
import "./ui.css";

export type CreateProps = {
  options?: { name: string, onchange: (value: boolean) => void }[];
  actions?: { name: string, onclick: () => void }[];
}

export function createUi({options, actions}: CreateProps) {
  let info = h("div");

  return {
      inform(tiles: TileSet, i: number) {
        const totalElevation = tiles.totalElevation(i);

        info = h("div.modal", { key: "info" }, [
          h("p", ["Id: " + i]),
          h("p", ["Total elevation: " + totalElevation.toFixed(5)]),
          h("div.section", [
            h("p", ["Rock: " + tiles.rockElevation(i).toFixed(5)]),
            h("p", ["Soft: " + tiles.softRock(i).toFixed(5)]),
            h("p", ["Hard: " + tiles.hardRock(i).toFixed(5)]),
          ]),
          h("div.section", [
            h("p", ["Water: " + tiles.water(i).toFixed(5)]),
            h("p", ["Surface water: " + tiles.surfaceWater(i).toFixed(5)]),
            h("p", ["Water table: " + tiles.waterTable(i).toFixed(5)]),
          ]),
          h("p", ["Vegetation: " + tiles.vegetation[i].toFixed(5)]),
        ])
        globalProjector.scheduleRender();
      },
      realize()  {
          return h("div#ui", [
            h("div.modal", 
              (options ?? []).map(o => h("div", [
                h("label", [o.name]),
                h("input", {
                  type: "checkbox",
                  onchange: e => {
                    o.onchange((e.target as HTMLInputElement).checked);
                  }
                }),
              ]))),
            h("div.modal", 
              (actions ?? []).map(o => h("div", [
                h("button", {
                  onclick: _ => {
                    o.onclick();
                  }
                }, [o.name]),
              ]))),
            info
          ]);
      }
  }
}