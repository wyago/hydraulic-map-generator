import * as THREE from "three";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import { Tile } from "../map/Tile";
import { lerp } from "../math";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

const mountain = new THREE.TextureLoader().load( '/mountain.png' );
const hills = new THREE.TextureLoader().load( '/hills.png' );

const siltAlbedo = {
    r: 0.52,
    g: 0.47,
    b: 0.3,
};

const rockAlbedo = {
    r: 0.41,
    g: 0.42,
    b: 0.49,
};

export function pointsMesh(tiles: Tile[]) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(tiles.length*3);
    for (let i = 0; i < tiles.length; ++i) {
        positions[i*3+0] = tiles[i].x;
        positions[i*3+1] = tiles[i].y;
        positions[i*3+2] = 0;
    }
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            color: { value: new THREE.Color( 0xffffff ) },
        },
    
        depthWrite: true,
        depthTest: true,
        vertexShader: voronoiVertex,
        fragmentShader: voronoiFragment,
        blending: THREE.NormalBlending,
    });
    
    function makePoints(type: string, texture: THREE.Texture) {
        const pointPositions = new Array<number>();
        for ( let i = 0; i < tiles.length; i ++ ) {
            const tile = tiles[i];
            if (tile.roughness === type && tile.elevation > 0.4) {
                pointPositions.push(
                    tiles[i].x,
                    tiles[i].y,
                    0
                );
            }
        }
    
        const pointsGeo = new THREE.BufferGeometry();
        pointsGeo.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(pointPositions), 3 ) );
    
        const pointsMaterial = new THREE.ShaderMaterial( {
            uniforms: {
                color: { value: new THREE.Color( 0xffffff ) },
                pointTexture: { value: texture }
            },
        
            vertexShader: vertexGlsl,
            fragmentShader: fragmentGlsl,
            blending: THREE.NormalBlending,
            depthTest: false,
            transparent: true
        });
        return {
            object: new THREE.Points(pointsGeo, pointsMaterial),
            update() {
                const pointPositions = new Array<number>();
                for ( let i = 0; i < tiles.length; i ++ ) {
                    const tile = tiles[i];
                    if (tile.roughness === type && tile.elevation > 0.4) {
                        pointPositions.push(
                            tiles[i].x,
                            tiles[i].y,
                            0
                        );
                    }
                }
                pointsGeo.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(pointPositions), 3 ) );
            }
        };
    }

    const result= new THREE.Object3D();
    result.add(new THREE.Points( geometry, material ))
    //result.add(new THREE.LineSegments( new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial( {color: new THREE.Color("rgba(0,0,0)"), opacity: 0.2, transparent: true } ) ))
    const m = makePoints("mountain", mountain);
    const h = makePoints("hills", hills);
    result.add(m.object);
    result.add(h.object);
    let updateI = 0;
    const chunk = ~~(tiles.length / 1);
    return {
        object: result,
        update() {
            const portion = updateI;
            updateI += chunk;
            if (updateI > tiles.length + chunk) {
                updateI = 0;
            }
            for (let i = 0; i < chunk; ++i) {
                let t = tiles[(i+portion)%tiles.length];

                let vx = 0;
                let vy = 0;
                for (let a = 0; a < t.adjacents.length; ++a) {
                    const target = tiles[t.adjacents[a]];
                    const delta = target.elevation - t.elevation;
                    const dx = target.x - t.x;
                    const dy = target.y - t.y;
                    vx += dx * delta;
                    vy += dy * delta;
                }

                const l = Math.sqrt(vx * vx + vy*vy);
                vx /= l;
                vy /= l;

                const height = 0.4 + t.elevation * 0.5;

                let r = 0.46 * height;
                let g = 0.44 * height;
                let b = 0.3 * height;

                const boundary = 0.1;
                if (t.silt > boundary) {
                    const over = Math.min((t.silt - boundary)*8, 1)
                    r = lerp(rockAlbedo.r, siltAlbedo.r, over);
                    g = lerp(rockAlbedo.g, siltAlbedo.r, over);
                    b = lerp(rockAlbedo.b, siltAlbedo.r, over);
                    //r = lerp(averageAlbedo.r, siltAlbedo.r, clamp((t.silt - boundary)*50, 0, 1));
                    //g = lerp(averageAlbedo.g, siltAlbedo.g, clamp((t.silt - boundary)*50, 0, 1));
                    //b = lerp(averageAlbedo.b, siltAlbedo.b, clamp((t.silt - boundary)*50, 0, 1));
                } else {
                    r = rockAlbedo.r;
                    g = rockAlbedo.g;
                    b = rockAlbedo.b;
                    //r = lerp(averageAlbedo.r, rockAlbedo.r, clamp((boundary - t.silt)*50, 0, 1));
                    //g = lerp(averageAlbedo.g, rockAlbedo.g, clamp((boundary - t.silt)*50, 0, 1));
                    //b = lerp(averageAlbedo.b, rockAlbedo.b, clamp((boundary - t.silt)*50, 0, 1));
                }

                r *= height;
                g *= height;
                b *= height;

                let lightFactor = {
                    r: (vx + vy) * 0.2/Math.SQRT2*0.9 + 0.8,
                    g: (vx + vy) * 0.2/Math.SQRT2*0.7 + .8,
                    b: (vx + vy) * 0.2/Math.SQRT2*0.5 + 0.82,
                }

                if (t.lake > 0.02) {
                    const depth = t.lake*25 + 2.9;
                    lightFactor.r -= depth * 0.18;
                    lightFactor.g -= depth * 0.13;
                    lightFactor.b -= depth * 0.12;
                    if (lightFactor.r < 0) {
                        lightFactor.r = 0;
                    }
                    if (lightFactor.g < 0) {
                        lightFactor.g = 0;
                    }
                    if (lightFactor.b < 0) {
                        lightFactor.b = 0;
                    }
                    if (t.lake > 0.04) {
                        r += 0.01;
                        g += 0.01;
                        b += 0.02;
                    }
                }

                r *= lightFactor.r*0.9;
                g *= lightFactor.g*0.8;
                b *= lightFactor.b*0.7;

                if (t.x === t.x && t.y === t.y)
                {
                    geometry.attributes.color.setXYZ((i+portion)%tiles.length, r, g, b);
                }
            }

            geometry.attributes.color.needsUpdate = true;
        }
    };
}


export function riverMesh(tiles: Tile[]) {

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(tiles.length*3*2);
    const colors =  new Float32Array(tiles.length*3*2);
    geometry.setAttribute( 'position', new THREE.BufferAttribute(positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute(colors, 3 ) );
    geometry.setDrawRange(0,0);

    const result= new THREE.LineSegments( geometry, 
        new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, blending: THREE.SubtractiveBlending }) );
    result.frustumCulled = false;
    return {
        object: result,
        update() {
            let j = 0;
            for (let i = 0; i < tiles.length; ++i) {
                const t = tiles[i];
                let r = 0.18;
                let g = 0.13;
                let b = 0.12;
        
                const sourceAmount = t.riverAmount*2;
                if (sourceAmount > 0.01 && t.lake < 0.02)
                {
                    const target = tiles[t.downhill];
                    positions[j*3*2 + 0] = t.x;
                    positions[j*3*2 + 1] = t.y;
                    positions[j*3*2 + 2] = -5;

                    positions[j*3*2 + 3] = target.x;
                    positions[j*3*2 + 4] = target.y;
                    positions[j*3*2 + 5] = -5;

                    colors[j*3*2 + 0] = r*sourceAmount;
                    colors[j*3*2 + 1] = g*sourceAmount;
                    colors[j*3*2 + 2] = b*sourceAmount;

                    colors[j*3*2 + 3] = r*sourceAmount;
                    colors[j*3*2 + 4] = g*sourceAmount;
                    colors[j*3*2 + 5] = b*sourceAmount;
                    j += 1;
                }
            }

            geometry.setDrawRange(0, j * 2);

            const position = geometry.getAttribute('position');
            const color = geometry.getAttribute('color');
            position.needsUpdate = true;
            color.needsUpdate = true;
        }
    }
}