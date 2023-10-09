import * as THREE from "three";

import { Vertices } from "../map/Graph";

export function graphRenderer() {
    const geometry = new THREE.BufferGeometry();
    let capacity = 10*1024*3;
    let positions = new Float32Array(capacity);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setDrawRange(0,0);
    let set = 0;

    const result= new THREE.Object3D();
    result.add(new THREE.Points( geometry, new THREE.PointsMaterial({ color: 0xffffff, depthTest: false, size: 1 }) ))
    result.frustumCulled = false;

    return {
        object: result,
        update(points: Vertices) {
            if (points.count >= capacity) {
                positions = new Float32Array(points.count * 3 * 10);
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                set = 0;
            }

            for (let i = set; i < points.count; ++i) {
                positions[i*3+0] = points.xs[i];
                positions[i*3+1] = points.ys[i];
                positions[i*3+2] = 0;
            }
            set = points.count - 1;

            geometry.attributes.position.needsUpdate = true;
            geometry.setDrawRange(0, points.count);
        }
    };
}
