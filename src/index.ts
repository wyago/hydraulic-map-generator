import { globalProjector } from "./projector";
import { createGenerationUi } from "./ui/generation/generationUi";

window.addEventListener("load", () => {
    const generator = createGenerationUi();

    globalProjector.replace(document.body, () => generator.realize());
});
