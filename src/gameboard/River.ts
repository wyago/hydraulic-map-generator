import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, Vector2 } from "three";
import { PointLike } from "../PointLike";
import { clamp } from "../math";
import { Tile } from "./Tile";
import { makeName } from "./names";

const toV = new Vector2();
const centerV = new Vector2();
const fromV = new Vector2();
function offset(tiles: Tile[], i: number, width: number) {
    const fromI = clamp(i - 1, 0, tiles.length - 1);
    const centerI = clamp(i, 0, tiles.length - 1);
    const toI = clamp(i + 1, 0, tiles.length - 1);

    const from = tiles[fromI];
    const center = tiles[centerI];
    const to = tiles[toI];

    toV.set(to.x, to.y);
    fromV.set(from.x, from.y);
    centerV.set(center.x, center.y);

    const toNext = toV.sub(centerV);
    const toCenter = centerV.sub(fromV);
    toNext.add(toCenter).multiplyScalar(0.5);
    toNext.normalize().multiplyScalar(width);

    return { dx: -toNext.y, dy: toNext.x };
}

function width(depth: number, scale: number) {
    return clamp(Math.log(depth * scale + 1), 0, 4);
}

export class River {
    name: string;
    tiles: Tile[];
    feeders: River[];

    constructor() {
        this.name = makeName();
        this.tiles = [];
        this.feeders = [];
    }

    renderObject() {
        const geometry = new BufferGeometry();
        const positions = new Array<number>(0);
        const tiles = this.tiles;
        
        for (let i = 0; i < tiles.length - 1; ++i) {
            const from = tiles[i];
            const to = tiles[i+1];
            const w = width(from.river.depth, 0.1);
            const {dx: sx, dy: sy} = offset(tiles, i, w);
            const {dx: tx, dy: ty} = offset(tiles, i + 1, w);

            let sv: PointLike = {x: from.x, y: from.y};
            let tv: PointLike = {x: to.x, y: to.y};

            if (!to.river.next) {
                tv.x += sv.x;
                tv.y += sv.y;
                tv.x /= 2;
                tv.y /= 2;
            }

            positions.push(tv.x + tx, tv.y + ty);
            positions.push(sv.x + sx, sv.y + sy);
            positions.push(sv.x - sx, sv.y - sy);

            positions.push(sv.x - sx, sv.y - sy);
            positions.push(tv.x - tx, tv.y - ty);
            positions.push(tv.x + tx, tv.y + ty);
        }
        
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 2));

        let r = 0.003;
        let g = 0.004;
        let b = 0.005;
        return new Mesh(geometry, new MeshBasicMaterial({
            depthTest: false,
            depthWrite: false,
            color: new Color(r,g,b),
            side: DoubleSide
        }))
    }
}