import * as THREE from "three";

import { clamp } from "../math";
import { TileSet } from "../terrain/PointSet";

export function riverMesh() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(), 3 ) );

    function offset(tiles: TileSet, source: number, amount: number) {
        const target = tiles.uphill[source];
        const sx = tiles.vertices.xys[source*2];
        const sy = tiles.vertices.xys[source*2+1];
        const tx = tiles.vertices.xys[target*2];
        const ty = tiles.vertices.xys[target*2+1];

        const tv = new THREE.Vector2(tx - sx, ty - sy);

        const dx = -tv.y  * clamp(amount, 0.05, 1);
        const dy = tv.x  * clamp(amount, 0.05, 1);
        return { dx, dy };
    }

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, blending: THREE.SubtractiveBlending }) ))
    return {
        object: result,
        update(tiles: TileSet) {
            const positions = new Array<number>(0);
            const colors = new Array<number>(0);

            for (let i = 0; i < tiles.count; ++i) {
                let r = 0.18;
                let g = 0.1;
                let b = 0.05;

                const target = tiles.downhill(i);
                if (tiles.river[i] > 0.01)
                {
                    const sourceAmount = 1;//Math.min(Math.log(tiles.river(i)*1 + 1), 2.9);
                    const targetAmount = 1;//Math.min(Math.log(tiles.river(target)*1 + 1), 2.9);

                    const {dx: sx, dy: sy} = offset(tiles, i, 0.1);
                    const {dx: tx, dy: ty} = offset(tiles, target, 0.1);

                    const sv = new THREE.Vector2(tiles.vertices.xys[i*2], tiles.vertices.xys[i*2+1]);
                    const tv = new THREE.Vector2(tiles.vertices.xys[target*2], tiles.vertices.xys[target*2+1]);

                    const te = tiles.totalElevation(target)*-50;
                    const se = tiles.totalElevation(i)*-50;
                    positions.push(tv.x + tx, tv.y + ty, te);
                    positions.push(sv.x + sx, sv.y + sy, se);
                    positions.push(sv.x - sx, sv.y - sy, se);

                    positions.push(sv.x - sx, sv.y - sy, se);
                    positions.push(tv.x - tx, tv.y - ty, te);
                    positions.push(tv.x + tx, tv.y + ty, te);

                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);

                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);
                }
            }

            if (true || positions.length > geometry.attributes.position.count * 3) {
                geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
                geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );
            }
            geometry.setDrawRange(0, positions.length / 3);

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        }
    }
}
