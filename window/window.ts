import { globalProjector } from "./projector";
import { root, setRoot } from "./root";
import { createGpuUi } from "./ui/gpu/gpuUi";

window.addEventListener("load", () => {
    setRoot(createGpuUi());

    globalProjector.replace(document.body, () => root.realize());
});
