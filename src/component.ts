import { VNode, VNodeChild } from "maquette";

export type Component = {
    realize(): VNodeChild;
}

export type TopComponent = {
    realize(): VNode;
}