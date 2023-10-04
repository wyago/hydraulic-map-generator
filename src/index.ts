import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import './index.css';
import { generateMap } from "./map/generator";
import { createCanvas } from "./render/canvas";
import { meshify } from "./render/mesher";

window.addEventListener("load", () => {
    const root = createUi();

    globalProjector.append(document.body, () => root.realize());
    const generator = generateMap(1500);
    let mesh = meshify(generator.graph());
    const {scene, render, element} = createCanvas();
    scene.add(mesh);

    let ongoing = true;
    let j = 0;

    console.log("starting");
    function frame() {
        if (ongoing) {
            j += 1;
            for (let i = 0; i < 1000; ++i) {
                ongoing = generator.step();
                if (!ongoing) break;
            }
            if (j % 50 === 0) {
                scene.remove(mesh);
                mesh = meshify(generator.graph());
                scene.add(mesh);
            }
            console.log("generationg...");
        }
        render();
        requestAnimationFrame(frame);
    }
    frame();

    document.body.append(element);
});
