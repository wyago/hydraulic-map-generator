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
        const height = (0.1 + t.elevation * 0.7);
        let r = 0.46 * height;
        let g = 0.44 * height;
        let b = 0.2 * height;
        if (t.water > 0.25) {
            const factor = t.water*3;
            r -= 0.18 * factor;
            g -= 0.13 * factor;
            b -= 0.05 * factor;
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
        return new THREE.Points(pointsGeo, pointsMaterial);
    }

    const result= new THREE.Object3D();
    result.add(new THREE.Points( geometry, material ))
    //result.add(new THREE.LineSegments( new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial( {color: new THREE.Color("rgba(0,0,0)"), opacity: 0.2, transparent: true } ) ))
    result.add(makePoints("mountain", mountain))
    result.add(makePoints("hills", hills))
    return result;
}


export function riverMesh(tiles: Tile[]) {
    const positions = new Array<number>(0);
    const colors = new Array<number>(0);
    tiles.forEach(t => {
        const amount = t.water;
        let r = 0.01;
        let g = 0.04;
        let b = 0.1;

        if (t.x === t.x && t.y === t.y && t.water < 0.15)
        {
            const target = tiles[t.riverDirection];
            positions.push(t.x, t.y, 0);
            positions.push(target.x, target.y, 0);
            colors.push(r,g,b, amount*9);
            if (target.water > 0.15) {
                colors.push(r,g,b, 0);
            } else {
                colors.push(r,g,b, target.water*9);
            }
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array(colors), 4 ) );

    const result= new THREE.Object3D();
    result.add(new THREE.LineSegments( geometry, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }) ))
    return result;
}