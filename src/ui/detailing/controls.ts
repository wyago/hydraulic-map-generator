import { createButton } from "../button";
import { createPanel } from "../panel";
import { createSliderInput } from "../sliderInput";

export function createControls(onchange: () => void, onexport: () => void) {
    const controls = {
        riverScale: createSliderInput({
            name: "River scale",
            start: 0.1,
            min: 0,
            max: 1,
            onchange
        }),
        export: createButton({
            text: "Export",
            onclick: onexport
        })
    }

    const controlPanel = createPanel({
        title: "Controls",
        defaultOpen: true,
        children: [
            controls.riverScale,
            controls.export,
        ]
    });

    return {
        controls,
        realize() {
            return controlPanel.realize();
        }
    }
}
