import * as THREE from "three";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import { GenPoint } from "../map/GenPoint";
import { Tile } from "../map/Tile";
import { lerp } from "../math";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

const mountain = new THREE.TextureLoader().load( '/mountain.png' );
const hills = new THREE.TextureLoader().load( '/hills.png' );

const siltAlbedo = {
    r: 0.79,
    g: 0.45,
    b: 0.1,
};

const vegetationAlbedo = {
    r: 0.12,
    g: 0.38,
    b: 0.2,
};

const rockAlbedo = {
    r: 0.33,
    g: 0.38,
    b: 0.44,
};

const softRockAlbedo = {
    r: 0.65,
    g: 0.58,
    b: 0.22,
};

function albedo(t: Tile) {
    const result = new THREE.Vector3();

    const siltPortion = Math.max((t.softRock) * 3, 0);
    result.x = lerp(rockAlbedo.r, siltAlbedo.r, siltPortion);
    result.y = lerp(rockAlbedo.g, siltAlbedo.g, siltPortion);
    result.z = lerp(rockAlbedo.b, siltAlbedo.b, siltPortion);

    result.x = lerp(result.x, vegetationAlbedo.r, t.vegetation);
    result.y = lerp(result.y, vegetationAlbedo.g, t.vegetation);
    result.z = lerp(result.z, vegetationAlbedo.b, t.vegetation);

    return result;
}

function rockNormal(tiles: Tile[], t: Tile) {
    let v = new THREE.Vector3(0,0,1);
    if (t.adjacents.length > 0) {
        const center = new THREE.Vector3(t.x, t.y, -t.rockElevation()*400);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a < t.adjacents.length; ++a) {
            const i1 = t.adjacents[a];
            const i2 = t.adjacents[(a + 1)%t.adjacents.length];
            const first = new THREE.Vector3(tiles[i1].x, tiles[i1].y, -tiles[i1].rockElevation()*400);
            const second = new THREE.Vector3(tiles[i2].x, tiles[i2].y, -tiles[i2].rockElevation()*400);
            first.sub(center);
            second.sub(center);

            const cross = first.cross(second);
            avg.add(cross);
        }

        avg.divideScalar(t.adjacents.length);
        v = avg;
        v.normalize();
    } 
    return v;
}


function totalNormal(tiles: Tile[], t: Tile) {
    let v = new THREE.Vector3(0,0,1);
    const adj = t.adjacents.filter(a => tiles[a].surfaceWater() > 0);
    if (adj.length > 0) {
        const center = new THREE.Vector3(t.x, t.y, -t.rockElevation()*100);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a <adj.length; ++a) {
            const i1 = adj[a];
            const i2 = adj[(a + 1)%adj.length];
            const first = new THREE.Vector3(tiles[i1].x, tiles[i1].y, -tiles[i1].totalElevation()*400);
            const second = new THREE.Vector3(tiles[i2].x, tiles[i2].y, -tiles[i2].totalElevation()*400);
            first.sub(center);
            second.sub(center);

            const cross = first.cross(second);
            avg.add(cross);
        }

        avg.divideScalar(adj.length);
        v = avg;
        v.normalize();
    } 
    return v;
}

const globalSunlight = new THREE.Vector3(0.9,0.8, 0.6);

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
    geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
    geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
    geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
    geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
    geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
    geometry.setAttribute( 'fog', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            sunlight: { value: new THREE.Vector3() },
            color: { value: new THREE.Color( 0xffffff ) },
            time: { value: 0 },
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
            if (tile.roughness === type && tile.surfaceWater()) {
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
                    if (tile.roughness === type && tile.surfaceWater()) {
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

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const light = new THREE.Vector3(
            0.3,
             0.1,
            0.8);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.sunlight = { value: globalSunlight };
    }

    return {
        object: result,
        updateUniforms,
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
                geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
                geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
                geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
                geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(tiles.length*3), 3 ) );
                geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
                geometry.setAttribute( 'fog', new THREE.BufferAttribute( new Float32Array(tiles.length), 1 ) );
                geometry.attributes.position.needsUpdate = true;
                geometry.setDrawRange(0, tiles.length);
            }

            for (let i = 0; i < tiles.length; ++i) {
                let t = tiles[i];

                const a = albedo(t).multiplyScalar(t.totalElevation()*0.6 + 0.4);
                const rock = rockNormal(tiles, t);
                const water = totalNormal(tiles, t);
                if (t.x === t.x && t.y === t.y)
                {
                    geometry.attributes.albedo.setXYZ(i, a.x, a.y, a.z);
                    geometry.attributes.rocknormal.setXYZ(i, rock.x, rock.y, rock.z);
                    geometry.attributes.waternormal.setXYZ(i, water.x, water.y, water.z);
                    geometry.attributes.water.setX(i, t.surfaceWater());
                    geometry.attributes.height.setX(i, t.totalElevation());
                    geometry.attributes.fog.setX(i, t.fog);
                }
            }

            updateUniforms();

            geometry.attributes.albedo.needsUpdate = true;
            geometry.attributes.water.needsUpdate = true;
            geometry.attributes.rocknormal.needsUpdate = true;
            geometry.attributes.waternormal.needsUpdate = true;
            geometry.attributes.height.needsUpdate = true;
            geometry.attributes.fog.needsUpdate = true;
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
                if (t.surfaceWater() > 0.01) {
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
        
                let sourceAmount = Math.min(t.riverAmount / maxRiver * 5, 0.9);
                if (sourceAmount > 0.01 && t.surfaceWater() < 0)
                {
                    sourceAmount += 0.1;
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