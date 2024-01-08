import { Buffers } from "../buffers";
import { aquiferPass } from "./aquiferPass";
import { erosionPass } from "./erosionPass";
import { fixWaterPass } from "./fixWaterPass";
import { updatePass } from "./updatePass";

export function createEroder(device: GPUDevice, buffers: Buffers) {
    const erode = erosionPass(device, buffers);
    const fixWater = fixWaterPass(device, buffers);
    const aquifer = aquiferPass(device, buffers);
    const update = updatePass(device, buffers);

    return () => {
        const encoder = device.createCommandEncoder();
        let computer = encoder.beginComputePass();
        fixWater(computer);
        erode(computer);
        update(computer);
        aquifer(computer);
        update(computer);
        computer.end();

        device.queue.submit([encoder.finish()]);
    }
}