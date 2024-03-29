import { Buffers } from "../buffers";
import computeAquiferCode from "./computeAquifer.wgsl";
import erosionCode from "./computeErosion.wgsl";
import fixWaterCode from "./computeFixWater.wgsl";
import landslideCode from "./computeLandslide.wgsl";
import updateCode from "./computeUpdate.wgsl";
import zeroCode from "./computeZero.wgsl";
import { genericComputePass } from "./genericComputePass";

export function createEroder(device: GPUDevice, buffers: Buffers) {
    const erode = genericComputePass(device, buffers.instanceCount, [
        buffers.tiles,
        buffers.tileAdjacents,
        buffers.tileAdjacentIndices,
        buffers.tileBuffer,
        buffers.targetIndices
    ], erosionCode);
    const landslide = genericComputePass(device, buffers.instanceCount, [
        buffers.tiles,
        buffers.tileAdjacents,
        buffers.tileAdjacentIndices,
        buffers.tileBuffer,
        buffers.targetIndices
    ], landslideCode);
    const fixWater =genericComputePass(device, buffers.instanceCount, [
        buffers.tiles,
        buffers.tileAdjacents,
        buffers.tileAdjacentIndices,
        buffers.normals
    ], fixWaterCode, [
        buffers.rain
    ]);
    const aquifer = genericComputePass(device, buffers.instanceCount, [
        buffers.tiles,
        buffers.tileAdjacents,
        buffers.tileAdjacentIndices,
        buffers.tileBuffer,
        buffers.targetIndices
    ], computeAquiferCode);
    const update = genericComputePass(device, buffers.instanceCount, [
        buffers.tiles,
        buffers.tileBuffer,
        buffers.targetIndices,
        buffers.tileAdjacents,
        buffers.tileAdjacentIndices
    ], updateCode);
    const zero = genericComputePass(device, buffers.instanceCount, [
        buffers.tileBuffer,
    ], zeroCode);

    return () => {
        const encoder = device.createCommandEncoder();
        let computer = encoder.beginComputePass();
        fixWater(computer);
        erode(computer);
        update(computer);
        zero(computer);

        landslide(computer);
        update(computer);
        zero(computer);

        aquifer(computer);
        update(computer);
        zero(computer);
        computer.end();

        device.queue.submit([encoder.finish()]);
    }
}