import { h } from "maquette";

export type ConfiguratorProps = {
  options?: {
    name: string,
    start: number,
    onchange: (value: number) => void,
  }[];
}

export function createConfigurator({options}: ConfiguratorProps) {
    return {
        realize()  {
            return h("details.modal", [
                h("summary", ["Tuning parameters"]),
                (options ?? []).map(o =>  [
                    h("label", [o.name]),
                    h("input", {
                        type: "number",
                        value: o.start.toFixed(2),
                        onchange: e => {
                            o.onchange(Number.parseFloat((e.target as HTMLInputElement).value));
                        }
                    }, []),
                ]),
            ]);
        }
    }
}