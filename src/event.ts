
export function realizeMouse(canvas: HTMLCanvasElement, e: MouseEvent) {
    const x = -1*canvas.clientWidth/canvas.clientHeight + e.clientX / canvas.clientHeight * 2;
    const y = 1 - e.clientY / canvas.clientHeight * 2;
    return {x,y};
}