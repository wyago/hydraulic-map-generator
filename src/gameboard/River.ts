import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, ShaderMaterial, Vector2, Vector3 } from "three";
import { PointLike } from "../PointLike";
import { clamp } from "../math";
import { Tile } from "./Tile";
import lineFragment from "./lineFragment.glsl";
import lineVertex from "./lineVertex.glsl";
import { makeName } from "./names";

const toV = new Vector2();
const centerV = new Vector2();
const fromV = new Vector2();
function normal(tiles: Tile[], i: number, width: number) {
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

    return new Vector2(-toNext.y, toNext.x);
}

function width(depth: number, scale: number) {
    return Math.log(depth * scale + 1);
}

export class River {
    name: string;
    tiles: Tile[];
    feeders: River[];

    renderObject: Mesh;

    constructor() {
        this.name = makeName();
        this.tiles = [];
        this.feeders = [];
    }

    initialize() {
        const geometry = new BufferGeometry();
        const positions = new Array<number>(0);
        const normals = new Array<number>(0);
        const tiles = this.tiles;
        
        for (let i = 0; i < tiles.length - 1; ++i) {
            const from = tiles[i];
            const to = tiles[i+1];
            const w = width(from.river.depth, 0.1);
            const sn = normal(tiles, i, w);
            const tn = normal(tiles, i + 1, w);

            let sv: PointLike = {x: from.x, y: from.y};
            let tv: PointLike = {x: to.x, y: to.y};

            if (!to.river.next) {
                tv.x += sv.x;
                tv.y += sv.y;
                tv.x /= 2;
                tv.y /= 2;
            }

            positions.push(sv.x, sv.y);
            positions.push(tv.x, tv.y);
            positions.push(tv.x, tv.y);
            normals.push(sn.x, sn.y);
            normals.push(tn.x, tn.y);
            normals.push(-tn.x, -tn.y);

            positions.push(tv.x, tv.y);
            positions.push(sv.x, sv.y);
            positions.push(sv.x, sv.y);
            normals.push(-tn.x, -tn.y);
            normals.push(-sn.x, -sn.y);
            normals.push(sn.x, sn.y);
        }
        
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 2));
        geometry.setAttribute('norm', new BufferAttribute(new Float32Array(normals), 2));
        
        const material = new ShaderMaterial( {
            uniforms: {
                scale: { value: 1 },
                ucolor: { value: new Vector3(0.05, 0.07, 0.09) }
            },
        
            depthWrite: false,
            depthTest: false,
            vertexShader: lineVertex,
            fragmentShader: lineFragment,
            side: DoubleSide
        });

        this.renderObject = new Mesh(geometry, material);
        this.renderObject.frustumCulled = false;
    }

    setScale(scale: number) {
        (this.renderObject.material as ShaderMaterial).uniforms.scale.value = scale;
        (this.renderObject.material as ShaderMaterial).uniformsNeedUpdate = true;
    }
}