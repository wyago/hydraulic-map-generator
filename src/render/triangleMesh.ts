import * as THREE from "three";


import Delaunator from "delaunator";
import { rockAlbedo, siltAlbedo, softRockAlbedo, vegetationAlbedo } from "../colors";
import { lerp } from "../math";
import { TileSet } from "../terrain/PointSet";
import triangleFragment from "./triangleFragment.glsl";
import triangleVertex from "./triangleVertex.glsl";
import waterFragment from "./waterFragment.glsl";
import waterVertex from "./waterVertex.glsl";

function hardalbedo(tiles: TileSet, i: number) {
    const result = new THREE.Vector3();

    const softness = (tiles.soft[i] / tiles.rockElevation(i)) * 3;
    result.x = rockAlbedo.r;
    result.y = rockAlbedo.g;
    result.z = rockAlbedo.b;

    result.x = lerp(result.x, vegetationAlbedo.r, Math.min(tiles.vegetation[i], softness + 0.5));
    result.y = lerp(result.y, vegetationAlbedo.g, Math.min(tiles.vegetation[i], softness + 0.5));
    result.z = lerp(result.z, vegetationAlbedo.b, Math.min(tiles.vegetation[i], softness + 0.5));

    if (tiles.snow[i] > 0) {
        result.x = lerp(result.x, 1, tiles.snow[i]*0.7);
        result.y = lerp(result.y, 1, tiles.snow[i]*0.7);
        result.z = lerp(result.z, 1, tiles.snow[i]*0.7);
    }

    return result;
}

function softalbedo(tiles: TileSet, i: number) {
    const result = new THREE.Vector3();

    const height = (tiles.rockElevation(i) - 0.28)*4;
    const siltColor = {
        r: lerp(siltAlbedo.r, softRockAlbedo.r, height),
        g: lerp(siltAlbedo.g, softRockAlbedo.g, height),
        b: lerp(siltAlbedo.b, softRockAlbedo.b, height),
    };

    const softness = (tiles.soft[i] / tiles.rockElevation(i)) * 3;
    result.x = siltColor.r;
    result.y = siltColor.g;
    result.z = siltColor.b;

    result.x = lerp(result.x, vegetationAlbedo.r, Math.min(tiles.vegetation[i], softness + 0.5));
    result.y = lerp(result.y, vegetationAlbedo.g, Math.min(tiles.vegetation[i], softness + 0.5));
    result.z = lerp(result.z, vegetationAlbedo.b, Math.min(tiles.vegetation[i], softness + 0.5));

    if (tiles.snow[i] > 0) {
        result.x = lerp(result.x, 1, tiles.snow[i]*0.7);
        result.y = lerp(result.y, 1, tiles.snow[i]*0.7);
        result.z = lerp(result.z, 1, tiles.snow[i]*0.7);
    }

    return result;
}

function rockNormal(tiles: TileSet, i: number) {
    let v = new THREE.Vector3(0,0,1);
    const adjacents = tiles.adjacents[i];
    if (adjacents.length > 0) {
        const center = new THREE.Vector3(tiles.x(i), tiles.y(i), -tiles.rockElevation(i)*250);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a < adjacents.length; ++a) {
            const i1 = adjacents[a];
            const i2 = adjacents[(a + 1)%adjacents.length];

            const first = new THREE.Vector3(tiles.x(i1), tiles.y(i1), -tiles.rockElevation(i1)*250);
            const second = new THREE.Vector3(tiles.x(i2), tiles.y(i2), -tiles.rockElevation(i2)*250);
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
        const center = new THREE.Vector3(tiles.x(i), tiles.y(i), -tiles.rockElevation(i)*250);
        let avg = new THREE.Vector3(0,0,0);
        for (let a = 0; a <adj.length; ++a) {
            const i1 = adj[a];
            const i2 = adj[(a + 1)%adj.length];
            const first = new THREE.Vector3(tiles.x(i1), tiles.y(i1), -tiles.totalElevation(i1)*250);
            const second = new THREE.Vector3(tiles.x(i2), tiles.y(i2), -tiles.totalElevation(i2)*250);
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

function hardMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'index', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setDrawRange(0,0);
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            suncolor: { value: new THREE.Vector3() },
            color: { value: new THREE.Color( 0xffffff ) },
            time: { value: 0 },
            selected: { value: -1 },
            mode: { value: 0 }
        },
    
        depthWrite: true,
        depthTest: true,
        vertexShader: triangleVertex,
        fragmentShader: triangleFragment,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
    });

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, material ))

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const light = new THREE.Vector3(
            0.5,
            0.5,
            0.5);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.suncolor = { value: globalSunlight };
    }

    let start = 0;
    let renderIndices = new Array<number>();
    result.frustumCulled = false;

    return {
        object: result,
        updateUniforms,
        select(id: number) {
            material.uniforms.selected.value = id;
            material.uniformsNeedUpdate = true;
        },
        mode(i: number) {
            material.uniforms.mode.value = i;
            material.uniformsNeedUpdate = true;
        },
        update(tiles: TileSet, incremental = false) {
            if (tiles.count !== geometry.attributes.albedo.array.length / 3) {
                const source = new Array<any>(tiles.count);
                for (let i = 0; i < tiles.count; ++i) {
                    source[i] = [
                        tiles.graph.xys[i*2],
                        tiles.graph.xys[i*2+1]];
                }

                const delaunay = Delaunator.from(source);
                function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }
                function pointsOfTriangle(delaunay, t) {
                    return edgesOfTriangle(t)
                        .map(e => delaunay.triangles[e]);
                }
                
                function forEachTriangle(delaunay, callback) {
                    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
                        callback(t, pointsOfTriangle(delaunay, t));
                    }
                }

                renderIndices = new Array<number>();
                forEachTriangle(delaunay, (t, ps) => {
                    renderIndices.push(...ps);
                });

                const positions = new Float32Array(tiles.count*3);
                const indices = new Int32Array(tiles.count);
                for (let i = 0; i < tiles.count; ++i) {
                    positions[i*3+0] = tiles.x(i);
                    positions[i*3+1] = tiles.y(i);
                    positions[i*3+2] = -tiles.rockElevation(i)*50;
                    indices[i] = i;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
                geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(renderIndices), 1));
                geometry.index!.needsUpdate = true;
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.index.needsUpdate = true;
                geometry.setDrawRange(0, renderIndices.length);
            }

            let chunk = ~~(tiles.count/5);
            if (!incremental) {
                start = 0;
                chunk = tiles.count;
            }

            for (let j = start; j < start + chunk; ++j) {
                const i = j % tiles.count;
                const a = hardalbedo(tiles, i).multiplyScalar(tiles.hard[i]*0.6 + 0.4);
                const rock = rockNormal(tiles, i);

                geometry.attributes.position.setXYZ(i, tiles.x(i), tiles.y(i), tiles.hard[i]*50);
                geometry.attributes.rocknormal.setXYZ(i, rock.x, rock.y, rock.z);
                geometry.attributes.albedo.setXYZ(i, a.x, a.y, a.z);
            }
            
            start += chunk;
            if (start > tiles.count) {
                start = 0;
            }

            updateUniforms();

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.albedo.needsUpdate = true;
            geometry.attributes.rocknormal.needsUpdate = true;
        }
    }; 
}


function softMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'index', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setDrawRange(0,0);
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            suncolor: { value: new THREE.Vector3() },
            color: { value: new THREE.Color( 0xffffff ) },
            time: { value: 0 },
            selected: { value: -1 },
            mode: { value: 0 }
        },
    
        depthWrite: true,
        depthTest: true,
        vertexShader: triangleVertex,
        fragmentShader: triangleFragment,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
    });

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, material ))

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const light = new THREE.Vector3(
            0.5,
            0.5,
            0.5);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.suncolor = { value: globalSunlight };
    }

    let start = 0;
    let renderIndices = new Array<number>();
    result.frustumCulled = false;

    return {
        object: result,
        updateUniforms,
        select(id: number) {
            material.uniforms.selected.value = id;
            material.uniformsNeedUpdate = true;
        },
        mode(i: number) {
            material.uniforms.mode.value = i;
            material.uniformsNeedUpdate = true;
        },
        update(tiles: TileSet, incremental = false) {
            if (tiles.count !== geometry.attributes.albedo.array.length / 3) {
                const source = new Array<any>(tiles.count);
                for (let i = 0; i < tiles.count; ++i) {
                    source[i] = [
                        tiles.graph.xys[i*2],
                        tiles.graph.xys[i*2+1]];
                }

                const delaunay = Delaunator.from(source);
                function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }
                function pointsOfTriangle(delaunay, t) {
                    return edgesOfTriangle(t)
                        .map(e => delaunay.triangles[e]);
                }
                
                function forEachTriangle(delaunay, callback) {
                    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
                        callback(t, pointsOfTriangle(delaunay, t));
                    }
                }

                renderIndices = new Array<number>();
                forEachTriangle(delaunay, (t, ps) => {
                    renderIndices.push(...ps);
                });

                const positions = new Float32Array(tiles.count*3);
                const indices = new Int32Array(tiles.count);
                for (let i = 0; i < tiles.count; ++i) {
                    positions[i*3+0] = tiles.x(i);
                    positions[i*3+1] = tiles.y(i);
                    positions[i*3+2] = -tiles.rockElevation(i)*50;
                    indices[i] = i;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
                geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(renderIndices), 1));
                geometry.index!.needsUpdate = true;
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.index.needsUpdate = true;
                geometry.setDrawRange(0, renderIndices.length);
            }

            let chunk = ~~(tiles.count/5);
            if (!incremental) {
                start = 0;
                chunk = tiles.count;
            }

            for (let j = start; j < start + chunk; ++j) {
                const i = j % tiles.count;
                const a = softalbedo(tiles, i).multiplyScalar(tiles.rockElevation(i)*0.6 + 0.4);
                const rock = rockNormal(tiles, i);

                geometry.attributes.position.setXYZ(i, tiles.x(i), tiles.y(i), tiles.rockElevation(i)*50 - 1);
                geometry.attributes.rocknormal.setXYZ(i, rock.x, rock.y, rock.z);
                geometry.attributes.albedo.setXYZ(i, a.x, a.y, a.z);
            }
            
            start += chunk;
            if (start > tiles.count) {
                start = 0;
            }

            updateUniforms();

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.albedo.needsUpdate = true;
            geometry.attributes.rocknormal.needsUpdate = true;
        }
    }; 
}

function waterMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'depth', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setDrawRange(0,0);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            suncolor: { value: new THREE.Vector3() },
            color: { value: new THREE.Color( 0xffffff ) },
            time: { value: 0 },
            selected: { value: -1 },
            mode: { value: 0 }
        },
    
        depthWrite: true,
        depthTest: true,
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        side: THREE.DoubleSide,
        blending: THREE.SubtractiveBlending,
    });

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, material ))

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const light = new THREE.Vector3(
            0.5,
            0.5,
            0.5);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.suncolor = { value: globalSunlight };
    }

    let start = 0;
    let renderIndices = new Array<number>();
    result.frustumCulled = false;

    return {
        object: result,
        updateUniforms,
        select(id: number) {
            material.uniforms.selected.value = id;
            material.uniformsNeedUpdate = true;
        },
        mode(i: number) {
            material.uniforms.mode.value = i;
            material.uniformsNeedUpdate = true;
        },
        update(tiles: TileSet, incremental = false) {
            if (tiles.count !== geometry.attributes.position.array.length / 3) {
                const source = new Array<any>(tiles.count);
                for (let i = 0; i < tiles.count; ++i) {
                    source[i] = [
                        tiles.graph.xys[i*2],
                        tiles.graph.xys[i*2+1]];
                }

                const delaunay = Delaunator.from(source);
                function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }
                function pointsOfTriangle(delaunay, t) {
                    return edgesOfTriangle(t)
                        .map(e => delaunay.triangles[e]);
                }
                
                function forEachTriangle(delaunay, callback) {
                    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
                        callback(t, pointsOfTriangle(delaunay, t));
                    }
                }

                renderIndices = new Array<number>();
                forEachTriangle(delaunay, (t, ps) => {
                    renderIndices.push(...ps);
                });

                const positions = new Float32Array(tiles.count*3);
                for (let i = 0; i < tiles.count; ++i) {
                    positions[i*3+0] = tiles.x(i);
                    positions[i*3+1] = tiles.y(i);
                    positions[i*3+2] = -tiles.totalElevation(i)*50;
                }
                geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'depth', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(renderIndices), 1));
                geometry.index!.needsUpdate = true;
                geometry.attributes.position.needsUpdate = true;
                geometry.setDrawRange(0, renderIndices.length);
            }

            let chunk = ~~(tiles.count/5);
            if (!incremental) {
                start = 0;
                chunk = tiles.count;
            }

            for (let j = start; j < start + chunk; ++j) {
                const i = j % tiles.count;
                const water = totalNormal(tiles, i);
                geometry.attributes.position.setXYZ(i, tiles.x(i), tiles.y(i), tiles.totalElevation(i)*50);
                geometry.attributes.depth.setX(i, tiles.water[i]);
                geometry.attributes.normal.setXYZ(i, water.x, water.y, water.z);
            }
            
            start += chunk;
            if (start > tiles.count) {
                start = 0;
            }

            updateUniforms();

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.depth.needsUpdate = true;
            geometry.attributes.normal.needsUpdate = true;
        }
    }; 
}

export function triangleMesh() {
    const hard = hardMesh();
    const soft = softMesh();
    const water = waterMesh();

    const result= new THREE.Object3D();
    result.add(hard.object);
    result.add(soft.object);
    result.add(water.object);

    return {
        object: result,
        updateUniforms() {
            //land.updateUniforms();
        },
        select(id: number) {
            //land.select(id);
        },
        mode(i: number) {
            //land.mode(i);
        },
        update(tiles: TileSet, incremental = false) {
            hard.update(tiles, incremental);
            soft.update(tiles, incremental);
            water.update(tiles, incremental);
        }
    };
}