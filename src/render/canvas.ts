import * as THREE from 'three';
import { PointLike } from '../map/PointLike';

export function createCanvas(clientmove?: (e: {x: number, y: number}) => void) {
    const scene = new THREE.Scene();
    let camera: THREE.OrthographicCamera;
    let aspect: number;

    const renderer = new THREE.WebGLRenderer();
    const sizeWatcher = () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
        aspect = document.body.clientWidth / document.body.clientHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -1000, 1000);
    };
    sizeWatcher();

    let zoom = 65;
    camera!.scale.setScalar(Math.pow(zoom, 2));

    window.addEventListener("wheel", e => {
        if (e.deltaY > 0) {
            zoom *= 1.1;
        } else {
            zoom *= 0.9;
        }
        camera.scale.setScalar(Math.pow(zoom, 2));
    });

    let down: PointLike | undefined;
    window.addEventListener("mousedown", e => {
        down = { x: e.x, y: e.y };
    });

    window.addEventListener("mousemove", e => {
        if (down) {
            const dx = e.x - down.x;
            const dy = e.y - down.y;
            down = { x: e.x, y: e.y };
            camera.translateX(-dx*zoom*0.1);
            camera.translateY(dy*zoom*0.1);
        }
        const v = new THREE.Vector3((e.clientX / window.innerWidth ) * aspect * 2 - aspect,
            - ( e.clientY / window.innerHeight ) * 2 + 1, 0.5);
        v.unproject(camera);

        clientmove?.({
            x: v.x,
            y: v.y
        })
    })

    window.addEventListener("mouseup", e => { down = undefined});
    window.addEventListener("mouseleave", e => { down = undefined});
    window.addEventListener("mouseout", e => { down = undefined});

    window.addEventListener("resize", sizeWatcher);

    return { scene, renderer, element: renderer.domElement, render() {
        renderer.render(scene, camera);
    }, destroy: () => {window.removeEventListener("resize", sizeWatcher); } };
}