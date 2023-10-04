import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import './index.css';
import { generateMap } from "./map/generator";
import { createCanvas } from "./render/canvas";
import { meshify } from "./render/mesher";

window.addEventListener("load", () => {
    const root = createUi();

    globalProjector.append(document.body, () => root.realize());
    const mesh = meshify(generateMap(1000));
    const {scene, render, element} = createCanvas();
    scene.add(mesh);

    function frame() {
        render();
        requestAnimationFrame(frame);
    }
    frame();

    document.body.append(element);
});
