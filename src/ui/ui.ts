import { h } from "maquette";

import "./ui.css";

export function createUi(onseteroding: (eroding: boolean) => void, onsetbioming: (bioming: boolean) => void) {

  return {
      realize()  {
          return h("div#ui", [
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
          ]);
      }
  }
}