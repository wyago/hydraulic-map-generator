import { VNodeProperties, h } from "maquette";
import { Gameboard } from "../../gameboard/Gameboard";
import { createCanvas } from "../../render/canvas";
import { TileSet } from "../../terrain/PointSet";

export function createDetailingUi(original: TileSet) {
    const board = new Gameboard(original, 1, 16);
   
    function setupCanvas(element: HTMLCanvasElement) {
        const {scene, render, renderer} = createCanvas(element);
    
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
            ]);
        }
    }
}