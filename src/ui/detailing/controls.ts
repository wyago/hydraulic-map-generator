import { createPanel } from "../panel";
import { createSliderInput } from "../sliderInput";

export function createControls(onchange: () => void) {
    const controls = {
        riverScale: createSliderInput({
            name: "River scale",
            start: 0.1,
            min: 0,
            max: 1,
            onchange
        }),
    }

    const controlPanel = createPanel({
        title: "Controls",
        defaultOpen: true,
        children: [
            controls.riverScale,
        ]
    });

    return {
        controls,
        realize() {
            return controlPanel.realize();
        }
    }
}
