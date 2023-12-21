import * as THREE from "three";

export function starfield() {
    const count = 1024*32;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count*2);
    const colors = new Float32Array(count*3);
    const boundR = 25000;
    for (let i = 0; i < count; ++i) {
        positions[i * 2 + 0] = Math.random() * boundR*2 - boundR;
        positions[i * 2 + 1] = Math.random() * boundR*2 - boundR;
        colors[i*3 + 0] = Math.random();
        colors[i*3 + 1] = colors[i*3];
        colors[i*3 + 2] = colors[i*3];
    }
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 2 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

    const result = new THREE.Points( geometry, new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
    }));
    result.frustumCulled = false;

    return result;
}