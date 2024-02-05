import { Graph } from "../terrain/Graph";
import { Buffers } from "./buffers";
import { Camera } from "./camera";
import landCode from "./landscape.wgsl";
import waterCode from "./water.wgsl";

function makePipeline(device: GPUDevice, shader: GPUShaderModule, bindGroupLayouts: GPUBindGroupLayout[], blend: boolean) {
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
                }, {
                    shaderLocation: 7,
                    offset: 3*4,
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
            bindGroupLayouts
        })
    });
}

export function landscape(device: GPUDevice, context: GPUCanvasContext, camera: Camera, graph: Graph, buffers: Buffers) {
    const landshader = device.createShaderModule({ code: landCode });
    const watershader = device.createShaderModule({ code: waterCode });

    const uniforms = {
        light: device.createBuffer({
            size: 3 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }
    
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        }]
    });

    const landPipeline = makePipeline(device, landshader, [camera.bindGroupLayout, bindGroupLayout], false);
    const waterPipeline = makePipeline(device, watershader, [camera.bindGroupLayout, bindGroupLayout], true);
    
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
            resource: { buffer: uniforms.light, }
        }]
    })

    let depth = device.createTexture({
        size: { width: window.innerWidth, height: window.innerHeight},
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    function resize() {
        depth.destroy();
        depth = device.createTexture({
            size: { width: window.innerWidth, height: window.innerHeight},
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    resize();

    let t = 0;
    return {
        resize,
        render() {
            t += 1;
            
            device.queue.writeBuffer(uniforms.light, 0, new Float32Array([
                //Math.cos(t*0.001 + Math.PI),
                //Math.sin(t*0.001 + Math.PI),
                //Math.cos(t*0.001 + Math.PI)
                0.5, 
                -0.5,
                0.5
            ]));

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
            pass.setPipeline(landPipeline);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setVertexBuffer(0, buffers.positions);
            pass.setVertexBuffer(1, buffers.tiles);
            pass.setVertexBuffer(2, buffers.normals);
            pass.setVertexBuffer(3, buffers.albedo);
            pass.setVertexBuffer(4, buffers.waternormals);
            pass.setBindGroup(0, camera.bindGroup);
            pass.setBindGroup(1, group);
            pass.drawIndexed(indices.length);
            pass.setPipeline(waterPipeline);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setVertexBuffer(0, buffers.positions);
            pass.setVertexBuffer(1, buffers.tiles);
            pass.setVertexBuffer(2, buffers.normals);
            pass.setVertexBuffer(3, buffers.albedo);
            pass.setVertexBuffer(4, buffers.waternormals);
            pass.setBindGroup(0, camera.bindGroup);
            pass.setBindGroup(1, group);
            pass.drawIndexed(indices.length);
            pass.end();
        
            const command = encoder.finish();
            device.queue.submit([command]);
        }
    }
}