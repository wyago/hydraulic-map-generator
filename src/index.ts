import { globalProjector } from "./projector";
import { createUi } from "./ui/ui";

import './index.css';
import { generateMap } from "./render/map";

window.addEventListener("load", () => {
    const root = createUi();

    globalProjector.append(document.body, () => root.realize());
    generateMap(1000);
});
