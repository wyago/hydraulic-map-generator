import * as THREE from "three";

import { PointLike } from "../PointLike";
import { clamp } from "../math";

const pv = new THREE.Vector2();
const nv = new THREE.Vector2();
const cv = new THREE.Vector2();
function offset(path: ArrayLike<PointLike>, i: number, width: number) {
    const previous = path[clamp(i-1, 0, path.length-1)];
    const next = path[clamp(i+1, 0, path.length - 1)];
    const current = path[i];

    pv.set(previous.x, previous.y);
    nv.set(next.x, next.y);
    cv.set(current.x, current.y);

    const toNext = nv.sub(cv);
    const toCurrent = cv.sub(pv);

    toNext.normalize();
    toCurrent.normalize();

    toNext.add(toCurrent).multiplyScalar(0.5);
    toNext.normalize();

    return { dx: -toNext.y, dy: toNext.x };
}

export function singleRiver() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(), 2));

    let r = 0.038;
    let g = 0.02;
    let b = 0.01;
    const result= new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({
        depthTest: false,
        color: new THREE.Color(r,g,b),
        blending: THREE.SubtractiveBlending
    }));
    result.frustumCulled = false;
    return {
        object: result,
        update(path: ArrayLike<PointLike>) {
            const positions = new Array<number>(0);

            for (let i = 0; i < path.length - 1; ++i) {
                const {dx: sx, dy: sy} = offset(path, i, 0.1);
                const {dx: tx, dy: ty} = offset(path, i+1, 0.1);

                const sv = path[i];
                const tv = path[i+1];

                positions.push(tv.x + tx, tv.y + ty);
                positions.push(sv.x + sx, sv.y + sy);
                positions.push(sv.x - sx, sv.y - sy);

                positions.push(sv.x - sx, sv.y - sy);
                positions.push(tv.x - tx, tv.y - ty);
                positions.push(tv.x + tx, tv.y + ty);
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 2));
            geometry.setDrawRange(0, positions.length / 2);

            geometry.attributes.position.needsUpdate = true;
        }
    }
}
