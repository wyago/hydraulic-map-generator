import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import { SimplexNoise } from "ts-perlin-simplex";
import { iota } from "./construction";
import './index.css';
import { GenPoint } from "./map/GenPoint";
import { TileSet } from "./map/Graph";
import { Map } from "./map/Map";
import { Tile } from "./map/Tile";
import { createDiscSampler } from "./map/pureDisc";
import { byMin, clamp } from "./math";
import { createCanvas } from "./render/canvas";
import { pointsMesh, riverMesh } from "./render/mesher";

function generator() {
    const gen = createDiscSampler(8, (x, y) => x*x*0.5 + y*y < 1000*1000);
    while (gen.step());

    const vs = gen.vertices();

    const tiles = iota(vs.count).map(i => {
        const x = vs.xs[i];
        const y = vs.ys[i];
        const softness = 0;//Math.pow(fbm(noise, x * 0.005, y * 0.005) * 0.4 + 0.4, 4);
        const elevation = clamp(1 - Math.sqrt(x*x*0.7 + y*y*2.5) * 0.0014 + wavy(x,y) * 2 - 1, 0.05, 1) //p.elevation;//clamp(wavy(p.x + 100000, p.y) - Math.sqrt(p.x*p.x + p.y*p.y) * 0.00008, 0.05, 1);
        const softRock = Math.min(elevation, softness);
        const hardRock = Math.max(0, elevation - softness);
        return new Tile(
            x,
            y,
            "flat",
            hardRock,
            softRock
        )
});

const map = new Map(new TileSet(tiles));
eroder(map);
}

function loader() {
    fetch("/asdf.json").then(r => r.json()).then(response => {
        const risers = response.map(x => new GenPoint(
            x.x,
            x.y,
            x.type,
            x.elevation
        ));
        const tiles = risers.map(riser => {
            const x = riser.x;
            const y = riser.y;
            const softness = wavy(x, y) * 0.3;
            const elevation = riser.elevation;//clamp(wavy(p.x + 100000, p.y) - Math.sqrt(p.x*p.x + p.y*p.y) * 0.00008, 0.05, 1);
            const softRock = Math.min(elevation, softness);
            const hardRock = Math.max(0, elevation - softness);
            return new Tile(
                x,
                y,
                "flat",
                hardRock,
                softRock
            )
    });
    const map = new Map(new TileSet(tiles));
        eroder(map);
    });
}

function unmarshaler() {
    fetch("/save.json").then(r => r.json()).then(response => {
        const map = new Map(new TileSet([]).unmarshal(response));
        eroder(map);
    });
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
    x = x * 0.004;
    y = y * 0.004;
    x += 0.5;
    y += 0.5;
    x = x + fbm(noiseX, x*0.2, y*0.2)*5;
    y = y + fbm(noiseY, x*0.2, y*0.2)*5;

    return fbm(noise, x, y) * 0.5 + 0.5;
}

function eroder(map: Map) {


    let mesh = pointsMesh();
    let rivers = riverMesh();
    let informId = 0;

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

        informId = p.index;
    });
    scene.add(mesh.object);
    scene.add(rivers.object);

    for (let i = 0; i < 10; ++i) {
        map.simpleErosion();
    }

    map.deriveUphills();
    mesh.update(map.tiles);
    rivers.update(map.tiles);

    let eroding = false;
    let bioming = false;
    let flowing = false;
    let laking = false;
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
            name: "Laking",
            onchange: e => laking = e
        }],
        actions: [{
            name: "Reset water",
            onclick: () => map.resetWater()
        }]
    });

    globalProjector.append(document.body, () => root.realize());

    console.log("starting");
    function frame() {
        j += 1;
        let start = Date.now();
        if (bioming) {
            map.fog(8);
    map.deriveUphills();
    map.deriveDownhills();
            mesh.update(map.tiles);
            rivers.update(map.tiles);
        } else if (eroding) {
            for (let i = 0; i < 1; ++i) {
                map.setRivers();
                map.iterateRivers();
                //map.simpleErosion();
                map.iterateSpread();
                map.iterateSpread();
                map.iterateSpread();
                map.iterateSpread();
            }
    map.deriveUphills();
    map.deriveDownhills();
            mesh.update(map.tiles);
            rivers.update(map.tiles);
        } else if (flowing) {
            map.iterateSpread();
            mesh.update(map.tiles);
            rivers.update(map.tiles);
        } else if (laking) {
            map.rain();
            map.iterateSpread();
            map.iterateSpread();
            map.iterateSpread();
            map.iterateSpread();
            mesh.update(map.tiles);
            rivers.update(map.tiles);
        }
        render();
        root.inform(map.tiles, informId);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.body.append(element);
}


window.addEventListener("load", () => {
    unmarshaler();
});
