import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import { BoxGeometry, Mesh, MeshBasicMaterial } from "three";
import { SimplexNoise } from "ts-perlin-simplex";
import './index.css';
import { GenPoint } from "./map/GenPoint";
import { Map } from "./map/Map";
import { Tile } from "./map/Tile";
import { generateMap } from "./map/generator";
import { createCanvas } from "./render/canvas";
import { genMesh, pointsMesh, riverMesh } from "./render/mesher";

function generator() {
    const generator = generateMap(1500);

    const {scene, render, element} = createCanvas();

    let mesh = genMesh(generator.graph());
    scene.add(mesh.object);
    scene.add(new Mesh(new BoxGeometry(1,1,1), new MeshBasicMaterial({ color: 0xffffff})))

    let generating = true;

    (window as any).erode = () => {
        generating = false;
        element.remove();
        eroder(generator.graph());
    }

    function frame() {
        if (generating) {
            for (let i = 0; i < 30000; ++i)  {
                if(!generator.step())
                    break;
            }
            console.log(generator.count())
            mesh.update(generator.graph());
        }
        render();
        requestAnimationFrame(frame);
    }
    frame();

    document.body.append(element);
}

function loader() {
    fetch("/asdf.json").then(r => r.json()).then(response => {
        const tiles = response.map(x => new GenPoint(
            x.x,
            x.y,
            x.type,
            x.elevation
        ));
        eroder(tiles);
    });
}


const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
function fbm(x: number, y: number) {
    let result = 0;
    x = x + noiseX.noise(x * 0.001, x * 0.001) * 2000;
    y = y + noiseY.noise(y * 0.001, y * 0.001) * 2000;
    for (let i = 0; i < 10; ++i) {
        const factor = Math.pow(2, i+1);
        result = noise.noise(x / factor * 0.001, y / factor * 0.001) / factor;
    }
    return result * 0.5 + 0.5;
}

function eroder(risers: GenPoint[]) {
    const tiles = risers.map(p => {
        return new Tile(
            p.x,
            p.y,
            p.type,
            p.elevation
        )
});
    const root = createUi();

    globalProjector.append(document.body, () => root.realize());

    const map = new Map(tiles);

    let mesh = pointsMesh(tiles);
    let rivers = riverMesh(tiles);
    const {scene, render, element} = createCanvas();
    scene.add(mesh.object);
    scene.add(rivers.object);
    mesh.update();
    rivers.update();
    (window as any).dry = (n: number) => {
        for (let i = 0; i < risers.length; ++i) {
            map.allTiles[i].lake -= n || 0.1;
        }
    }

    //map.simpleErosion();
    //map.setRivers();

    let eroding = true;
    let j = 0;

    console.log("starting");
    function frame() {
        j += 1;
        if (eroding) {
            if (j % 5 === 0) {
                map.setRivers();
            } else if (j % 5 === 1) {
                map.iterateRivers();
            } else if (j % 5 === 2) {
                map.iterateSpread();
            } else if (j % 5 === 3) {
                mesh.update();
            } else {
                rivers.update();
            }
        }
        render();
        requestAnimationFrame(frame);
    }
    frame();

    document.body.append(element);
}


window.addEventListener("load", () => {
    loader();
});
