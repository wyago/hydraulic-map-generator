import { h } from "maquette";
import { TopComponent } from "./ui/component";

export let root: TopComponent = {
    realize() {
        return h("body");
    }
}

export function setRoot(component: TopComponent) {
    root = component;
}