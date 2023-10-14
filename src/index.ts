import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import { SimplexNoise } from "ts-perlin-simplex";
import { iota } from "./construction";
import './index.css';
import { TileSet } from "./map/Graph";
import { Map } from "./map/Map";
import { Tile } from "./map/Tile";
import { createDiscSampler } from "./map/discSampler";
import { byMin, clamp } from "./math";
import { createCanvas } from "./render/canvas";
import { pointsMesh } from "./render/mesher";

function generator() {
    const gen = createDiscSampler(8, (x, y) => x*x + y*y*2 < 1000*1000);
    while (gen.step());

    const vs = gen.vertices();

    const tiles = iota(vs.count).map(i => {
        const x = vs.xs[i];
        const y = vs.ys[i];
        const softness = 0;

        const plateau = clamp(0.8 - Math.sqrt(x*x*0.7 + y*y*2.5) * 0.00135, -0.2, 0.8);

        const elevation = clamp(clamp(plateau + wavy(x,y)*0.5, 0.01, 0.8) + wavy(x,y)*0.1 + 0.1, 0, 1);
        const softRock = Math.min(elevation, softness);
        const hardRock = Math.max(0, elevation - softness);
        return new Tile(
            x,
            y,
            hardRock,
            softRock
        )
    });

    const map = new Map(new TileSet(tiles));
    eroder(map, tiles);
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

function eroder(map: Map, tiles: Tile[]) {
    let mesh = pointsMesh();
    //let rivers = riverMesh();
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
    scene.add(mesh.object);
    //scene.add(rivers.object);

    for (let i = 0; i < 10; ++i) {
        map.simpleErosion();
    }

    map.deriveUphills();
    mesh.update(map.tiles);
    //rivers.update(map.tiles);

    let eroding = false;
    let bioming = false;
    let flowing = false;
    let laking = false;
    let growing = false;
    let rendering = true;
    let j = 0;
    
    const root = createUi({
        options: [{
            name: "Eroding",
            onchange: e => eroding = e
        }, {
            name: "Bioming",
            onchange: e => bioming = e
        }, {
            name: "Flowing",
            onchange: e => flowing = e
        }, {
            name: "Growing",
            onchange: e => growing = e
        }, {
            name: "Laking",
            onchange: e => laking = e
        }, {
            name: "Rendering",
            start: true,
            onchange: e => rendering = e
        }],
        actions: [{
            name: "Reset water",
            onclick: () => {
                map.resetWater()
                mesh.update(map.tiles);
            }
        }, {
            name: "Clear fog",
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

    console.log("starting");
    function frame() {
        j += 1;
        let start = Date.now();
        if (bioming) {
            map.fog(8);
        }
        if (growing) {
            for (let i = 0; i < tiles.length; ++i) {
                map.tiles.hard[i] += tiles[i].hardRock*0.0002;
            }
        }
        if (eroding) {
            for (let i = 0; i < 1; ++i) {
                map.setRivers();
                map.fog(8);
                map.iterateRivers();
                map.fixWater();
                map.spreadWater();
                map.spreadWater();
                map.spreadWater();
                map.landslide();
            }
        }
        if (flowing) {
            map.spreadWater();
            while (Date.now() - start < 200) {
                map.spreadWater();
            }
        }
        if (laking) {
            map.iterateLakes();
            map.spreadWater();
        }
        if (rendering) {
            mesh.update(map.tiles);
            //rivers.update(map.tiles);
        }
        render();
        root.inform(map.tiles, informId);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.body.append(element);
}


window.addEventListener("load", () => {
    generator();
});
