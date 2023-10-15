import { h } from "maquette";

export type CreateProps = {
  options?: {
    name: string,
    dependent?: string,
    start?: boolean,
    onchange: (value: boolean) => void,
  }[];
  actions?: { name: string, onclick: () => void }[];
}

export function createControls({options, actions}: CreateProps) {
    return {
        realize()  {
            return h("details.modal", {open: ""}, [
                h("summary", ["Controls"]),
                (options ?? []).map(o => h("div.pair", {
                    key: o.name
                }, [
                    h("label", [o.name]),
                    h("input", {
                    type: "checkbox",
                    checked: o.start,
                    onchange: e => {
                        o.onchange((e.target as HTMLInputElement).checked);
                    }
                    }, []),
                ])),
                (actions ?? []).map(o => h("div.pair", [
                    h("button", {
                    onclick: _ => {
                        o.onclick();
                    }
                    }, [o.name]),
                ]))
            ]);
        }
    }
}