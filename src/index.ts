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
        map.setRivers();

        let mesh = pointsMesh(tiles);
        let rivers = riverMesh(tiles);
        const {scene, render, element} = createCanvas();
        scene.add(mesh);
        scene.add(rivers);

        let ongoing = false;
        let riversOngoing = true;
        let j = 0;

        console.log("starting");
        function frame() {
            if (riversOngoing) {
                map.setRivers();
                if (j % 20 === 0) {
                    scene.remove(rivers);
                    scene.remove(mesh);
                    mesh = pointsMesh(tiles);
                    rivers = riverMesh(tiles);
                    scene.add(mesh);
                    scene.add(rivers);
                }
            }
            if (ongoing) {
                j += 1;
                for (let i = 0; i < 5000; ++i) {
                    ongoing = generator.step();
                    if (!ongoing) break;
                }
                if (j % 20 === 0) {
                    scene.remove(rivers);
                    scene.remove(mesh);
                    mesh = pointsMesh(tiles);
                    rivers = riverMesh(tiles);
                    scene.add(mesh);
                    scene.add(rivers);
                }
                console.log("generationg...");
            }
            render();
            requestAnimationFrame(frame);
        }
        frame();

        document.body.append(element);
    })
});
