import { Buffers } from "../buffers";
import { erosionPass } from "./erosionPass";
import { fixWaterPass } from "./fixWaterPass";
import { updatePass } from "./updatePass";

export function createEroder(device: GPUDevice, buffers: Buffers) {
    const erode = erosionPass(device, buffers);
    const fixWater = fixWaterPass(device, buffers);
    const update = updatePass(device, buffers);

    function d(f: any) {
        const encoder = device.createCommandEncoder();
        let computer = encoder.beginComputePass();
        f(computer);
        computer.end();
        return encoder.finish();
    }

    return () => {
        /*const encoder = device.createCommandEncoder();
        let computer = encoder.beginComputePass();
        fixWater(computer);
        computer.end();
        computer = encoder.beginComputePass();
        erode(computer);
        computer.end();

        computer = encoder.beginComputePass();
        update(computer);
        computer.end();*/

        device.queue.submit([d(fixWater), d(erode), d(update)]);
    }
}