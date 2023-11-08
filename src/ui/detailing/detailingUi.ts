import { VNodeProperties, h } from "maquette";
import { Gameboard } from "../../gameboard/Gameboard";
import { createCanvas } from "../../render/canvas";
import { implicitVoronoi } from "../../render/implicitVoronoi";
import { TileSet } from "../../terrain/PointSet";
import { createControls } from "./controls";

export function createDetailingUi(original: TileSet) {
    const board = new Gameboard(original);
    board.deriveRivers();

    const controlPanel = createControls(() => {
        board.setRiverScale(controlPanel.controls.riverScale.get());
    })
   
    function setupCanvas(element: HTMLCanvasElement) {
        const {scene, render, renderer} = createCanvas(element, ({x, y}) => {
            const closest = board.graph.closest(x,y,10);
            if (!closest) {
                return;
            }

            console.log(board.tiles[closest].features.map(x => x.name).join(", "));
        });
    
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
