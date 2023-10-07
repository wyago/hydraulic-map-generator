import * as THREE from "three";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import { GenPoint } from "../map/GenPoint";
import { Tile } from "../map/Tile";
import { clamp, lerp } from "../math";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

const mountain = new THREE.TextureLoader().load( '/mountain.png' );
const hills = new THREE.TextureLoader().load( '/hills.png' );

const siltAlbedo = {
    r: 0.59,
    g: 0.42,
    b: 0.2,
};

const vegetationAlbedo = {
    r: 0.12,
    g: 0.28,
    b: 0.2,
};

const rockAlbedo = {
    r: 0.41,
    g: 0.38,
    b: 0.34,
};

const softRockAlbedo = {
    r: 0.65,
    g: 0.58,
    b: 0.22,
};

export function genMesh(points: GenPoint[]) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length*3);
    for (let i = 0; i < points.length; ++i) {
        positions[i*3+0] = points[i].x;
        positions[i*3+1] = points[i].y;
        positions[i*3+2] = 0;
    }
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(points.length*3), 3 ) );
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
        for ( let i = 0; i < points.length; i ++ ) {
            const point = points[i];
            if (point.type === type && point.elevation > 0.4) {
                pointPositions.push(
                    points[i].x,
                    points[i].y,
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
                for ( let i = 0; i < points.length; i ++ ) {
                    const point = points[i];
                    if (point.type === type && point.elevation > 0.4) {
                        pointPositions.push(
                            points[i].x,
                            points[i].y,
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
    return {
        object: result,
        update(updatePoints?: GenPoint[]) {

            if (updatePoints && updatePoints.length > geometry.attributes.color.array.length / 3) {
                points = updatePoints;
                const positions = new Float32Array(points.length*3);
                for (let i = 0; i < points.length; ++i) {
                    positions[i*3+0] = points[i].x;
                    positions[i*3+1] = points[i].y;
                    positions[i*3+2] = 0;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(points.length*3), 3 ) );
                geometry.attributes.position.needsUpdate = true;
                geometry.setDrawRange(0, points.length);
            }

            for (let i = 0; i < points.length; ++i) {
                let t = points[i];

                const height = 0.4 + t.elevation * 0.5;

                let r = 0.46 * height;
                let g = 0.44 * height;
                let b = 0.3 * height;

                if (t.elevation < 0.4) {
                    const depth = (0.4 - t.elevation)*2 + 0.5;
                    r -= depth * 0.18;
                    g -= depth * 0.13;
                    b -= depth * 0.12;
                }

                if (t.x === t.x && t.y === t.y)
                {
                    geometry.attributes.color.setXYZ(i, r, g, b);
                }
            }

            geometry.attributes.color.needsUpdate = true;
        }
    };
}

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
    return {
        object: result,
        update(updateTiles?: Tile[]) {

            if (updateTiles && updateTiles.length > geometry.attributes.color.array.length / 3) {
                tiles = updateTiles;
                const positions = new Float32Array(tiles.length*3);
                for (let i = 0; i < tiles.length; ++i) {
                    positions[i*3+0] = tiles[i].x;
                    positions[i*3+1] = tiles[i].y;
                    positions[i*3+2] = 0;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
                geometry.attributes.position.needsUpdate = true;
                geometry.setDrawRange(0, tiles.length);
            }

            for (let i = 0; i < tiles.length; ++i) {
                let t = tiles[i];

                let vx = 0;
                let vy = 0;
                if (t.adjacents.length > 0) {
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
                }

                const height = 0.1 + t.elevation * 0.9;

                let r = 0.46 * height;
                let g = 0.44 * height;
                let b = 0.3 * height;

                const siltPortion = Math.max(t.silt / t.elevation, 0);
                const boundary = 0;
                const over = siltPortion*2 - boundary;
                r = lerp(rockAlbedo.r, siltAlbedo.r, over);
                g = lerp(rockAlbedo.g, siltAlbedo.g, over);
                b = lerp(rockAlbedo.b, siltAlbedo.b, over);
                //r = lerp(averageAlbedo.r, siltAlbedo.r, clamp((t.silt - boundary)*50, 0, 1));
                //g = lerp(averageAlbedo.g, siltAlbedo.g, clamp((t.silt - boundary)*50, 0, 1));
                //b = lerp(averageAlbedo.b, siltAlbedo.b, clamp((t.silt - boundary)*50, 0, 1));

                r = lerp(r, vegetationAlbedo.r, t.vegetation);
                g = lerp(g, vegetationAlbedo.g, t.vegetation);
                b = lerp(b, vegetationAlbedo.b, t.vegetation);

                r *= height;
                g *= height;
                b *= height;

                r = clamp(r + t.snow, 0, 1);
                g = clamp(g + t.snow, 0, 1);
                b = clamp(b + t.snow, 0, 1);

                let lightFactor = {
                    r: (vx + vy) * 0.3/Math.SQRT2*0.9 + 0.8,
                    g: (vx + vy) * 0.3/Math.SQRT2*0.7 + .8,
                    b: (vx + vy) * 0.3/Math.SQRT2*0.6 + 0.82,
                }

                const depthFactor = t.lake;
                if (depthFactor > 0.01) {
                    const depth = depthFactor*25 + 3;
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
                
                r += 0.011;
                g += 0.011;
                b += 0.021;

                if (t.x === t.x && t.y === t.y)
                {
                    geometry.attributes.color.setXYZ(i, r, g, b);
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
            let maxRiver = 0;
            for (let i = 0; i < tiles.length; ++i) {
                const t = tiles[i];
                if (t.lake > 0.02) {
                    continue;
                }
                if (t.riverAmount > maxRiver) {
                    maxRiver = t.riverAmount;
                }
            }
            for (let i = 0; i < tiles.length; ++i) {
                const t = tiles[i];
                let r = 0.38;
                let g = 0.23;
                let b = 0.08;
        
                let sourceAmount = Math.min(t.riverAmount / maxRiver * 5, 1);
                if (sourceAmount > 0.1 && t.lake < 0.02)
                {
                    const target = tiles[t.downhill];
                    positions[j*3*2 + 0] = t.x;
                    positions[j*3*2 + 1] = t.y;
                    positions[j*3*2 + 2] = -5;

                    positions[j*3*2 + 3] = target.x;
                    positions[j*3*2 + 4] = target.y;
                    positions[j*3*2 + 5] = -5;
                    
                    if (Math.random() < t.riverAmount*0.01) {
                        sourceAmount = 1;
                        r = 1;
                        g = 1;
                        b = 1;
                    }


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