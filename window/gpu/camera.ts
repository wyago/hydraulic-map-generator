import { mat4 } from "wgpu-matrix";

export type Camera = {
    uniforms: {
        perspective: GPUBuffer,
        view: GPUBuffer,
        eye: GPUBuffer,
    },
    bindGroupLayout: GPUBindGroupLayout,
    bindGroup: GPUBindGroup,
    resize(): void,
    update(zoom: number, xrot: number, yrot: number): void
}

export function makeCamera(device: GPUDevice): Camera {
    let perspective = mat4.identity();

    const eye  = [300,800,300];
    const target =  [0,0,0];
    const up = [0,1,0];
    const view = mat4.lookAt(eye, target, up);
    const inverseView = mat4.inverse(view);

    const uniforms = {
        perspective: device.createBuffer({
            size: perspective.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        view: device.createBuffer({
            size: view.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        inverseView: device.createBuffer({
            size: inverseView.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        eye: device.createBuffer({
            size: eye.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        time: device.createBuffer({
            size: 1 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
    };
    
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }, {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }, {
            binding: 2,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {}
        }, {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {}
        }, {
            binding: 4,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {}
        }]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
            binding: 0,
            resource: {buffer: uniforms.perspective},
        }, {
            binding: 1,
            resource: { buffer: uniforms.view }
        }, {
            binding: 2,
            resource: { buffer: uniforms.eye }
        }, {
            binding: 3,
            resource: { buffer: uniforms.inverseView }
        }, {
            binding: 4,
            resource: { buffer: uniforms.time }
        }]
    })

    function resize() {
        perspective = mat4.perspective(Math.PI*0.3, window.innerWidth / window.innerHeight, 50, 20000);
        device.queue.writeBuffer(uniforms.perspective, 0, perspective as Float32Array);
    }
    resize();

    let t = 0;
    return {
        resize,
        uniforms,
        bindGroup,
        bindGroupLayout,
        update(zoom: number, xrot: number, yrot: number) {
            t += 1;
            
            const eye  = [
                1/zoom*Math.cos(yrot)*Math.sin(xrot),
                1/zoom*Math.cos(xrot),
                1/zoom*Math.sin(yrot)*Math.sin(xrot)
            ];
            const target =  [
                1/zoom*Math.cos(yrot)*Math.sin(xrot)*0.2,
                0,
                1/zoom*Math.sin(yrot)*Math.sin(xrot)*0.2
            ];
            const up = [0,1,0];
            const view = mat4.lookAt(eye, target, up);
            const inverseView = mat4.inverse(mat4.multiply(perspective, view));
            device.queue.writeBuffer(uniforms.view, 0, view as Float32Array);
            device.queue.writeBuffer(uniforms.inverseView, 0, inverseView as Float32Array);
            device.queue.writeBuffer(uniforms.eye, 0, new Float32Array(eye));
            device.queue.writeBuffer(uniforms.time, 0, new Float32Array([t * 0.01]));
        }
    }
}