
import { VNodeProperties, h } from "maquette";
import { createBuffers } from "../../gpu/buffers";
import { makeCamera } from "../../gpu/camera";
import { createEroder } from "../../gpu/compute/createEroder";
import { noisePass } from "../../gpu/compute/noisePass";
import { normalsPass } from "../../gpu/compute/normalsPass";
import { getDevice } from "../../gpu/globalDevice";
import { scene } from "../../gpu/scene";
import { createDiscSampler } from "../../terrain/discSampler";
import { createBooleanInput } from "../booleanInput";
import { createButton } from "../button";
import { createDropdown } from "../dropdown";
import { setupInputs } from "../inputs";
import { createPanel } from "../panel";
import { createSliderInput } from "../sliderInput";
import "../ui.css";


const downloadBlob = function(data, fileName, mimeType) {
    var blob, url;
    blob = new Blob([data], {
      type: mimeType
    });
    url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName);
    setTimeout(function() {
      return window.URL.revokeObjectURL(url);
    }, 1000);
  };
  
  const downloadURL = function(data, fileName) {
    var a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
  };

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
    const rain = createSliderInput({
        name: "Rain multiplier",
        min: 0,
        max: 10,
        start: 1,
    })
    let generate = () => {};
    const generateButton = createButton({ text: "New Terrain", onclick: () => generate() });
    const erode = createBooleanInput({ name: "Erode" });
    const rendering = createBooleanInput({ name: "Render", start: true });
    const controls = createPanel({
        title: "Controls",
        defaultOpen: true,
        children: [generateButton, erode, rendering]
    });

    const options = createPanel({
        title: "Options",
        defaultOpen: true,
        children: [rain]
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

        const gen = createDiscSampler(() => 8, (x, y) => x*x + y*y < 3000*3000);
        while (gen.step());

        const vs = gen.vertices();
        const buffers = createBuffers(device, vs);

        const camera = makeCamera(device);
        const renderer = scene(device, context, camera, vs, buffers);
        const eroder = createEroder(device, buffers);
        const normals = normalsPass(device, buffers);

        window.addEventListener('resize', () => {
            element.width = window.innerWidth;
            element.height = window.innerHeight;
            camera.resize();
            renderer.resize();
        })

        generate = () => {
            device.queue.submit([noisePass(device, buffers)()]);
            eroder();
            device.queue.submit([normals()]);
        }
        generate();

        let iterations = 3;
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

        let i = 0;

        function frame() {
            i += 1;
            if (rendering.get() && (i % 5 === 0 || !erode.get())) {
                device.queue.submit([normals()]);
                device.queue.writeBuffer(buffers.rain, 0, new Float32Array([rain.get()]))
                camera.update(Math.pow(2, zoom), xrot, yrot);
                renderer.render();
            }
            if (erode.get()) {
                for (let i = 0; i < iterations; i++)
                    eroder();
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
                    controls.realize(),
                    options.realize(),
                ])
            ]);
        }
    }
}