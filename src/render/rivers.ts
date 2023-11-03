import * as THREE from "three";

import { Gameboard } from "../gameboard/Gameboard";
import { Tile } from "../gameboard/Tile";
import { clamp } from "../math";
import { PointLike } from "../PointLike";

const nv = new THREE.Vector2();
const cv = new THREE.Vector2();
function offset(tile: Tile, width: number) {
    if (tile.riverPoint && tile.riverPoint.next) {
        const next = tile.riverPoint.next;
        const current = tile;

        nv.set(next.x, next.y);
        cv.set(current.x, current.y);

        const toNext = nv.sub(cv);
        toNext.normalize().multiplyScalar(width);

        return { dx: -toNext.y, dy: toNext.x };
    }
    return undefined;
}

export function rivers(board: Gameboard) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Array<number>(0);
    const colors = new Array<number>(0);
    const tiles = board.tiles;

    let r = 0.01;
    let g = 0.02;
    let b = 0.03;
    
    for (let i = 0; i < tiles.length; ++i) {
        const tile = tiles[i];
        if (tile.water > 0.002) {
            continue;
        }
        if (tile.riverPoint && tile.riverPoint.next) {
            const target = tile.riverPoint.next;
            const {dx: sx, dy: sy} = offset(tile, clamp(Math.log(tile.riverPoint.depth + 1), 0, 4))!;
            const {dx: tx, dy: ty} = { dx: sx, dy: sy };

            let sv: PointLike = tile;
            let tv: PointLike = target;
            const along = new THREE.Vector2(tv.x - sv.x, tv.y - sv.y);
            along.normalize();

            const sd = 0.8;//Math.log(1 + tile.riverPoint.depth);

            positions.push(tv.x + tx, tv.y + ty);
            positions.push(sv.x + sx, sv.y + sy);
            positions.push(sv.x - sx, sv.y - sy);

            positions.push(sv.x - sx, sv.y - sy);
            positions.push(tv.x - tx, tv.y - ty);
            positions.push(tv.x + tx, tv.y + ty);

            colors.push(r * sd, g * sd, b * sd);
            colors.push(r * sd, g * sd, b * sd);
            colors.push(r * sd, g * sd, b * sd);
            colors.push(r * sd, g * sd, b * sd);
            colors.push(r * sd, g * sd, b * sd);
            colors.push(r * sd, g * sd, b * sd);
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

    const result = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({
        depthTest: false,
        depthWrite: false,
        vertexColors: true,
        color: new THREE.Color(0.3,0.2,0.1),
        side: THREE.DoubleSide
    }));
    return result;
}
