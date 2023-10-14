import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import { SimplexNoise } from "ts-perlin-simplex";
import './index.css';
import { Map } from "./map/Map";
import { TileSet } from "./map/TileSet";
import { createDiscSampler } from "./map/discSampler";
import { byMin, clamp } from "./math";
import { createCanvas } from "./render/canvas";
import { pointsMesh, riverMesh } from "./render/mesher";

function generator() {
    const gen = createDiscSampler(8, (x, y) => x*x + y*y*2 < 1000*1000);
    while (gen.step());

    const vs = gen.vertices();
    const tiles = new TileSet(vs);

    for (let i = 0; i < tiles.count; ++i) {
        const x = tiles.x(i);
        const y = tiles.y(i);

        const plateau = clamp(0.8 - Math.sqrt(x*x*0.7 + y*y*2.5) * 0.00155, -0.3, 0.8);
        const elevation = clamp(clamp(plateau + wavy(x,y)*0.5, 0.01, 0.8) + wavy(x,y)*0.1 + 0.1, 0, 1);
        tiles.hard[i] = elevation;
    }

    const map = new Map(tiles);
    eroder(map);
}

const noise = new SimplexNoise();
const noiseX = new SimplexNoise();
const noiseY = new SimplexNoise();
function fbm(noise: SimplexNoise, x: number, y: number) {
    let result = 0;

    let mul = 0.5;
    let div = 0.5;
    for (let i = 0; i < 30; ++i) {
        result += noise.noise(x * mul, y * mul) * div;
        mul *= 2;
        div *= 0.5;
    }
    return result;
}

function wavy(x: number, y: number) {
    x = x * 0.002;
    y = y * 0.002;
    x += 0.5;
    y += 0.5;
    x = x + fbm(noiseX, x*0.1, y*0.1)*3;
    y = y + fbm(noiseY, x*0.1, y*0.1)*3;

    return fbm(noise, x, y);
}

function eroder(map: Map) {
    let mesh = pointsMesh();
    let rivers = riverMesh();
    let informId = -1;

    const {scene, render, element} = createCanvas(({x, y}) => {
        const region = map.tiles.vertices.points.search({
            maxX: x + 10,
            minX: x - 10,
            maxY: y + 10,
            minY: y - 10,
        });
        if (region.length === 0) {
            mesh.select(-1);
            return;
        }

        const p = byMin(region, t => {
            const dx = t.maxX - x;
            const dy = t.maxY - y;
            return dx*dx + dy*dy;
        });

        informId = p.index;
        mesh.select(informId);
    });
    document.body.append(element);

    scene.add(mesh.object);
    scene.add(rivers.object);

    for (let i = 0; i < 10; ++i) {
        map.simpleErosion();
    }

    map.deriveUphills();
    mesh.update(map.tiles);
    rivers.update(map.tiles);
    rivers.object.visible = false;

    let eroding = false;
    let watersheds = false;
    let j = 0;
    
    const root = createUi({
        options: [{
            name: "Erode",
            onchange: e => eroding = e,
        }, {
            name: "Show watersheds",
            onchange: e => {
                watersheds = e
                rivers.object.visible = e;
            },
        }],
        actions: [{
            name: "Clear wind",
            onclick: () => {
                for (let i = 0; i < map.tiles.count; ++i) {
                    map.tiles.fog[i] = 0;
                }
                mesh.update(map.tiles);
            }
        }, {
            name: "Height rendering",
            onclick: () => {
                mesh.mode(1);
            }
        }, {
            name: "Normal rendering",
            onclick: () => {
                mesh.mode(0);
            }
        }]
    });

    globalProjector.append(document.body, () => root.realize());

    function frame() {
        j += 1;
        if (eroding) {
            map.setRivers();
            map.fog(8);
            map.iterateRivers();
            map.fixWater();
            map.spreadWater();
            map.spreadWater();
            map.spreadWater();
            map.landslide();

            map.deriveUphills();
            map.deriveDownhills();
            mesh.update(map.tiles);
            if (watersheds) {
                rivers.update(map.tiles);
            }
        }
        render();
        root.inform(map.tiles, informId);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

window.addEventListener("load", () => {
    generator();
});
