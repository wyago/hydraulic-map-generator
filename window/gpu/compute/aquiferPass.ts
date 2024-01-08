import { Buffers } from "../buffers";
import code from "./computeAquifer.wgsl";

export function aquiferPass(device: GPUDevice, buffers: Buffers) {
    const layout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }, {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }, {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }, {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }, {
            binding: 4,
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
            resource: { buffer: buffers.tileAdjacents }
        }, {
            binding: 2,
            resource: { buffer: buffers.tileAdjacentIndices }
        }, {
            binding: 3,
            resource: { buffer: buffers.tileBuffer }
        }, {
            binding: 4,
            resource: { buffer: buffers.targetIndices }
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

    return (computer: GPUComputePassEncoder) => {
        computer.setPipeline(computePipeline);
        computer.setBindGroup(0, bindGroup);
        computer.dispatchWorkgroups(Math.ceil(buffers.instanceCount/64));
    }
}