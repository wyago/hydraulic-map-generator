
export function genericComputePass(device: GPUDevice, count: number, buffers: GPUBuffer[], code: string) {
    const layout = device.createBindGroupLayout({
        entries: buffers.map((_, i) => ({
            binding: i,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        })),
    });
    const bindGroup = device.createBindGroup({
        layout,
        entries: buffers.map((buffer, i) => ({
            binding: i,
            resource: { buffer }
        }))
    });

    const module = device.createShaderModule({ code: code.replace("$BUFFER_SIZE", count.toString()) });

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
        computer.dispatchWorkgroups(Math.ceil(count/64));
    }
}