import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

function main() {

	const canvas = document.querySelector( '#c' );
	const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );

	// --- FPS counter ---
	const stats = new Stats();
	stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb
	document.body.appendChild( stats.dom );

	const fov = 75;
	const aspect = 2;
	const near = 0.1;
	const far = 5;
	const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
	camera.position.z = 2;

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 0, 0 );
	controls.update();
    const loadManager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader();
    loader.load('resources/images/wall.jpg', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({
            map: texture,
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cubes.push(cube); 
    });



	const scene = new THREE.Scene();

	{
		const color = 0xFFFFFF;
		const intensity = 3;
		const light = new THREE.DirectionalLight( color, intensity );
		light.position.set( - 1, 2, 4 );
		scene.add( light );
	}

	const geometry = new THREE.BoxGeometry( 1, 1, 1 );

	function makeInstance( geometry, color, x ) {
		const materials = [
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-1.jpg')}),
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-2.jpg')}),
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-3.jpg')}),
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-4.jpg')}),
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-5.jpg')}),
            new THREE.MeshBasicMaterial({map: loadColorTexture('flower-6.jpg')}),
        ];
        
		const cube = new THREE.Mesh(geometry, materials);
		scene.add( cube );
		cube.position.x = x;
		return cube;
	}

     
    function loadColorTexture( path ) {
        const texture = loader.load( path );
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

	const cubes = [
		makeInstance( geometry, 0x44aa88, 0 ),
		makeInstance( geometry, 0x8844aa, - 2 ),
		makeInstance( geometry, 0xaa8844, 2 ),
	];

	function resizeRendererToDisplaySize( renderer ) {
		const canvas = renderer.domElement;
		const pixelRatio = window.devicePixelRatio;
		const width = Math.floor( canvas.clientWidth * pixelRatio );
		const height = Math.floor( canvas.clientHeight * pixelRatio );
		const needResize = canvas.width !== width || canvas.height !== height;
		if ( needResize ) {
			renderer.setSize( width, height, false );
		}
		return needResize;
	}

	function render( time ) {

		stats.begin();   // start measuring

		time *= 0.001;

		if ( resizeRendererToDisplaySize( renderer ) ) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		cubes.forEach( ( cube, ndx ) => {
			const speed = 1 + ndx * .1;
			const rot = time * speed;
			cube.rotation.x = rot;
			cube.rotation.y = rot;
		} );

		controls.update();
		renderer.render( scene, camera );

		stats.end();     // stop measuring

		requestAnimationFrame( render );

	}

	requestAnimationFrame( render );

}

main();