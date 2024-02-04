
import { VNodeProperties, h } from "maquette";
import { createBuffers } from "../../gpu/buffers";
import { createEroder } from "../../gpu/compute/createEroder";
import { noisePass } from "../../gpu/compute/noisePass";
import { normalsPass } from "../../gpu/compute/normalsPass";
import { getDevice } from "../../gpu/globalDevice";
import { landscape } from "../../gpu/landscape";
import { setupInputs } from "../../render/inputs";
import { createDiscSampler } from "../../terrain/discSampler";
import { createBooleanInput } from "../booleanInput";
import { createButton } from "../button";
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
            }, {
                key: "2",
                display: "Rocks"
            }]
        });
    let generate = () => {};
    const generateButton = createButton({ text: "New Terrain", onclick: () => generate() });
    const erode = createBooleanInput({ name: "Erode" });
    const options = createPanel({
        title: "Options",
        defaultOpen: true,
        children: [generateButton, erode]
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

        const gen = createDiscSampler(() => 8, (x, y) => x*x + y*y < 2000*2000);
        while (gen.step());
    
        const vs = gen.vertices();
        const buffers = createBuffers(device, vs);


        //const render = implicitVoronoiRenderer(device, context, buffers, depth);
        const renderer = landscape(device, context, vs, buffers);
        const eroder = createEroder(device, buffers);
        const normals = normalsPass(device, buffers);

        generate = () => {
            device.queue.submit([noisePass(device, buffers)()]);
            eroder();
            device.queue.submit([normals()]);
        }
        generate();

        let iterations = 5;
        let xrot = 1;
        let yrot = 0;
        let zoom = -10;
        setupInputs(element, {
            move(position, delta) {
                if (delta) {
                    xrot -= delta.y * 0.01;
                    yrot += delta.x * 0.01;
                    if (xrot > Math.PI * 0.45) {
                        xrot = Math.PI * 0.45;
                    } else if (xrot < Math.PI * 0.1) {
                        xrot = Math.PI * 0.1;
                    }
                }
            },
            zoom(multiplier) {
                zoom *= multiplier;
            }
        })

        function frame() {
            renderer.render(Math.pow(2, zoom), xrot, yrot);
            if (erode.get()) {
                for (let i = 0; i < iterations; i++)
                    eroder();
                device.queue.submit([normals()]);
            }
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