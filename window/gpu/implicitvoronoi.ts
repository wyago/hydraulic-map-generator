import { Buffers } from "./buffers";
import code from "./render.wgsl";

export function implicitVoronoiRenderer(device: GPUDevice, context: GPUCanvasContext, buffers: Buffers, depth: GPUTextureView) {
    const shader = device.createShaderModule({ code });

    const uniforms = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }]
    });

    const pipeline = device.createRenderPipeline({
        vertex: {
            module: shader,
            entryPoint: "vertex_main",
            buffers: [{
                attributes: [{
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x2" as const
                }],
                stepMode: "vertex" as const,
                arrayStride: 4*2
            }, {
                attributes: [{
                    shaderLocation: 1,
                    offset: 0,
                    format: "float32x2" as const 
                }],
                stepMode: "instance" as const,
                arrayStride: 4*2
            }, {
                attributes: [{
                    shaderLocation: 2,
                    offset: 0,
                    format: "float32" as const 
                }, {
                    shaderLocation: 3,
                    offset: 2*4,
                    format: "float32" as const 
                }, {
                    shaderLocation: 5,
                    offset: 1*4,
                    format: "float32" as const 
                }],
                stepMode: "instance" as const,
                arrayStride: 4*6
            }, {
                attributes: [{
                    shaderLocation: 4,
                    offset: 0,
                    format: "float32x3" as const 
                }],
                stepMode: "instance" as const,
                arrayStride: 4*4
            }],
        },
        fragment: {
            module: shader,
            entryPoint: "fragment_main",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less' as const,
            format: 'depth24plus'
        },
        primitive: {
            topology: "triangle-strip"
        },
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        })
    });

    const group = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
            binding: 0,
            resource: {buffer: uniforms},
        }]
    })

    let pastZoom = 0;

    return (zoom: number) => {
        if (zoom != pastZoom) {
            pastZoom=zoom;
            device.queue.writeBuffer(uniforms, 0, new Float32Array([zoom]));
        }
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: "clear" as const,
                storeOp: "store" as const,
                view: context.getCurrentTexture().createView(),

            }],
            depthStencilAttachment: {
                view: depth,
                depthClearValue: 1,
                depthLoadOp: 'clear' as const,
                depthStoreOp: 'store' as const,
            }
        })
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, buffers.triangle);
        pass.setVertexBuffer(1, buffers.positions);
        pass.setVertexBuffer(2, buffers.tileProperties);
        pass.setVertexBuffer(3, buffers.normals);;
        pass.setBindGroup(0, group);
        pass.draw(4, buffers.instanceCount);
        pass.end();
    
        const command = encoder.finish();
        device.queue.submit([command]);
    }
}