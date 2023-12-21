import * as THREE from 'three';
import { setupInputs } from './inputs';

export function createCanvas(canvas: HTMLCanvasElement, clientmove?: (e: {x: number, y: number}) => void) {
    const scene = new THREE.Scene();
    let camera: THREE.OrthographicCamera;
    let aspect: number;

    let zoom = 30;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const sizeWatcher = () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
        aspect = document.body.clientWidth / document.body.clientHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -1000, 1000);
        camera.scale.setScalar(Math.pow(zoom, 2));
    };
    sizeWatcher();

    camera!.scale.setScalar(Math.pow(zoom, 2));

    setupInputs(renderer.domElement, {
        move(position, delta) {
            if (delta) {
                const v = new THREE.Vector3(
                    (delta.x / window.innerHeight) * 2,
                    (delta.y / window.innerHeight) * 2, 0.5);
                camera.translateX(-v.x * Math.pow(zoom, 2));
                camera.translateY(v.y * Math.pow(zoom, 2));
            }
            const v = new THREE.Vector3(
                (position.x / window.innerHeight) / aspect * 2 - 1,
                -(position.y / window.innerHeight) * 2 + 1, 0.5);
            v.unproject(camera);

            clientmove?.({
                x: v.x,
                y: v.y
            }) 
        },
        zoom(multiplier) {
            zoom *= multiplier;
            if (zoom < 4) {
                zoom = 4;
            } else if (zoom > 100) {
                zoom = 100;
            }
            camera.scale.setScalar(Math.pow(zoom, 2));
        },
    });

    window.addEventListener("resize", sizeWatcher);

    return { scene, renderer, element: renderer.domElement, render() {
        renderer.render(scene, camera);
    }, destroy: () => {window.removeEventListener("resize", sizeWatcher); } };
}