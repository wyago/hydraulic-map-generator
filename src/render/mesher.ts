import * as THREE from "three";


import { rockAlbedo, siltAlbedo, softRockAlbedo, vegetationAlbedo } from "../colors";
import { clamp, lerp } from "../math";
import { TileSet } from "../terrain/PointSet";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";


function albedo(tiles: TileSet, i: number) {
    const result = new THREE.Vector3();

    const height = (tiles.rockElevation(i) - 0.28)*4;
    const siltColor = {
        r: lerp(siltAlbedo.r, softRockAlbedo.r, height),
        g: lerp(siltAlbedo.g, softRockAlbedo.g, height),
        b: lerp(siltAlbedo.b, softRockAlbedo.b, height),
    };

    const softness = (tiles.soft[i] / tiles.rockElevation(i)) * 3;
    const siltPortion = Math.max(softness, 0);
    result.x = lerp(rockAlbedo.r, siltColor.r, siltPortion);
    result.y = lerp(rockAlbedo.g, siltColor.g, siltPortion);
    result.z = lerp(rockAlbedo.b, siltColor.b, siltPortion);

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

export function pointsMesh() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1024*3);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'albedo', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'occlusion', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(1024*3), 3 ) );
    geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(1024), 1 ) );
    geometry.setDrawRange(0,0);
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            sunlight: { value: new THREE.Vector3() },
            color: { value: new THREE.Color( 0xffffff ) },
            time: { value: 0 },
            selected: { value: -1 },
            mode: { value: 0 }
        },
    
        depthWrite: true,
        depthTest: true,
        vertexShader: voronoiVertex,
        fragmentShader: voronoiFragment,
        blending: THREE.NormalBlending,
    });

    const result= new THREE.Object3D();
    result.add(new THREE.Points( geometry, material ))

    function updateUniforms() {
        globalSunlight.set(0.9,0.9, 0.85);
        const rad = Date.now() * 0.001;
        const light = new THREE.Vector3(
            0.5,
            0.5,
            0.5);
        light.normalize();
        material.uniforms.light = { value: light };
        material.uniforms.sunlight = { value: globalSunlight };
    }

    let start = 0;

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
            if (tiles.count > geometry.attributes.albedo.array.length / 3) {
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
                geometry.setAttribute( 'water', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setAttribute( 'rocknormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'waternormal', new THREE.BufferAttribute( new Float32Array(tiles.count*3), 3 ) );
                geometry.setAttribute( 'height', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setAttribute( 'occlusion', new THREE.BufferAttribute( new Float32Array(tiles.count), 1 ) );
                geometry.setAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.index.needsUpdate = true;
            }

            let chunk = ~~(tiles.count/5);
            if (!incremental) {
                start = 0;
                chunk = tiles.count;
            }

            for (let j = start; j < start + chunk; ++j) {
                const i = j % tiles.count;
                const a = albedo(tiles, i).multiplyScalar(tiles.totalElevation(i)*0.6 + 0.4);
                const rock = rockNormal(tiles, i);
                const water = totalNormal(tiles, i);

                geometry.attributes.position.setXYZ(i, tiles.x(i), tiles.y(i), 0);
                geometry.attributes.albedo.setXYZ(i, a.x, a.y, a.z);
                geometry.attributes.rocknormal.setXYZ(i, rock.x, rock.y, rock.z);
                geometry.attributes.waternormal.setXYZ(i, water.x, water.y, water.z);
                geometry.attributes.water.setX(i, tiles.surfaceWater(i));
                geometry.attributes.height.setX(i, tiles.totalElevation(i));
                geometry.attributes.occlusion.setX(i, tiles.occlusion[i]);
            }
            geometry.setDrawRange(0, tiles.count);
            
            start += chunk;
            if (start > tiles.count) {
                start = 0;
            }

            updateUniforms();

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.albedo.needsUpdate = true;
            geometry.attributes.water.needsUpdate = true;
            geometry.attributes.rocknormal.needsUpdate = true;
            geometry.attributes.waternormal.needsUpdate = true;
            geometry.attributes.height.needsUpdate = true;
            geometry.attributes.occlusion.needsUpdate = true;
            geometry.attributes.index.needsUpdate = true;
        }
    };
}

export function riverMesh() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(), 3 ) );

    function offset(tiles: TileSet, source: number, amount: number) {
        const target = tiles.uphill[source];
        const sx = tiles.vertices.xys[source*2];
        const sy = tiles.vertices.xys[source*2+1];
        const tx = tiles.vertices.xys[target*2];
        const ty = tiles.vertices.xys[target*2+1];

        const tv = new THREE.Vector2(tx - sx, ty - sy);

        const dx = -tv.y  * clamp(amount, 0.05, 1);
        const dy = tv.x  * clamp(amount, 0.05, 1);
        return { dx, dy };
    }

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, blending: THREE.SubtractiveBlending }) ))
    return {
        object: result,
        update(tiles: TileSet) {
            const include = new Uint8Array(tiles.count);
            const positions = new Array<number>(0);
            const colors = new Array<number>(0);

            for (let i = 0; i < tiles.count; ++i) {
                if (include[i] === 0 && tiles.surfaceWater(i) > 0) {
                    let current = i;
                    include[current] += 1;
                    do  {
                        const next = tiles.uphill[current];
                        if (tiles.totalElevation(next) <= tiles.totalElevation(current)) {
                            break;
                        }
                        include[current] += 1;
                        current = next;
                    } while (true);
                    include[current] += 1;
                }
            }

            for (let i = 0; i < tiles.count; ++i) {
                let r = 0.18;
                let g = 0.1;
                let b = 0.05;

                const target = tiles.uphill[i];
                if (tiles.river[target] > 0.1)
                {
                    const sourceAmount = 1;//Math.min(Math.log(tiles.river(i)*1 + 1), 2.9);
                    const targetAmount = 1;//Math.min(Math.log(tiles.river(target)*1 + 1), 2.9);

                    const {dx: sx, dy: sy} = offset(tiles, i, 0.1);
                    const {dx: tx, dy: ty} = offset(tiles, target, 0.1);

                    const sv = new THREE.Vector2(tiles.vertices.xys[i*2], tiles.vertices.xys[i*2+1]);
                    const tv = new THREE.Vector2(tiles.vertices.xys[target*2], tiles.vertices.xys[target*2+1]);

                    const te = tiles.totalElevation(target)*-50;
                    const se = tiles.totalElevation(i)*-50;
                    positions.push(tv.x + tx, tv.y + ty, te);
                    positions.push(sv.x + sx, sv.y + sy, se);
                    positions.push(sv.x - sx, sv.y - sy, se);

                    positions.push(sv.x - sx, sv.y - sy, se);
                    positions.push(tv.x - tx, tv.y - ty, te);
                    positions.push(tv.x + tx, tv.y + ty, te);

                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);

                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                    colors.push(r*sourceAmount,g*sourceAmount,b*sourceAmount);
                }
            }

            if (true || positions.length > geometry.attributes.position.count * 3) {
                geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
                geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );
            } else {
                for (let i = 0; i < positions.length; ++i) {
                    geometry.attributes.position[i] = positions[i];
                    geometry.attributes.color[i] = colors[i];
                }
            }
            geometry.setDrawRange(0, positions.length / 3);

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        }
    }
}
