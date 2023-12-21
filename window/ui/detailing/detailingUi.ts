import { VNodeProperties, h } from "maquette";
import { Gameboard } from "../../gameboard/Gameboard";
import { createCanvas } from "../../render/canvas";
import { implicitVoronoi } from "../../render/implicitVoronoi";
import { TileSet } from "../../terrain/PointSet";
import { createControls } from "./controls";

export function createDetailingUi(original: TileSet) {
    const board = new Gameboard(original);
    board.deriveRivers();

    const exportTerrain = () => {
        var element = document.createElement('a');

        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(board.marshal())));
        element.setAttribute('download', "map.json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    const controlPanel = createControls(() => {
        board.setRiverScale(controlPanel.controls.riverScale.get());
    }, exportTerrain);
    
   
    function setupCanvas(element: HTMLCanvasElement) {
        const {scene, render, renderer} = createCanvas(element);
    
        renderer.sortObjects = false;
        const voronoi = implicitVoronoi();
        voronoi.update(original);
        scene.add(voronoi.object);
        scene.add(board.renderObject());

        let cancelled = false;
        function frame() {
            render();
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

    let dispose = new Array<() => void>();

    const properties: VNodeProperties = {
        key: "detailingcanvas",
        afterCreate(element) {
            dispose.push(setupCanvas(element as HTMLCanvasElement));
        },
        afterRemoved() {
            dispose.forEach(d => d());
        }
    }

    return {
        realize() {
            return h("body", [
                h("canvas", properties),
                h("div#ui", [
                    controlPanel.realize()
                ])
            ]);
        }
    }
}
