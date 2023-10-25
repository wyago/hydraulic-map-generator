import { h } from "maquette";
import { PointLike } from "../../PointLike";
import { globalProjector } from "../../projector";
import "./windSelector.css";

export function createWindSelector(onchange?: (direction: PointLike) => void) {
    let windX = 1;
    let windY = 0;

    let actualWindX = 1;
    let actualWindY = 0;

    let isMouseDown = false;
    const end = () => {
        isMouseDown = false;
        onchange?.({ x: windX, y: -windY });
    }

    const onmousedown = e => {
        windX = e.offsetX / 100 - 1;
        windY = e.offsetY / 100 - 1;
        isMouseDown = true;
    };
    const onmouseleave = end;
    const onmouseup = end;
    
    const onmousemove = e => {
        if (isMouseDown) {
            windX = e.offsetX / 100 - 1;
            windY = e.offsetY / 100 - 1;
        }
    }

    const ontouch = (e: TouchEvent) => {
        const touches = [...e.touches];
        if (touches.length === 1) {
            const bcr = (e.target as HTMLElement).getBoundingClientRect();
            const x = touches[0].clientX - bcr.x;
            const y = touches[0].clientY - bcr.y;
            windX = x / 100 - 1;
            windY = y / 100 - 1;
        }
    }

    return {
        getPreferredWind() {
            return {
                x: windX,
                y: windY
            };
        },
        showWind({x,y}: {x: number,y: number}) {
            actualWindX = x;
            actualWindY = y;
            globalProjector.scheduleRender();
        },
        realize()  {
            return h("details.modal", { open: "" }, [
                h("summary", ["Wind direction"]),
                h("div.wind-selector", [
                    h("svg", {
                        viewBox: "0 0 1 1",
                        width: "200",
                        height: "200",
                        onmousedown,
                        onmouseleave,
                        onmouseup,
                        onmousemove,
                    }, [
                        h("circle", {
                            cx: "0.5",
                            cy: "0.5",
                            r: "0.5",
                            fill: "#fff2",
                            ontouchdown: ontouch,
                            ontouchmove: ontouch,
                        }),
                        h("line", {
                            x1: 0.5,
                            x2: 0.5 + windX*0.5,
                            y1: 0.5,
                            y2: 0.5 + windY*0.5,
                            stroke: "white",
                            "stroke-width": "0.05",
                            "stroke-linecap": "round",
                        }),
                        h("line", {
                            x1: 0.5,
                            x2: 0.5 + actualWindX*0.4,
                            y1: 0.5,
                            y2: 0.5 + actualWindY*0.4,
                            stroke: "#f88",
                            "stroke-width": "0.02",
                            "stroke-linecap": "round",
                        })
                    ])
                ])
            ]);
        }
    }
}