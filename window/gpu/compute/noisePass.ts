import { Buffers } from "../buffers";
import code from "./computeNoise.wgsl";

export function noisePass(device: GPUDevice, buffers: Buffers) {
    const layout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }, {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }],
    });
    const bindGroup = device.createBindGroup({
        layout,
        entries: [{
            binding: 0,
            resource: { buffer: buffers.tiles }
        }, {
            binding: 1,
            resource: { buffer: buffers.positions }
        }]
    });

    const module = device.createShaderModule({ code: code.replace("$BUFFER_SIZE", buffers.instanceCount.toString()) });

    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout]}),
        compute: {
            module,
            entryPoint: "main"
        }
    });
    
    return () => {
        const encoder = device.createCommandEncoder();
        const computer = encoder.beginComputePass();
        computer.setPipeline(computePipeline);
        computer.setBindGroup(0, bindGroup);
        computer.dispatchWorkgroups(Math.ceil(buffers.instanceCount/64));
        computer.end();

        return encoder.finish();
    }
}