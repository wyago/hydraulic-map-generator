import * as THREE from "three";

export function pointRenderer(positions: Float32Array) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 2 ) );

    const result= new THREE.Object3D();
    result.add(new THREE.Points( geometry, new THREE.PointsMaterial({
        size: 1
    })));

    return result;
}