import { SimplexNoise } from "ts-perlin-simplex";
import { byMin, clamp } from "../../math";
import { createCanvas } from "../../render/canvas";
import { pointsMesh, riverMesh } from "../../render/mesher";
import { Eroder, EroderConfiguration } from "../../terrain/Eroder";
import { TileSet } from "../../terrain/PointSet";
import { createDiscSampler } from "../../terrain/discSampler";
import { createCodeLink } from "../codeLink";
import { createInfoPanel } from "./infoPanel";
import { createWindSelector } from "./windSelector";

import { VNodeProperties, h } from "maquette";
import { createBooleanInput } from "../booleanInput";
import { createButton } from "../button";
import { createDropdown } from "../dropdown";
import { createNumberInput } from "../numberInput";
import { createPanel } from "../panel";
import "../ui.css";
import { createDiagramPanel } from "./diagram";

function generate(configuration: EroderConfiguration) {
    const gen = createDiscSampler(8, (x, y) => x*x + y*y < 1200*1200);
    while (gen.step());

    const vs = gen.vertices();
    const tiles = new TileSet(vs);

    const map = new Eroder(tiles, configuration);
    initialState(map);
    return map;
}

function setupLoading(map: Eroder, updateMeshes: () => void) {
    const preventer = (e: DragEvent) => e.preventDefault();
    const dropper = (e: DragEvent) => {
        e.preventDefault();

        if (e.dataTransfer && e.dataTransfer.items.length > 0) {
            const item = [...e.dataTransfer.items][0];
            const file = item.getAsFile()!;

            if (file) {
                file.text().then(text => {
                    const model = JSON.parse(text);
                    if (model.tilesetversion < 1) {
                        map.tiles.unmarshal(model);
                        updateMeshes();
                    }
                });
            }
        }
    }
    window.addEventListener("dragenter", preventer);
    window.addEventListener("dragover", preventer);
    window.addEventListener("dragleave", preventer);
    window.addEventListener("dragstart", preventer);
    window.addEventListener("drop", dropper);

    return () => {
        window.removeEventListener("dragenter", preventer);
        window.removeEventListener("dragover", preventer);
        window.removeEventListener("dragleave", preventer);
        window.removeEventListener("dragstart", preventer);
        window.removeEventListener("drop", dropper);
    }
}


function initialState(map: Eroder) {
    const noise = new SimplexNoise();
    const noiseX = new SimplexNoise();
    const noiseY = new SimplexNoise();
    function fbm(noise: SimplexNoise, x: number, y: number) {
        let result = 0;
    
        let mul = 0.5;
        let div = 0.51;
        for (let i = 0; i < 30; ++i) {
            result += noise.noise(x * mul, y * mul) * div;
            mul *= 2;
            div *= 0.51;
        }
        return result;
    }
    
    function wavy(x: number, y: number) {
        x = x * 0.0015 ;
        y = y * 0.0015;
        x += 0.5;
        y += 0.5;
        x = x + fbm(noiseX, x*0.1, y*0.1)*3;
        y = y + fbm(noiseY, x*0.1, y*0.1)*3;
    
        return fbm(noise, x, y);
    }

    for (let i = 0; i < map.tiles.count; ++i) {
        const x = map.tiles.x(i);
        const y = map.tiles.y(i);

        const plateau = clamp(0.7 - Math.sqrt(x*x + y*y) /1200, -0.3, 0.7);
        const elevation = clamp(clamp(plateau + wavy(x,y)*0.5, 0.01, 0.9) + wavy(x,y)*0.1 + 0.1, 0, 1);
        map.tiles.hard[i] = elevation;
        map.tiles.soft.fill(0)
        map.tiles.vegetation.fill(0);
        map.tiles.river.fill(0);
        map.tiles.snow.fill(0);
        map.tiles.occlusion.fill(1);
    }

    map.resetWater();
}

export function createGenerationUi() {
    const configuration = {
        rainfall: createNumberInput({
            name: "Rainfall erosion multiplier",
            start: 1,
        }),
        wind: createNumberInput({
            name: "Wind erosion multiplier",
            start: 1,
        }),
        siltAngle: createNumberInput({
            name: "Silt maximum elevation difference",
            start: 0.09,
        }),
        rockAngle: createNumberInput({
            name: "Rock maximum elevation difference",
            start: 0.13,
        }),
        water: createNumberInput({
            name: "Water height",
            start: 0.25,
        })
    }

    const eroder = generate(configuration);
    let mesh = pointsMesh();
    let rivers = riverMesh();
    let informId = -1;

    eroder.deriveUphills();
    mesh.update(eroder.tiles);
    rivers.update(eroder.tiles);
    rivers.object.visible = false;

    let j = 0;

    const configurator = createPanel({
        title: "Tuning parameters",
        children: [
            configuration.rainfall,
            configuration.wind,
            configuration.siltAngle,
            configuration.rockAngle,
            configuration.water
        ]
    });

    const info = createInfoPanel();
    info.inform(eroder.tiles, 0);

    const controls = {
        erode: createBooleanInput({
            name: "Erode",
            onchange: e => {
                if (!e) {
                    updateMeshes(false);
                }
            }
        }),
        passTime: createBooleanInput({
            name: "Flow standing water",
            onchange: e => {
                if (!e) {
                    updateMeshes(false);
                }
            }
        }),
        showWatersheds: createBooleanInput({
            name: "Show watersheds",
            onchange: e => rivers.object.visible = e
        }),
    }

    const exportTerrain = () => {
        var element = document.createElement('a');

        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(eroder.tiles.marshal()));
        element.setAttribute('download', "map.json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    function updateMeshes(incremental = false) {
        mesh.update(eroder.tiles, incremental);
        if (controls.showWatersheds.get()) {
            rivers.update(eroder.tiles);
        }
    }

    const controlPanel = createPanel({
        title: "Controls",
        defaultOpen: true,
        children: [
            controls.erode,
            controls.passTime,
            controls.showWatersheds,

            createDropdown({
                label: "Rendering mode",
                start: "0",
                values: [{
                    display: "Normal",
                    key: "0",
                }, {
                    display: "Height map",
                    key: "1"
                }, {
                    display: "Occlusion map",
                    key: "2",
                }],
                onchange: e => {
                    mesh.mode(Number.parseInt(e));
                }
            }),

            createButton({
                text: "Generate new terrain",
                onclick: () => {
                    initialState(eroder);
                    updateMeshes();
                }
            }),

            createButton({
                text: "Export",
                onclick: exportTerrain
            })
        ]
    });

    const diagram = createDiagramPanel();

    const windSelector = createWindSelector();

    const destructors = [setupLoading(eroder, updateMeshes)];

    const codeLink = createCodeLink();

    const properties: VNodeProperties = {
        key: "generationcanvas",
        afterCreate(element: Element) {
            destructors.push(setupCanvas(element as HTMLCanvasElement));
        },
        afterRemoved() {
            destructors.forEach(x => x());
        }
    };
    
    function setupCanvas(element: HTMLCanvasElement) {
        const {scene, render, renderer} = createCanvas(element, ({x, y}) => {
            const region = eroder.tiles.vertices.points.search({
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
        scene.add(rivers.object);

        let cancelled = false;
        
        function frame() {
            j += 1;
            if (controls.erode.get()) {
                eroder.passTime();
                eroder.deriveOcclusion(8, windSelector.getPreferredWind());
                eroder.globalRivers();
                //eroder.iterateRivers();
                eroder.fixWater();
                eroder.landslide();
                for (let i = 0; i < 50; ++i) {
                    eroder.spreadWater();
                }

                eroder.deriveUphills();
                updateMeshes();
            } else if (controls.passTime.get()) {
                eroder.fixWater();
                eroder.landslide();
                for (let i = 0; i < 1; ++i) {
                    eroder.spreadWater();
                }
                updateMeshes();
            }
            windSelector.showWind(eroder.getWind());
            render();
            info.inform(eroder.tiles, informId);
            diagram.inform(eroder.tiles, informId);
            if (!cancelled) {
                requestAnimationFrame(frame);
            }
        }
        requestAnimationFrame(frame);

        document.body.append(element);
        return () => {
            element.remove();
            renderer.dispose();
            cancelled = true;
        };
    }

    return {
        realize() {
            return h("body", [
                h("canvas", properties),
                h("div#ui", [
                    controlPanel, windSelector, diagram, configurator, info, codeLink
                ].map(c => c.realize()))
            ]);
        }
    }
}