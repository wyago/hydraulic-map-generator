import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import './index.css';
import { Map } from "./map/Map";
import { Tile } from "./map/Tile";
import { generateMap } from "./map/generator";
import { createCanvas } from "./render/canvas";
import { pointsMesh, riverMesh } from "./render/mesher";

window.addEventListener("load", () => {
    const root = createUi();

    globalProjector.append(document.body, () => root.realize());
    const generator = generateMap(1500);

    fetch("/asdf.json").then(r => r.json()).then(response => {
        const tiles = response.map(x => new Tile(
            x.x,
            x.y,
            x.type,
            x.elevation
        ));
        const map = new Map(tiles);

        let mesh = pointsMesh(tiles);
        let rivers = riverMesh(tiles);
        const {scene, render, element} = createCanvas();
        scene.add(mesh.object);
        scene.add(rivers.object);

        let eroding = true;
        let j = 0;

        console.log("starting");
        function frame() {
            j += 1;
            if (eroding) {
                map.setRivers();
                map.iterateRivers();
                map.iterateSpread();
                mesh.update();
                rivers.update();
            }
            render();
            requestAnimationFrame(frame);
        }
        frame();

        document.body.append(element);
    })
});
