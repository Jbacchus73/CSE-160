import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import SpectatorControls from './SpectatorControls.js';

function main() {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.2;

	const stats = new Stats();
	stats.showPanel(0);
	document.body.appendChild(stats.dom);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);

	const fov = 75;
	const aspect = 2;
	const near = 0.1;
	const far = 100;
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.set(0, 10, 20);

	const orbitControls = new OrbitControls(camera, renderer.domElement);
	orbitControls.target.set(0, 0, 0);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.05;
	orbitControls.update();

	const spectatorControls = new SpectatorControls(camera, renderer.domElement, {
		moveSpeed: 6,
		lookSpeed: 0.0025,
		friction: 0.85,
	});

	let activeControls = 'orbit';

	const switchButton = document.querySelector('#switchControls');

	switchButton.addEventListener('click', () => {
		if (activeControls === 'orbit') {
			activeControls = 'spectator';
			orbitControls.enabled = false;
			spectatorControls.enable();
			switchButton.textContent = 'Switch to Orbit Controls';
		} else {
			activeControls = 'orbit';
			spectatorControls.disable();
			orbitControls.enabled = true;
			switchButton.textContent = 'Switch to Free Roam Controls';
		}
	});

	const clock = new THREE.Clock();

	const loadManager = new THREE.LoadingManager();
	const textureLoader = new THREE.TextureLoader(loadManager);

	const loadingElem = document.querySelector('#loading');
	const progressBarElem = loadingElem.querySelector('.progressbar');

	function loadColorTexture(path) {
		const texture = textureLoader.load(path);
		texture.colorSpace = THREE.SRGBColorSpace;
		return texture;
	}

	function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
		const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
		const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
		const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

		const direction = new THREE.Vector3()
			.subVectors(camera.position, boxCenter)
			.multiply(new THREE.Vector3(1, 0, 1))
			.normalize();

		camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

		camera.near = boxSize / 100;
		camera.far = boxSize * 100;
		camera.updateProjectionMatrix();

		camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
	}

	class DegRadHelper {
		constructor(obj, prop) {
			this.obj = obj;
			this.prop = prop;
		}

		get value() {
			return THREE.MathUtils.radToDeg(this.obj[this.prop]);
		}

		set value(v) {
			this.obj[this.prop] = THREE.MathUtils.degToRad(v);
		}
	}

	class StringToNumberHelper {
		constructor(obj, prop) {
			this.obj = obj;
			this.prop = prop;
		}

		get value() {
			return this.obj[this.prop];
		}

		set value(v) {
			this.obj[this.prop] = parseFloat(v);
		}
	}

	{
		const color = 0xffffff;
		const intensity = 2;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(-1, 2, 4);
		scene.add(light);
	}

	{
		const color = 0xffffff;
		const intensity = 1.2;
		const light = new THREE.AmbientLight(color, intensity);
		scene.add(light);
	}

	{
		const skyColor = 0xb1e1ff;
		const groundColor = 0xb97a20;
		const intensity = 1;
		const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		scene.add(light);
	}

	{
		const planeSize = 4000;

		const texture = textureLoader.load('resources/images/checker.png');
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.magFilter = THREE.NearestFilter;
		texture.colorSpace = THREE.SRGBColorSpace;

		const repeats = planeSize / 200;
		texture.repeat.set(repeats, repeats);

		const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
		const planeMat = new THREE.MeshPhongMaterial({
			map: texture,
			side: THREE.DoubleSide,
		});

		const mesh = new THREE.Mesh(planeGeo, planeMat);
		mesh.rotation.x = Math.PI * -0.5;
		scene.add(mesh);
	}

	{
		const speakerBaseColor = textureLoader.load('obj/speakertextures/Multimedia Speaker_speaker_base_BaseColor.png');
		const speakerMetallic = textureLoader.load('obj/speakertextures/Multimedia Speaker_speaker_base_Metallic.png');
		const speakerNormal = textureLoader.load('obj/speakertextures/Multimedia Speaker_speaker_base_Normal.png');
		const speakerRoughness = textureLoader.load('obj/speakertextures/Multimedia Speaker_speaker_base_Roughness.png');

		speakerBaseColor.colorSpace = THREE.SRGBColorSpace;

		speakerBaseColor.flipY = true;
		speakerMetallic.flipY = true;
		speakerNormal.flipY = true;
		speakerRoughness.flipY = true;

		const speakerMaterial = new THREE.MeshStandardMaterial({
			map: speakerBaseColor,
			metalnessMap: speakerMetallic,
			normalMap: speakerNormal,
			roughnessMap: speakerRoughness,
			metalness: 0.6,
			roughness: 0.75,
			normalScale: new THREE.Vector2(1.5, 1.5),
		});

		const objLoader = new OBJLoader();

		objLoader.load('obj/speaker.obj', (root) => {
			root.position.set(-2, 0, 0);
			root.scale.set(5, 5, 5);

			root.traverse((child) => {
				if (child.isMesh) {
					child.material = speakerMaterial;
				}
			});

			scene.add(root);

			const box = new THREE.Box3().setFromObject(root);

			const boxSize = box.getSize(new THREE.Vector3()).length();
			const boxCenter = box.getCenter(new THREE.Vector3());

			frameArea(boxSize * 1.2, boxSize, boxCenter, camera);

			orbitControls.maxDistance = boxSize * 10;
			orbitControls.target.copy(boxCenter);
			orbitControls.update();
		});
	}

	/*
	// Use this later when you have an .mtl file.
	// Keep MTLLoader imported at the top, but leave this block commented out for now.

	{
		const mtlLoader = new MTLLoader();

		mtlLoader.load('resources/models/windmill_2/windmill-fixed.mtl', (mtl) => {
			mtl.preload();

			const objLoader = new OBJLoader();
			objLoader.setMaterials(mtl);

			objLoader.load('resources/models/windmill_2/windmill.obj', (root) => {
				scene.add(root);

				const box = new THREE.Box3().setFromObject(root);

				const boxSize = box.getSize(new THREE.Vector3()).length();
				const boxCenter = box.getCenter(new THREE.Vector3());

				frameArea(boxSize * 1.2, boxSize, boxCenter, camera);

				orbitControls.maxDistance = boxSize * 10;
				orbitControls.target.copy(boxCenter);
				orbitControls.update();
			});
		});
	}
	*/

	const geometry = new THREE.BoxGeometry(1, 1, 1);

	const texture = loadColorTexture('test/flower-1.jpg');
	const texture2 = loadColorTexture('test/flower-2.jpg');
	const texture3 = loadColorTexture('test/flower-3.jpg');
	const texture4 = loadColorTexture('test/flower-4.jpg');
	const texture5 = loadColorTexture('test/flower-5.jpg');
	const texture6 = loadColorTexture('test/flower-6.jpg');

	const textures = [texture, texture2, texture3, texture4, texture5, texture6];

	const materials = [
		new THREE.MeshBasicMaterial({ map: texture }),
		new THREE.MeshBasicMaterial({ map: texture2 }),
		new THREE.MeshBasicMaterial({ map: texture3 }),
		new THREE.MeshBasicMaterial({ map: texture4 }),
		new THREE.MeshBasicMaterial({ map: texture5 }),
		new THREE.MeshBasicMaterial({ map: texture6 }),
	];

	const wrapModes = {
		ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
		RepeatWrapping: THREE.RepeatWrapping,
		MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
	};

	function updateTexture() {
		textures.forEach((tex) => {
			tex.wrapS = texture.wrapS;
			tex.wrapT = texture.wrapT;
			tex.repeat.copy(texture.repeat);
			tex.offset.copy(texture.offset);
			tex.center.copy(texture.center);
			tex.rotation = texture.rotation;
			tex.needsUpdate = true;
		});
	}

	const color = 0xFFFFFF;
	const intensity = 1;
	const light = new THREE.DirectionalLight(color, intensity);
	light.position.set(0, 10, 0);
	light.target.position.set(-5, 0, 0);
	scene.add(light);
	scene.add(light.target);

	class ColorGUIHelper {
	constructor(object, prop) {
		this.object = object;
		this.prop = prop;
	}
	get value() {
		return '#' + this.object[this.prop].getHexString();
	}
	set value(hexString) {
		this.object[this.prop].set(hexString);
	}
	}

	const gui = new GUI();
	gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color');
	gui.add(light, 'intensity', 0, 5, 0.01);
	gui.add(light.target.position, 'x', -10, 10);
	gui.add(light.target.position, 'z', -10, 10);
	gui.add(light.target.position, 'y', 0, 10);

	gui.add(new StringToNumberHelper(texture, 'wrapS'), 'value', wrapModes)
		.name('texture.wrapS')
		.onChange(updateTexture);

	gui.add(new StringToNumberHelper(texture, 'wrapT'), 'value', wrapModes)
		.name('texture.wrapT')
		.onChange(updateTexture);

	gui.add(texture.repeat, 'x', 0, 5, 0.01)
		.name('texture.repeat.x')
		.onChange(updateTexture);

	gui.add(texture.repeat, 'y', 0, 5, 0.01)
		.name('texture.repeat.y')
		.onChange(updateTexture);

	gui.add(texture.offset, 'x', -2, 2, 0.01)
		.name('texture.offset.x')
		.onChange(updateTexture);

	gui.add(texture.offset, 'y', -2, 2, 0.01)
		.name('texture.offset.y')
		.onChange(updateTexture);

	gui.add(texture.center, 'x', -0.5, 1.5, 0.01)
		.name('texture.center.x')
		.onChange(updateTexture);

	gui.add(texture.center, 'y', -0.5, 1.5, 0.01)
		.name('texture.center.y')
		.onChange(updateTexture);

	gui.add(new DegRadHelper(texture, 'rotation'), 'value', -360, 360)
		.name('texture.rotation')
		.onChange(updateTexture);

	const cubes = [];

	loadManager.onLoad = () => {
		loadingElem.style.display = 'none';

		updateTexture();

		const cube = new THREE.Mesh(geometry, materials);
		cube.position.set(2, 1, 0);
		scene.add(cube);
		cubes.push(cube);
	};

	loadManager.onProgress = (urlOfLastItemLoaded, itemsLoaded, itemsTotal) => {
		const progress = itemsLoaded / itemsTotal;
		progressBarElem.style.transform = `scaleX(${progress})`;
	};

	function resizeRendererToDisplaySize(renderer) {
		const canvas = renderer.domElement;
		const pixelRatio = window.devicePixelRatio;
		const width = Math.floor(canvas.clientWidth * pixelRatio);
		const height = Math.floor(canvas.clientHeight * pixelRatio);
		const needResize = canvas.width !== width || canvas.height !== height;

		if (needResize) {
			renderer.setSize(width, height, false);
		}

		return needResize;
	}

	function render(time) {
		stats.begin();

		time *= 0.001;

		if (resizeRendererToDisplaySize(renderer)) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		cubes.forEach((cube, ndx) => {
			const speed = 1 + ndx * 0.1;
			const rot = time * speed;
			cube.rotation.x = rot;
			cube.rotation.y = rot;
		});

		const delta = clock.getDelta();

		if (activeControls === 'orbit') {
			orbitControls.update();
		} else {
			spectatorControls.update(delta);
		}

		renderer.render(scene, camera);

		stats.end();

		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

main();