import * as THREE from "three";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import { GenPoint } from "../map/GenPoint";
import { TileSet } from "../map/Graph";
import { lerp } from "../math";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

const mountain = new THREE.TextureLoader().load( '/mountain.png' );
const hills = new THREE.TextureLoader().load( '/hills.png' );

const siltAlbedo = {
    r: 0.69,
    g: 0.43,
    b: 0.1,
};

const vegetationAlbedo = {
    r: 0.12,
    g: 0.38,
    b: 0.2,
};

const rockAlbedo = {
    r: 0.4,
    g: 0.38,
    b: 0.36,
};

const softRockAlbedo = {
    r: 0.65,
    g: 0.58,
    b: 0.22,
};

function albedo(tiles: TileSet, i: number) {
    const result = new THREE.Vector3();

    const siltPortion = Math.max((tiles.softRock(i)) * 3, 0);
    result.x = lerp(rockAlbedo.r, siltAlbedo.r, siltPortion);
    result.y = lerp(rockAlbedo.g, siltAlbedo.g, siltPortion);
    result.z = lerp(rockAlbedo.b, siltAlbedo.b, siltPortion);

    return result;
}

function rockNormal(tiles: TileSet, i: number) {
    let v = new THREE.Vector3(0,0,1);
    const adjacents = tiles.adjacents[i];
    if (adjacents.length > 0) {
        const center = new THREE.Vector3(tiles.x(i), tiles.y(i), -tiles.rockElevation(i)*400);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a < adjacents.length; ++a) {
            const i1 = adjacents[a];
            const i2 = adjacents[(a + 1)%adjacents.length];

            const first = new THREE.Vector3(tiles.x(i1), tiles.y(i1), -tiles.rockElevation(i1)*400);
            const second = new THREE.Vector3(tiles.x(i2), tiles.y(i2), -tiles.rockElevation(i2)*400);
            first.sub(center);
            second.sub(center);

            const cross = first.cross(second);
            avg.add(cross);
        }

        avg.divideScalar(adjacents.length);
        v = avg;
        v.normalize();
    } 
    return v;
}


function totalNormal(tiles: TileSet, i: number) {
    let v = new THREE.Vector3(0,0,1);
    const adj = tiles.adjacents[i].filter(a => tiles.surfaceWater(a) > 0);
    if (adj.length > 0) {
        const center = new THREE.Vector3(tiles.x(i), tiles.y(i), -tiles.rockElevation(i)*100);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a <adj.length; ++a) {
            const i1 = adj[a];
            const i2 = adj[(a + 1)%adj.length];
            const first = new THREE.Vector3(tiles.x(i1), tiles.y(i1), -tiles.totalElevation(i1)*400);
            const second = new THREE.Vector3(tiles.x(i2), tiles.y(i2), -tiles.totalElevation(i2)*400);
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

export function pointsMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setAttribute( 'fog', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setDrawRange(0,0);
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
    //const m = makePoints("mountain", mountain);
    //const h = makePoints("hills", hills);
    //result.add(m.object);
    //result.add(h.object);

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const light = new THREE.Vector3(
            0.5,
             0.5,
            10.5);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.sunlight = { value: globalSunlight };
    }

    return {
        object: result,
        updateUniforms,
        update(tiles: TileSet) {

            if (tiles.count > geometry.attributes.albedo.array.length / 3) {
                const positions = new Float32Array(tiles.count*3);
                for (let i = 0; i < tiles.count; ++i) {
                    positions[i*3+0] = tiles.x(i);
                    positions[i*3+1] = tiles.y(i);
                    positions[i*3+2] = 0;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setAttribute( 'fog', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.attributes.position.needsUpdate = true;
                geometry.setDrawRange(0, tiles.count);
            }

            for (let i = 0; i < tiles.count; ++i) {
                const a = albedo(tiles, i).multiplyScalar(tiles.totalElevation(i)*0.6 + 0.4);
                const rock = rockNormal(tiles, i);
                const water = totalNormal(tiles, i);

                geometry.attributes.albedo.setXYZ(i, a.x, a.y, a.z);
                geometry.attributes.rocknormal.setXYZ(i, rock.x, rock.y, rock.z);
                geometry.attributes.waternormal.setXYZ(i, water.x, water.y, water.z);
                geometry.attributes.water.setX(i, 0.4 - tiles.rockElevation(i));
                geometry.attributes.height.setX(i, tiles.totalElevation(i));
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

export function riverMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3*6000);
    const colors =  new Float32Array(1024*3*6000);
    geometry.setAttribute( 'position', new THREE.BufferAttribute(positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute(colors, 3 ) );
    geometry.setDrawRange(0,0);

    const result= new THREE.LineSegments( geometry, 
        new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, blending: THREE.SubtractiveBlending }) );
    result.frustumCulled = false;
    return {
        object: result,
        update(tiles: TileSet) {
            let j = 0;
            let maxRiver = 0;
            for (let i = 0; i < tiles.count; ++i) {
                if (tiles.surfaceWater(i) > 0) {
                    continue;
                }
                if (tiles.river(i) > maxRiver) {
                    maxRiver = tiles.river(i);
                }
            }
            for (let i = 0; i < tiles.count; ++i) {
                let r = 0.38;
                let g = 0.23;
                let b = 0.08;
        
                let sourceAmount = Math.min(tiles.river(i) * 10, 0.9);
                if (sourceAmount > 0.01 && tiles.surfaceWater(i) <= 0 && tiles.totalElevation(i) - tiles.totalElevation(tiles.downhill(i)) > 0.0001)
                {
                    sourceAmount += 0.1;
                    const target = tiles.downhill(i);
                    positions[j*3*2 + 0] = tiles.x(i);
                    positions[j*3*2 + 1] = tiles.y(i);
                    positions[j*3*2 + 2] = -5;

                    positions[j*3*2 + 3] = tiles.x(target);
                    positions[j*3*2 + 4] = tiles.y(target);
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