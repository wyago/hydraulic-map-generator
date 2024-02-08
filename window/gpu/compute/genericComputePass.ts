export function genericComputePass(device: GPUDevice, count: number, buffers: GPUBuffer[], code: string, uniforms: GPUBuffer[] = []) {
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

    const uniformslayout = device.createBindGroupLayout({
        entries: uniforms.map((_, i) => ({
            binding: i,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        })),
    });
    const uniformsbindGroup = device.createBindGroup({
        layout: uniformslayout,
        entries: uniforms.map((buffer, i) => ({
            binding: i,
            resource: { buffer }
        }))
    });

    const module = device.createShaderModule({ code: code.replace("$BUFFER_SIZE", count.toString()) });

    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout, uniformslayout]}),
        compute: {
            module,
            entryPoint: "main"
        }
    });

    return (computer: GPUComputePassEncoder) => {
        computer.setPipeline(computePipeline);
        computer.setBindGroup(0, bindGroup);
        computer.setBindGroup(1, uniformsbindGroup);
        computer.dispatchWorkgroups(Math.ceil(count/256));
    }
}