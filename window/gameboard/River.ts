import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, ShaderMaterial, Vector2, Vector3 } from "three";
import { PointLike } from "../PointLike";
import { clamp } from "../math";
import { TileSet } from "../terrain/PointSet";
import lineFragment from "./lineFragment.glsl";
import lineVertex from "./lineVertex.glsl";
import { makeName } from "./names";

const toV = new Vector2();
const centerV = new Vector2();
const fromV = new Vector2();
function normal(tiles: number[], set: TileSet, i: number, width: number) {
    const from = tiles[clamp(i - 1, 0, tiles.length - 1)];
    const center = tiles[clamp(i, 0, tiles.length - 1)];
    const to = tiles[clamp(i + 1, 0, tiles.length - 1)];

    fromV.set(set.x(from), set.y(from));
    centerV.set(set.x(center), set.y(center));
    toV.set(set.x(to), set.y(to));

    const toNext = toV.sub(centerV);
    const toCenter = centerV.sub(fromV);
    toNext.add(toCenter).multiplyScalar(0.5);
    toNext.normalize().multiplyScalar(width);

    return new Vector2(-toNext.y, toNext.x);
}

function width(points: TileSet, i: number) {
    return 1;
    return Math.log(points.river[i] * 0.1 + 1);
}

export class River {
    name: string;
    tiles: number[];
    feeders: River[];

    renderObject: Mesh;

    constructor() {
        this.name = makeName();
        this.tiles = [];
        this.feeders = [];
    }

    marshal(rivers: River[]) {
        return {
            name: this.name,
            tiles: this.tiles,
            feeders: this.feeders.map(f => rivers.indexOf(f))
        };
    }

    initialize(points: TileSet) {
        const geometry = new BufferGeometry();
        const positions = new Array<number>(0);
        const normals = new Array<number>(0);
        const tiles = this.tiles;
        
        for (let i = 0; i < tiles.length - 1; ++i) {
            const from = tiles[i];
            const to = tiles[i+1];
            const sn = normal(tiles, points, i, width(points, from));
            const tn = normal(tiles, points, i + 1, width(points, from));

            let sv: PointLike = {x: points.x(from), y: points.y(from)};
            let tv: PointLike = {x: points.x(to), y: points.y(to)};

            if (i === tiles.length - 2 && points.water[to] >= 0.002) {
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