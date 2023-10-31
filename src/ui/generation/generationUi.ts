import { clamp } from "../../math";
import { createCanvas } from "../../render/canvas";
import { Eroder, EroderConfiguration } from "../../terrain/Eroder";
import { TileSet } from "../../terrain/PointSet";
import { createDiscSampler } from "../../terrain/discSampler";
import { createCodeLink } from "../codeLink";
import { createInfoPanel } from "./infoPanel";
import { createWindSelector } from "./windSelector";

import { VNodeProperties, h } from "maquette";
import { DistortedNoise } from "../../DistortedNoise";
import { PointLike } from "../../PointLike";
import { implicitVoronoi } from "../../render/implicitVoronoi";
import { singleRiver } from "../../render/singleRiver";
import { starfield } from "../../render/starfield";
import { setRoot } from "../../root";
import { createBooleanInput } from "../booleanInput";
import { createButton } from "../button";
import { createDetailingUi } from "../detailing/detailingUi";
import { createDropdown } from "../dropdown";
import { createNumberInput } from "../numberInput";
import { createPanel } from "../panel";
import "../ui.css";
import { createDiagramPanel } from "./diagram";

function generate(configuration: EroderConfiguration) {
    const gen = createDiscSampler(() => 8, (x, y) => x*x*0.5 + y*y < 2000*2000);
    while (gen.step());

    const vs = gen.vertices();
    const tiles = new TileSet(vs);

    const map = new Eroder(tiles, configuration);
    initialState(map, { x: 1, y: 0 });
    return map;
}

function setupLoading(map: Eroder, wind: () => PointLike, updateMeshes: () => void) {
    const preventer = (e: DragEvent) => e.preventDefault();
    const dropper = (e: DragEvent) => {
        e.preventDefault();

        if (e.dataTransfer && e.dataTransfer.items.length > 0) {
            const item = [...e.dataTransfer.items][0];
            const file = item.getAsFile()!;

            if (file) {
                file.text().then(text => {
                    const model = JSON.parse(text);
                    if (model.tilesetversion < 2) {
                        map.points.unmarshal(model);
                        map.initializeOcclusion(wind());
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

let noise: DistortedNoise;
function initialState(map: Eroder, wind: PointLike) {
    noise = new DistortedNoise(0.0007, 50);

    for (let i = 0; i < map.points.count; ++i) {
        const x = map.points.x(i);
        const y = map.points.y(i);

        const plateau = clamp(0.7 - Math.sqrt(x*x*0.5 + y*y)/1900, -0.5, 0.7);
        const elevation = clamp(clamp(plateau + noise.noise(x,y)*0.6, 0.01, 0.9) + noise.noise(x,y)*0.1 + 0.1, 0, 1);
        map.points.hard[i] = elevation;
    }
    map.points.soft.fill(0)
    map.points.vegetation.fill(0);
    map.points.river.fill(0);
    map.points.snow.fill(0);
    map.points.aquifer.fill(0);
    
    map.resetWater();
    map.initializeOcclusion(wind);
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
            start: 0.05,
        }),
        rockAngle: createNumberInput({
            name: "Rock maximum elevation difference",
            start: 0.07,
        }),
        water: createNumberInput({
            name: "Water height",
            start: 0.25,
        })
    }

    const eroder = generate(configuration);
    let mesh = implicitVoronoi();
    let river = singleRiver();
    let stars = starfield();
    let informId = -1;

    mesh.update(eroder.points);

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
    info.inform(eroder.points, 0);

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
        update: createBooleanInput({
            name: "Update render",
            start: true,
        }),
    }

    const exportTerrain = () => {
        var element = document.createElement('a');

        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(eroder.points.marshal()));
        element.setAttribute('download', "map.json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    function updateMeshes(incremental = false) {
        if (!controls.update.get()) {
            return;
        }
        mesh.update(eroder.points, incremental);
    }

    const controlPanel = createPanel({
        title: "Controls",
        defaultOpen: true,
        children: [
            controls.erode,
            controls.passTime,
            controls.update,

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
                    initialState(eroder, windSelector.getPreferredWind());
                    updateMeshes();
                }
            }),

            createButton({
                text: "Export",
                onclick: exportTerrain
            }),

            createButton({
                text: "Switch to detailing",
                onclick: () => {
                    setRoot(createDetailingUi(eroder.points))
                }
            })
        ]
    });

    const diagram = createDiagramPanel();

    const windSelector = createWindSelector(wind => {
        eroder.initializeOcclusion(wind);
        updateMeshes();
    });

    const destructors = [setupLoading(eroder, () => windSelector.getPreferredWind(), updateMeshes)];

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
            const closest = eroder.points.vertices.closest(x,y,10);
            if (!closest) {
                mesh.select(-1);
                return;
            }

            river.update(eroder.points.fall({ x, y }));
    
            informId = closest;
            mesh.select(informId);
        });
    
        scene.add(mesh.object);
        scene.add(river.object);
        scene.add(stars);

        let cancelled = false;
        function frame() {
            j += 1;
            if (controls.erode.get()) {
                eroder.passTime();
                eroder.fixWater();
                eroder.landslide();
                eroder.spreadSnow();
                for (let i = 0; i < 20; ++i) {
                    eroder.rain();
                    eroder.spreadWater();
                }

                eroder.initializeOcclusion(windSelector.getPreferredWind());
                updateMeshes();
            } else if (controls.passTime.get()) {
                eroder.landslide();
                eroder.fixWater();
                for (let i = 0; i < 20; ++i) {
                    eroder.spreadWater(false);
                }
                eroder.initializeOcclusion(windSelector.getPreferredWind());
                updateMeshes();
            }
            windSelector.showWind(eroder.getWind());
            render();
            info.inform(eroder.points, informId);
            diagram.inform(eroder.points, informId);
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