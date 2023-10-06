import * as THREE from "three";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import { Tile } from "../map/Tile";
import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

const mountain = new THREE.TextureLoader().load( '/mountain.png' );
const hills = new THREE.TextureLoader().load( '/hills.png' );

export function pointsMesh(tiles: Tile[]) {
    /*const positions = new Array<number>(0);
    const colors = new Array<number>(0);
    map.allTiles.forEach(t => {
        const height = (1 - t.elevation * 0.4);
        let r = 0.43 * height;
        let g = 0.44 * height;
        let b = 0.2 * height;
        if (t.elevation < 0.2) {
            r = 0.02;
            g = 0.2;
            b = 0.3;
        } else if (t.elevation < 0.4) {
            r = 0.1;
            g = 0.2;
            b = 0.3;
        }

        t.points.forEach(p => {
            positions.push(p.x, p.y, 0);
            
            colors.push(r,g,b);
        });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );
    const material = new THREE.MeshBasicMaterial( {color: 0xffffff, vertexColors: true} );
    
    function makePoints(type: string, texture: THREE.Texture) {
        const pointPositions = new Array<number>();
        for ( let i = 0; i < map.allTiles.length; i ++ ) {
            const tile = map.allTiles[i];
            if (tile.roughness === type && tile.elevation > 0.4) {
                pointPositions.push(
                    map.allTiles[i].x,
                    map.allTiles[i].y,
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
        return new THREE.Points(pointsGeo, pointsMaterial);
    }

    const result= new THREE.Object3D();
    result.add(new THREE.Mesh( geometry, material ))
    result.add(new THREE.LineSegments( new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial( {color: new THREE.Color("rgba(0,0,0)"), opacity: 0.2, transparent: true } ) ))
    result.add(makePoints("mountain", new THREE.TextureLoader().load( '/mountain.png' )))
    result.add(makePoints("hills", new THREE.TextureLoader().load( '/hills.png' )))*/
    const positions = new Array<number>(0);
    const colors = new Array<number>(0);
    tiles.forEach(t => {
        let vx = 0;
        let vy = 0;
        t.adjacents.forEach(a => {
            const target = tiles[a];
            const delta = target.elevation - t.elevation;
            const dx = target.x - t.x;
            const dy = target.y - t.y;
            vx += dx * delta;
            vy += dy * delta;
        });
        const l = Math.sqrt(vx * vx + vy*vy);
        vx /= l;
        vy /= l;

        const height = 0.1 + t.elevation * 0.7;
        let r = 0.46 * height;
        let g = 0.44 * height;
        let b = 0.3 * height;

        let waterFactor = 0;
        if (t.elevation < 0.4) {
            waterFactor = 0.5 - t.elevation;
        } else if (t.lake + t.riverAmount*0.5 > 0.04) {
            waterFactor = (t.lake + t.riverAmount*0.5)*1.5 + 0.2;
        }

        let lightFactor = (vx + vy) * 0.06/Math.SQRT2;
        if (t.elevation < 0.4) {
            lightFactor *= Math.max(0, waterFactor)*1;
        }
        r += lightFactor*0.5;
        g += lightFactor*0.4;
        b += lightFactor*0.1;
        if (t.elevation < 0.4) {
            const depth = 0.9 - t.elevation*3.5;
            r -= 0.18 * depth;
            g -= 0.1 * depth;
            b -= 0.05 * depth;
        } else if (t.lake + t.riverAmount*0.5 > 0.04) {
            const depth = (t.lake + t.riverAmount*0.5)*3.5 + 0.3;
            r -= 0.18 * depth;
            g -= 0.15 * depth;
            b -= 0.09 * depth;
        }

        //b += t.riverAmount;

        if (t.x === t.x && t.y === t.y)
        {
            positions.push(t.x, t.y, 0);
            colors.push(r,g,b);
        }
        //t.points.forEach(p => {
            //positions.push(p.x, p.y, 0);
            //colors.push(r,g,b);
        //});
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );
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

                const height = 0.1 + t.elevation * 0.7;
                let r = 0.46 * height;
                let g = 0.44 * height;
                let b = 0.3 * height;

                let lightFactor = (vx + vy) * 0.06/Math.SQRT2;
                if (t.elevation < 0.4) {
                    lightFactor *= Math.max(0, t.elevation - 0.3)*10;
                }
                r += lightFactor*0.5;
                g += lightFactor*0.4;
                b += lightFactor*0.1;
                if (t.elevation < 0.4) {
                    const depth = 0.8 - t.elevation*0.5;
                    r -= 0.18 * depth;
                    g -= 0.15 * depth;
                    b -= 0.12 * depth;

                    r += 0.01;
                    g += 0.01;
                    b +=  0.02;
                } else if (t.lake > 0.04) {
                    const depth = (t.lake)*2.5 + 0.5;
                    r -= 0.18 * depth;
                    g -= 0.15 * depth;
                    b -= 0.10 * depth;

                    r += 0.01;
                    g += 0.01;
                    b += 0.02;
                }

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
    const positions = new Array<number>(0);
    const colors = new Array<number>(0);
    tiles.forEach(t => {
        const amount = t.riverAmount*4;
        let r = 0.1;
        let g = 0.04;
        let b = 0.01;

        if (t.x === t.x && t.y === t.y && t.riverAmount > 0.04 && t.elevation > 0.4 && t.lake < 0.04)
        {
            const target = tiles[t.downhill];
            const targetAmount = target.riverAmount*4;
            positions.push(t.x, t.y, 0);
            positions.push(target.x, target.y, 0);
            colors.push(r*amount,g*amount,b*amount);
            colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );

    const result= new THREE.Object3D();
    result.add(new THREE.LineSegments( geometry, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, blending: THREE.SubtractiveBlending }) ))
    return {
        object: result,
        update() {
            const positions = new Array<number>(0);
            const colors = new Array<number>(0);
            for (let i = 0; i < tiles.length; ++i) {
                const t = tiles[i];
                const amount = Math.min(t.riverAmount*1,2);
                let r = 0.18;
                let g = 0.15;
                let b = 0.09;

                if (t.x === t.x && t.y === t.y && t.riverAmount > 0.01 && t.elevation > 0.4 && t.lake < 0.04)
                {
                    const target = tiles[t.downhill];
                    const targetAmount = Math.min(target.riverAmount*1,2);
                    positions.push(t.x, t.y, 0);
                    positions.push(target.x, target.y, 0);
                    colors.push(r*amount,g*amount,b*amount);
                    colors.push(r*targetAmount,g*targetAmount,b*targetAmount);
                }
            }

            if (positions.length > geometry.attributes.position.count * 3) {
                geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
                geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 3 ) );
            } else {
                geometry.setDrawRange(0, positions.length / 3);

                for (let i = 0; i < positions.length; ++i) {
                    geometry.attributes.position[i] = positions[i];
                    geometry.attributes.color[i] = colors[i];
                }
            }
        }
    }
}