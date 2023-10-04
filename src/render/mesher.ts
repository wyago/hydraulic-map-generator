import * as THREE from "three";
import { Map } from "../map/Map";

import fragmentGlsl from "./fragment.glsl";
import vertexGlsl from "./vertex.glsl";

import voronoiFragment from "./voronoiFragment.glsl";
import voronoiVertex from "./voronoiVertex.glsl";

export function meshify(map: Map) {
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

        positions.push(t.x, t.y, 0);
        colors.push(r,g,b);
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
    result.add(new THREE.Points( geometry, material ))
    result.add(new THREE.LineSegments( new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial( {color: new THREE.Color("rgba(0,0,0)"), opacity: 0.2, transparent: true } ) ))
    result.add(makePoints("mountain", new THREE.TextureLoader().load( '/mountain.png' )))
    result.add(makePoints("hills", new THREE.TextureLoader().load( '/hills.png' )))
    return result;
}