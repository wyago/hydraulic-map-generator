import { PointLike } from "../PointLike";

export type InputOptions = {
    zoom: (multiplier: number) => void,
    move: (position: PointLike, delta?: PointLike) => void,
}

type TouchState = {
    state: "moving";
    last: PointLike;
} | {
    state: "zooming";
    lastDistance: number;
} | { 
    state: "none"
}

export function setupMouse(element: HTMLElement, options: InputOptions) {
    window.addEventListener("wheel", e => {
        if (e.deltaY > 0) {
            options.zoom(1.05);
        } else {
            options.zoom(0.95);
        }
    });

    let down: {x:number,y:number} | undefined;
    element.addEventListener("mousedown", e => {
        e.preventDefault();
        down = { x: e.x, y: e.y };
    });

    element.addEventListener("mousemove", e => {
        e.preventDefault();
        if (down) {
            options.move(
                { x: e.clientX, y: e.clientY }, 
                { x: e.x - down.x, y: e.y - down.y });
            down.x = e.clientX;
            down.y = e.clientY;
        } else {
            options.move(
                { x: e.clientX, y: e.clientY });
        }
    })

    element.addEventListener("mouseup", e => { down = undefined});
    element.addEventListener("mouseleave", e => { down = undefined});
    element.addEventListener("mouseout", e => { down = undefined});
}

export function setupTouch(element: HTMLElement, options: InputOptions) {
    let state: TouchState = { state: "none" };

    element.addEventListener("touchstart", e => {
        e.preventDefault();

        const touches = [...e.touches];
        if (touches.length === 1) {
            const next = {
                x: touches[0].clientX,
                y: touches[0].clientY,
            };
            state = {
                state: "moving",
                last: next,
            }
            options.move(next);
        } else if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            state = {
                state: "zooming",
                lastDistance: Math.sqrt(dx*dx + dy*dy)
            }
        }
    });

    element.addEventListener("touchmove", e => {
        e.preventDefault();

        const touches = [...e.touches];
        if (touches.length === 1 && state.state === "moving") {
            const next = {
                x: touches[0].clientX,
                y: touches[0].clientY,
            };
            options.move(next, {
                x: next.x - state.last.x,
                y: next.y - state.last.y,
            });
            state.last = next;
        } else if (touches.length === 2 && state.state === "zooming") {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            options.zoom(state.lastDistance / distance);
            state.lastDistance = distance;
        } else {
            state = { state: "none" };
        }
    });

    element.addEventListener("touchend", e => {
        state = { state: "none" };
    });
}

export function setupInputs(element: HTMLElement, options: InputOptions) {
    setupMouse(element, options);
    setupTouch(element, options);
}