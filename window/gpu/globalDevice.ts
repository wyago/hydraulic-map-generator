let globalDevice: GPUDevice;
export async function getDevice() {
    if (globalDevice) {
        return globalDevice;
    }
    const adapter = await navigator.gpu.requestAdapter();
    globalDevice = (await adapter!.requestDevice())!;
    return globalDevice;
}