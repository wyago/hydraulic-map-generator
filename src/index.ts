import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import { SimplexNoise } from "ts-perlin-simplex";
import './index.css';
import { GenPoint } from "./map/GenPoint";
import { TileSet } from "./map/Graph";
import { Map } from "./map/Map";
import { Tile } from "./map/Tile";
import { createDiscSampler } from "./map/pureDisc";
import { byMin } from "./math";
import { createCanvas } from "./render/canvas";
import { graphRenderer } from "./render/graphRenderer";
import { pointsMesh, riverMesh } from "./render/mesher";

function generator() {
    const generator = createDiscSampler(8, (x, y) => true);

    const {scene, render, element} = createCanvas();

    let mesh = graphRenderer();
    scene.add(mesh.object);

    let generating = false;
    for (let i = 0; i < 1000000; ++i)  {
        if(!generator.step())
            break;
    }
    mesh.update(generator.vertices());

    function frame() {
        if (generating) {
            console.log(generator.vertices().count);
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
    y = y * 0.008;
    x = x + fbm(noiseX, x*0.1, y*0.1)*4;
    y = y + fbm(noiseY, x*0.1, y*0.1)*4;

    return fbm(noise, x, y) * 0.5 + 0.5;
}

function eroder(risers: GenPoint[]) {
    const tiles = risers.map(p => {
        const softness = wavy(p.x, p.y) * 0.2 + 0.2;
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

    const map = new Map(new TileSet(tiles));

    let mesh = pointsMesh();
    let rivers = riverMesh();
    const {scene, render, element} = createCanvas(({x, y}) => {
        const region = map.tiles.vertices.points.search({
            maxX: x + 10,
            minX: x - 10,
            maxY: y + 10,
            minY: y - 10,
        });
        if (region.length === 0) {
            return;
        }

        const p = byMin(region, t => {
            const dx = t.maxX - x;
            const dy = t.maxY - y;
            return dx*dx + dy*dy;
        });

        root.inform(map.tiles, p.index);
    });
    scene.add(mesh.object);
    scene.add(rivers.object);
    (window as any).dry = (n: number) => {
        for (let i = 0; i < risers.length; ++i) {
            map.tiles.hardSoftWaterRiver[i*4+2] -= n || 0.1;
        }
    }

    for (let i = 0; i < 30; ++i) {
        map.simpleErosion();
    }

    mesh.update(map.tiles);
    rivers.update(map.tiles);

    let eroding = false;
    let bioming = false;
    let j = 0;

    console.log("starting");
    function frame() {
        j += 1;
        if (bioming) {
            map.fog();
            mesh.update(map.tiles);
        }
        if (eroding) {
            //map.carry();
            map.setRivers();
            map.iterateRivers();
            //map.iterateSpread();
            if (j % 3 === 0) {
                mesh.update(map.tiles);
                rivers.update(map.tiles);
            }
        }
        render();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.body.append(element);
}


window.addEventListener("load", () => {
    loader();
});
