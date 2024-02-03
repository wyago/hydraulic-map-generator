import { mat4 } from "wgpu-matrix";
import { Graph } from "../terrain/Graph";
import { Buffers } from "./buffers";
import landCode from "./landscape.wgsl";
import waterCode from "./water.wgsl";

function makePipeline(device: GPUDevice, shader: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout, blend: boolean) {
    return device.createRenderPipeline({
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
                    shaderLocation: 3,
                    offset: 0*4,
                    format: "float32" as const 
                }, {
                    shaderLocation: 4,
                    offset: 1*4,
                    format: "float32" as const 
                }, {
                    shaderLocation: 5,
                    offset: 2*4,
                    format: "float32" as const 
                }],
                stepMode: "vertex" as const,
                arrayStride: 4*6
            }, {
                attributes: [{
                    shaderLocation: 1,
                    offset: 0,
                    format: "float32x3" as const 
                }],
                stepMode: "vertex" as const,
                arrayStride: 4*4
            }, {
                attributes: [{
                    shaderLocation: 2,
                    offset: 0,
                    format: "float32x3" as const 
                }],
                stepMode: "vertex" as const,
                arrayStride: 4*4
            }, {
                attributes: [{
                    shaderLocation: 6,
                    offset: 0,
                    format: "float32x3" as const 
                }],
                stepMode: "vertex" as const,
                arrayStride: 4*4
            }],
        },
        fragment: {
            module: shader,
            entryPoint: "fragment_main",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat(),
                blend: blend ? {
                    color: {
                        srcFactor: 'src-alpha',
                        dstFactor: 'one',
                        operation: "add"
                    },
                    alpha: {
                        srcFactor: 'zero',
                        dstFactor: 'one',
                        operation: "add"
                    }
                } : undefined
            }]
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less' as const,
            format: 'depth24plus'
        },
        primitive: {
            topology: "triangle-list"
        },
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        })
    });
}

export function landscape(device: GPUDevice, context: GPUCanvasContext, graph: Graph, buffers: Buffers) {
    let perspective = mat4.identity();
    const landshader = device.createShaderModule({ code: landCode });
    const watershader = device.createShaderModule({ code: waterCode });

    const eye  = [300,800,300];
    const target =  [0,0,0];
    const up = [0,1,0];
    const view = mat4.lookAt(eye, target, up);

    const uniforms = {
        perspective: device.createBuffer({
            size: perspective.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        view: device.createBuffer({
            size: view.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        eye: device.createBuffer({
            size: eye.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }),
        time: device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }
    
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
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }, {
            binding: 3,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }]
    });

    const pipeline1 = makePipeline(device, landshader, bindGroupLayout, false);
    const pipeline2 = makePipeline(device, watershader, bindGroupLayout, true);
    
    const indices = new Array<number>();
    for (let i = 0; i < graph.count; ++i) {
        const adjacents = buffers.adjacents[i];
        const count = adjacents.length;
        for (let j = 0; j < count; ++j) {
            const next = (j + 1) % count;
            indices.push(i, adjacents[j], adjacents[next]);
        }
    }
    const indexBuffer = device.createBuffer({
        size: indices.length * Int32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, new Int32Array(indices));

    const group = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
            binding: 0,
            resource: {buffer: uniforms.perspective},
        }, {
            binding: 1,
            resource: { buffer: uniforms.view, }
        }, {
            binding: 2,
            resource: { buffer: uniforms.eye, }
        }, {
            binding: 3,
            resource: { buffer: uniforms.time, }
        }]
    })

    let depth = device.createTexture({
        size: { width: window.innerWidth, height: window.innerHeight},
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    function resize(width: number, height: number) {
        depth.destroy();
        depth = device.createTexture({
            size: { width: window.innerWidth, height: window.innerHeight},
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        perspective = mat4.perspective(Math.PI*0.3, width / height, 50, 20000);
        device.queue.writeBuffer(uniforms.perspective, 0, perspective as Float32Array);
        device.queue.writeBuffer(uniforms.view, 0, view as Float32Array);
    }
    resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
        resize(window.innerWidth, window.innerHeight);
    })

    let t = 0;
    return {
        resize,
        render(zoom: number, xrot: number, yrot: number) {
            t += 1;
            
            const eye  = [
                1/zoom*Math.cos(yrot)*Math.sin(xrot),
                1/zoom*Math.cos(xrot),
                1/zoom*Math.sin(yrot)*Math.sin(xrot)
            ];
            const target =  [0,0,0];
            const up = [0,1,0];
            const view = mat4.lookAt(eye, target, up);
            device.queue.writeBuffer(uniforms.view, 0, view as Float32Array);
            device.queue.writeBuffer(uniforms.eye, 0, new Float32Array(eye));
            device.queue.writeBuffer(uniforms.time, 0, new Float32Array([t*0.1]));

            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear" as const,
                    storeOp: "store" as const,
                    view: context.getCurrentTexture().createView(),
                }],
                depthStencilAttachment: {
                    view: depth.createView(),
                    depthClearValue: 1,
                    depthLoadOp: 'clear' as const,
                    depthStoreOp: 'store' as const,
                }
            })
            pass.setPipeline(pipeline1);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setVertexBuffer(0, buffers.positions);
            pass.setVertexBuffer(1, buffers.tiles);
            pass.setVertexBuffer(2, buffers.normals);
            pass.setVertexBuffer(3, buffers.albedo);
            pass.setVertexBuffer(4, buffers.waternormals);
            pass.setBindGroup(0, group);
            pass.drawIndexed(indices.length);
            pass.setPipeline(pipeline2);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setVertexBuffer(0, buffers.positions);
            pass.setVertexBuffer(1, buffers.tiles);
            pass.setVertexBuffer(2, buffers.normals);
            pass.setVertexBuffer(3, buffers.albedo);
            pass.setVertexBuffer(4, buffers.waternormals);
            pass.setBindGroup(0, group);
            pass.drawIndexed(indices.length);
            pass.end();
        
            const command = encoder.finish();
            device.queue.submit([command]);
        }
    }
}