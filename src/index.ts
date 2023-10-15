import { globalProjector } from "./projector";
import { root, setRoot } from "./root";
import { createGenerationUi } from "./ui/generation/generationUi";

window.addEventListener("load", () => {
    setRoot(createGenerationUi());

    globalProjector.replace(document.body, () => root.realize());
});
