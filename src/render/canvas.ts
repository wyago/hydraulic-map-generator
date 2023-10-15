import * as THREE from 'three';

export function createCanvas(clientmove?: (e: {x: number, y: number}) => void) {
    const scene = new THREE.Scene();
    let camera: THREE.OrthographicCamera;
    let aspect: number;

    let zoom = 30;
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(
        Math.pow(6/255,2),
        Math.pow(17/255, 2),
        Math.pow(27/255, 2)
    ));
    const sizeWatcher = () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
        aspect = document.body.clientWidth / document.body.clientHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -1000, 1000);
        camera.scale.setScalar(Math.pow(zoom, 2));
    };
    sizeWatcher();

    camera!.scale.setScalar(Math.pow(zoom, 2));

    window.addEventListener("wheel", e => {
        if (e.deltaY > 0) {
            zoom *= 1.1;
        } else {
            zoom *= 0.9;
        }
        if (zoom < 4) {
            zoom = 4;
        }
        camera.scale.setScalar(Math.pow(zoom, 2));
    });

    let down: {x:number,y:number} | undefined;
    renderer.domElement.addEventListener("mousedown", e => {
        e.preventDefault();
        down = { x: e.x, y: e.y };
    });

    renderer.domElement.addEventListener("mousemove", e => {
        e.preventDefault();
        if (down) {
            const dx = e.x - down.x;
            const dy = e.y - down.y;
            down = { x: e.x, y: e.y };
            const v = new THREE.Vector3((dx / window.innerHeight) * 2,
                (dy / window.innerHeight) * 2, 0.5);
            camera.translateX(-v.x * Math.pow(zoom, 2));
            camera.translateY(v.y * Math.pow(zoom, 2));
        }
        const v = new THREE.Vector3((e.pageX / window.innerHeight ) / aspect * 2 - 1,
            - ( e.pageY / window.innerHeight ) * 2 + 1, 0.5);
        v.unproject(camera);

        clientmove?.({
            x: v.x,
            y: v.y
        })
    })

    renderer.domElement.addEventListener("mouseup", e => { down = undefined});
    renderer.domElement.addEventListener("mouseleave", e => { down = undefined});
    renderer.domElement.addEventListener("mouseout", e => { down = undefined});

    window.addEventListener("resize", sizeWatcher);

    return { scene, renderer, element: renderer.domElement, render() {
        renderer.render(scene, camera);
    }, destroy: () => {window.removeEventListener("resize", sizeWatcher); } };
}