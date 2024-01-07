
import { VNodeProperties, h } from "maquette";
import { createBuffers } from "../../gpu/buffers";
import { erosionPass } from "../../gpu/compute/erosionPass";
import { fixWaterPass } from "../../gpu/compute/fixWaterPass";
import { normalsPass } from "../../gpu/compute/normalsPass";
import { getDevice } from "../../gpu/globalDevice";
import { implicitVoronoiRenderer } from "../../gpu/implicitvoronoi";
import { createDiscSampler } from "../../terrain/discSampler";
import "../ui.css";

export function createGpuUi() {
    async function setupCanvas(element: HTMLCanvasElement) {
        element.width = window.innerWidth;
        element.height = window.innerHeight;
        const context = element.getContext("webgpu")!;
        const device = await getDevice();
        context.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        });

        const depth = device.createTexture({
            size: { width: window.innerWidth, height: window.innerHeight},
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }).createView();

        const gen = createDiscSampler(() => 8, (x, y) => x*x + y*y < 8000*8000);
        while (gen.step());
    
        const vs = gen.vertices();
        const buffers = createBuffers(device, vs);

        const render = implicitVoronoiRenderer(device, context, buffers, depth);
        const erode = erosionPass(device, buffers);
        const normals = normalsPass(device, buffers);
        const fixWater = fixWaterPass(device, buffers);

        let zoom = -12;
        element.addEventListener("wheel", e => {
            zoom -= e.deltaY * 0.002;
        });

        function frame() {
            render(Math.pow(2, zoom));
            for (let i = 0; i < 10; i++)
                device.queue.submit([erode(), normals(), fixWater()]);
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        document.body.append(element);
    }
    
    const properties: VNodeProperties = {
        key: "generationcanvas",
        afterCreate(element: Element) {
            setupCanvas(element as HTMLCanvasElement);
        }
    };

    return {
        realize() {
            return h("body", [
                h("canvas", properties),
            ]);
        }
    }
}