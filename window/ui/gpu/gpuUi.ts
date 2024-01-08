
import { VNodeProperties, h } from "maquette";
import { createBuffers } from "../../gpu/buffers";
import { createEroder } from "../../gpu/compute/createEroder";
import { noisePass } from "../../gpu/compute/noisePass";
import { normalsPass } from "../../gpu/compute/normalsPass";
import { getDevice } from "../../gpu/globalDevice";
import { implicitVoronoiRenderer } from "../../gpu/implicitvoronoi";
import { createDiscSampler } from "../../terrain/discSampler";
import { createDropdown } from "../dropdown";
import { createPanel } from "../panel";
import "../ui.css";

export function createGpuUi() {
    const mode = createDropdown({
            label: "Mode",
            start: "Normal",
            values: [{
                key: "0",
                display: "Normal"
            }, {
                key: "1",
                display: "Height"
            }]
        });
    const options = createPanel({
        title: "Options",
        children: [mode]
    })

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

        const gen = createDiscSampler(() => 8, (x, y) => x*x + y*y < 3000*3000);
        while (gen.step());
    
        const vs = gen.vertices();
        const buffers = createBuffers(device, vs);

        device.queue.submit([noisePass(device, buffers)()]);

        const render = implicitVoronoiRenderer(device, context, buffers, depth);
        const eroder = createEroder(device, buffers);
        const normals = normalsPass(device, buffers);

        let zoom = -12;
        element.addEventListener("wheel", e => {
            zoom -= e.deltaY * 0.002;
        });

        function frame() {
            render(Math.pow(2, zoom), +mode.get());
            for (let i = 0; i < 1; i++)
                eroder();
            device.queue.submit([normals()]);
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
                h("div#ui", [
                    options.realize()
                ])
            ]);
        }
    }
}