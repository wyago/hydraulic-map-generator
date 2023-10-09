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
function fbm(noise: SimplexNoise, x: number, y: number) {
    let result = 0;

    let mul = 0.5;
    let div = 0.5;
    for (let i = 0; i < 20; ++i) {
        result += noise.noise(x * mul, y * mul) * div;
        mul *= 2;
        div *= 0.5;
    }
    return result;
}

function wavy(x: number, y: number) {
    x = x * 0.008;
    y = y * 0.007;
    x = x + fbm(noiseX, x*0.1, y*0.1)*4;
    y = y + fbm(noiseY, x*0.1, y*0.1)*4;

    return fbm(noise, x, y) * 0.5 + 0.5;
}

function eroder(risers: GenPoint[]) {
    const tiles = risers.map(p => {
        const softness = 0.3;//wavy(p.x, p.y) * 0.2;
        const elevation = p.elevation;//clamp(wavy(p.x + 100000, p.y) - Math.sqrt(p.x*p.x + p.y*p.y) * 0.00008, 0.05, 1);
        const softRock = Math.min(elevation, softness);
        const hardRock = Math.max(0, elevation - softness);
        return new Tile(
            p.x,
            p.y,
            p.type,
            hardRock,
            softRock
        )
});
    const root = createUi((e) => {
        eroding = e;
    }, (e) => {
        bioming = e;
    });

    globalProjector.append(document.body, () => root.realize());

    const map = new Map(tiles);

    let mesh = pointsMesh(tiles);
    let rivers = riverMesh(tiles);
    const {scene, render, element} = createCanvas();
    scene.add(mesh.object);
    scene.add(rivers.object);
    (window as any).dry = (n: number) => {
        for (let i = 0; i < risers.length; ++i) {
            map.allTiles[i].water -= n || 0.1;
        }
    }

    for (let i = 0; i < 10; ++i) {
        map.simpleErosion();
    }

    mesh.update();
    rivers.update();

    let eroding = false;
    let bioming = false;
    let j = 0;

    console.log("starting");
    function frame() {
        j += 1;
        if (bioming) {
            map.fog();
            mesh.update();
        }
        if (eroding) {
            map.setRivers();
            map.iterateRivers();
            map.iterateSpread();
            if (j % 3 === 0) {
                mesh.update();
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
    generator();
});
