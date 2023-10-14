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
import { createConfigurator } from "./ui/configurator";
import { createControls } from "./ui/controls";
import { createInfoPanel } from "./ui/infoPanel";
import { createWindSelector } from "./ui/windSelector";

function generate() {
    const gen = createDiscSampler(8, (x, y) => x*x + y*y*2 < 1100*1100);
    while (gen.step());

    const vs = gen.vertices();
    const tiles = new TileSet(vs);

    const map = new Map(tiles);
    initialState(map);
    return map;
}

function initialState(map: Map) {
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
        x = x * 0.003;
        y = y * 0.003;
        x += 0.5;
        y += 0.5;
        x = x + fbm(noiseX, x*0.1, y*0.1)*3;
        y = y + fbm(noiseY, x*0.1, y*0.1)*3;
    
        return fbm(noise, x, y);
    }

    for (let i = 0; i < map.tiles.count; ++i) {
        const x = map.tiles.x(i);
        const y = map.tiles.y(i);

        const plateau = clamp(0.6 - Math.sqrt(x*x*0.7 + y*y*2.5) * 0.0008, -0.3, 0.6);
        const elevation = clamp(clamp(plateau + wavy(x,y)*0.5, 0.01, 0.8) + wavy(x,y)*0.1 + 0.1, 0, 1);
        map.tiles.hard[i] = elevation;
        map.tiles.soft[i] = 0;
        map.tiles.fog[i] = 0;
        map.tiles.vegetation[i] = 0;
        map.tiles.river[i] = 0;
    }

    map.resetWater();
}

function setupLoading(map: Map, updateMeshes: () => void) {
    document.body.addEventListener("dragenter", (e) => e.preventDefault());
    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("dragleave", (e) => e.preventDefault());
    document.body.addEventListener("dragstart", (e) => e.preventDefault());
    document.body.addEventListener("drop", (e) => {
        e.preventDefault();

        if (e.dataTransfer && e.dataTransfer.items.length > 0) {
            const item = [...e.dataTransfer.items][0];
            const file = item.getAsFile()!;

            if (file) {
                file.text().then(text => {
                    const model = JSON.parse(text);
                    if (model.istileset) {
                        map.tiles.unmarshal(model);
                        updateMeshes();
                    }
                });
            }
        }
    });
}

function eroder() {
    const map = generate();

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
    let passTime = false;
    let watersheds = false;
    let j = 0;

    const configurator = createConfigurator({
        options: [{
            name: "Rainfall erosion multiplier",
            start: 1,
            onchange: value => map.setRiverMultiplier(value)
        }, {
            name: "Wind erosion multiplier",
            start: 1,
            onchange: value => map.setWindMultiplier(value)
        }, {
            name: "Landslide angle",
            start: 0.1,
            onchange: value => map.setLandslideAngle(value)
        }, {
            name: "Water height",
            start: 0.25,
            onchange: value => map.setWaterHeight(value)
        }]
    });
    const info = createInfoPanel();
    info.inform(map.tiles, 0);

    const windSelector = createWindSelector();
    const controls = createControls({
        options: [{
            name: "Erode (& pass time)",
            onchange: e => eroding = e,
        }, {
            name: "Pass time",
            onchange: e => passTime = e,
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
            name: "Generate new terrain",
            onclick: () => {
                initialState(map);
                mesh.update(map.tiles);
                if (watersheds) {
                    rivers.update(map.tiles);
                }
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
        }, {
            name: "Export",
            onclick: () => {
                var element = document.createElement('a');

                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(map.tiles.marshal()));
                element.setAttribute('download', "map.json");

                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);
            }
        }]
    });

    function updateMeshes() {
        mesh.update(map.tiles);
        if (watersheds) {
            rivers.update(map.tiles);
        }
    }

    setupLoading(map, updateMeshes);
    
    const root = createUi({ panels: [controls, windSelector, configurator, info] });
    globalProjector.append(document.body, () => root.realize());

    function frame() {
        j += 1;
        if (eroding || passTime) {
            map.passTime();
        }

        if (eroding) {
            map.fog(8, windSelector.getPreferredWind());
            map.iterateRivers();
            map.fixWater();
            map.landslide();
        }

        if (passTime || eroding) {
            for (let i = 0; i < 5; ++i) {
                map.spreadWater();
            }

            map.deriveUphills();
            map.deriveDownhills();
            mesh.update(map.tiles);
            if (watersheds) {
                rivers.update(map.tiles);
            }
        }
        windSelector.showWind(map.getWind());
        render();
        info.inform(map.tiles, informId);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

window.addEventListener("load", () => {
    eroder();
});
