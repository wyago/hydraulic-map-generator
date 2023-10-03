import { h } from "maquette";

import "./ui.css";

export function createUi() {

  return {
      realize()  {
          return h("div#ui", [
            h("div.modal", [
              h("label", ["Material"]),
            ])
          ]);
      }
  }
}