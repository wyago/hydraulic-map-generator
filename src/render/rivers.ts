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

function width(depth: number, scale: number) {
    return clamp(Math.log(depth * scale + 1), 0, 4);
}

export function rivers(board: Gameboard, scale: number) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Array<number>(0);
    const tiles = board.tiles;

    let r = 0.003;
    let g = 0.004;
    let b = 0.005;

    function include(tile: Tile | undefined) {
        return tile &&
            !(tile.water > 0.002) &&
            (width(tile.riverPoint.depth, scale) > 0.1 && tile.riverPoint.next);
    }
    
    for (let i = 0; i < tiles.length; ++i) {
        const tile = tiles[i];
        if (include(tile) || include(tile.river.next) && width(tile.river.depth, scale) > 0.1) {
            const target = tile.river.next!;
            const w = width(tile.river.depth, scale);
            const {dx: sx, dy: sy} = offset(tile, w)!;
            const {dx: tx, dy: ty} = { dx: sx, dy: sy };

            let sv: PointLike = {x: tile.x, y: tile.y};
            let tv: PointLike = {x: target.x, y: target.y};
            const along = new THREE.Vector2(tv.x - sv.x, tv.y - sv.y);
            along.normalize().multiplyScalar(w);

            if (!include(target)) {
                tv.x += sv.x;
                tv.y += sv.y;
                tv.x /= 2;
                tv.y /= 2;
            } else if (!include(tile)) {
                sv.x += tv.x;
                sv.y += tv.y;
                sv.x /= 2;
                sv.y /= 2;
            }

            positions.push(tv.x + tx, tv.y + ty);
            positions.push(sv.x + sx, sv.y + sy);
            positions.push(sv.x - sx, sv.y - sy);

            positions.push(sv.x - sx, sv.y - sy);
            positions.push(tv.x - tx, tv.y - ty);
            positions.push(tv.x + tx, tv.y + ty);

            if (include(target)) {
                positions.push(tv.x - tx, tv.y - ty);
                positions.push(tv.x + along.x, tv.y + along.y);
                positions.push(tv.x + tx, tv.y + ty);
            }
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 2));

    const result = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({
        depthTest: false,
        depthWrite: false,
        color: new THREE.Color(r,g,b),
        side: THREE.DoubleSide
    }));
    return result;
}
