import { VNodeChild } from "maquette";

export type Component = {
    realize(): VNodeChild;
}