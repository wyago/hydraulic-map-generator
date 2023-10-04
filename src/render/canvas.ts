import * as THREE from 'three';

export function createCanvas() {
    const scene = new THREE.Scene();
    let camera: THREE.OrthographicCamera;

    const renderer = new THREE.WebGLRenderer();
    const sizeWatcher = () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
        const aspect = document.body.clientWidth / document.body.clientHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -1000, 1000);
    };
    sizeWatcher();

    window.addEventListener("wheel", e => {
        if (e.deltaY > 0) {
            camera.scale.multiplyScalar(1.5);
        } else {
            camera.scale.multiplyScalar(0.5);
        }
    })

    window.addEventListener("resize", sizeWatcher);

    return { scene, renderer, element: renderer.domElement, render() {
        renderer.render(scene, camera);
    }, destroy: () => {window.removeEventListener("resize", sizeWatcher); } };
}