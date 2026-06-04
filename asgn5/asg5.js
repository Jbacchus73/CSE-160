import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import SpectatorControls from './SpectatorControls.js';
import Island from './island.js';
import DayNight from './daynight.js';
import Studio from './studio.js';
import AmbientAudio from './audio.js';


function main() {
	const canvas = document.querySelector('#c');

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		canvas,
	});

	// OPTIMIZATION: cap pixel ratio (Retina renders 4x pixels otherwise)
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.2;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;

	const stats = new Stats();
	stats.showPanel(0);
	document.body.appendChild(stats.dom);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);

	const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 200);
	camera.position.set(0, 8, 14);

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

	const ambient = new AmbientAudio(camera, {
		path: './audio/nature.wav',
		volume: 0.5,
		loop: true,
		reverbAmount: 0.18,
		swellAmount: 0.12,
		swellSpeed: 0.35,
	});

	const startAmbientAudio = () => {
		ambient.play();
		window.removeEventListener('click', startAmbientAudio);
		window.removeEventListener('keydown', startAmbientAudio);
	};

	window.addEventListener('click', startAmbientAudio);
	window.addEventListener('keydown', startAmbientAudio);

	let activeControls = 'orbit';

	const switchButton = document.querySelector('#switchControls');

	if (switchButton) {
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
	}

	const clock = new THREE.Clock();

	const loadManager = new THREE.LoadingManager();
	const textureLoader = new THREE.TextureLoader(loadManager);

	const loadingElem = document.querySelector('#loading');
	const progressBarElem = loadingElem ? loadingElem.querySelector('.progressbar') : null;

	loadManager.onLoad = () => {
		if (loadingElem) {
			loadingElem.style.display = 'none';
		}
	};

	loadManager.onProgress = (urlOfLastItemLoaded, itemsLoaded, itemsTotal) => {
		if (!progressBarElem) return;
		const progress = itemsLoaded / itemsTotal;
		progressBarElem.style.transform = `scaleX(${progress})`;
	};

	function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
		const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
		const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
		const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

		const direction = new THREE.Vector3()
			.subVectors(camera.position, boxCenter)
			.multiply(new THREE.Vector3(1, 0, 1));

		if (direction.lengthSq() === 0) {
			direction.set(0, 0, 1);
		}

		direction.normalize();

		camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));
		camera.near = boxSize / 100;
		camera.far = boxSize * 100;
		camera.updateProjectionMatrix();
		camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
	}

	const island = new Island(scene, textureLoader, {
		radius: 16,
		groundColor: 0x3d6b27,
		grassObjPath: 'obj/high_grass.obj',

		grassClusterCount: 960,
		grassTuftsPerClusterMin: 2,
		grassTuftsPerClusterMax: 4,
		grassClusterRadiusMin: 0.18,
		grassClusterRadiusMax: 1.25,
		grassIsolatedTufts: 480,

		grassEdgeMargin: 0.15,
		grassClearCenterRadius: 0,

		grassScaleMin: 0.7,
		grassScaleMax: 1.8,
		grassSink: 0.02,
		grassLeanAmount: 0.55,
		grassMinSpacing: 0.12,

		// grass shadows ON
		grassCastShadow: false,
		grassReceiveShadow: true,

		autoGenerateGrass: true,
	});

	const studio = new Studio(scene, {
		x: 5,
		y: island.surfaceY,
		z: -10.5,
		width: 7.2,
		depth: 5.8,
		height: 2.6,
		rotationY: -0.12,
	});

	if (typeof island.addGrassBlockerCircle === 'function') {
		island.addGrassBlockerCircle(5, -10.5, 5.6);
	}

	const dayNight = new DayNight(scene, {
		radius: 34,
		speed: 0.005,
		sunIntensity: 3.2,
		moonIntensity: 0.75,
		ambientDayIntensity: 1.1,
		ambientNightIntensity: 0.18,

		// updated shadow settings for crisp, stable grass shadows
		enableShadows: true,
		shadowSize: 2048,          // power of two
		shadowCameraSize: 18,      // covers the radius-16 island
		shadowFollowCamera: true,  // keeps shadows dense where you look

		textureLoader,
		skyRadius: 120,
		morningSky: 'skycube/morning.png',
		daySky: 'skycube/day.png',
		goldenSky: 'skycube/golden_hour.png',
		nightSky: 'skycube/night.png',
	});

	function loadSpeaker() {
		return new Promise((resolve) => {
			const speakerBaseColor = textureLoader.load('obj/textures/Multimedia Speaker_speaker_base_BaseColor.png');
			const speakerMetallic = textureLoader.load('obj/textures/Multimedia Speaker_speaker_base_Metallic.png');
			const speakerNormal = textureLoader.load('obj/textures/Multimedia Speaker_speaker_base_Normal.png');
			const speakerRoughness = textureLoader.load('obj/textures/Multimedia Speaker_speaker_base_Roughness.png');

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

			objLoader.load(
				'obj/speaker.obj',
				(root) => {
					root.position.set(-2, island.surfaceY, 0);
					root.scale.set(5, 5, 5);

					root.traverse((child) => {
						if (child.isMesh) {
							child.material = speakerMaterial;
							child.castShadow = true;
							child.receiveShadow = true;
						}
					});

					scene.add(root);

					if (typeof island.addGrassBlockerCircle === 'function') {
						island.addGrassBlockerCircle(-2, 0, 3.5);
					}

					const box = new THREE.Box3().setFromObject(root);
					const boxSize = box.getSize(new THREE.Vector3()).length();
					const boxCenter = box.getCenter(new THREE.Vector3());

					frameArea(boxSize * 1.2, boxSize, boxCenter, camera);

					orbitControls.maxDistance = boxSize * 10;
					orbitControls.target.copy(boxCenter);
					orbitControls.update();

					resolve(root);
				},
				undefined,
				(error) => {
					console.error('Failed to load speaker:', error);
					resolve(null);
				}
			);
		});
	}

	function normalizeTree(root) {
		const box = new THREE.Box3().setFromObject(root);
		const center = box.getCenter(new THREE.Vector3());
		root.position.x -= center.x;
		root.position.z -= center.z;
		root.position.y -= box.min.y;
	}

	function makeBarkDetailTexture() {
		const size = 128;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = '#7a4a24';
		ctx.fillRect(0, 0, size, size);

		for (let i = 0; i < 500; i++) {
			const x = Math.random() * size;
			const y = Math.random() * size;
			const w = 1 + Math.random() * 2;
			const h = 6 + Math.random() * 16;
			ctx.fillStyle = Math.random() < 0.5 ? '#5a3418' : '#9a6435';
			ctx.fillRect(x, y, w, h);
		}

		for (let i = 0; i < 180; i++) {
			const x = Math.random() * size;
			const y = Math.random() * size;
			const r = 1 + Math.random() * 2;
			ctx.fillStyle = Math.random() < 0.5 ? '#4a2b14' : '#b07845';
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(2, 2);
		return texture;
	}

	const barkDetailTexture = makeBarkDetailTexture();

	function fixTreeMaterials(root) {
		const barkMaterial = new THREE.MeshStandardMaterial({
			color: 0x6a4020,
			roughness: 0.98,
			metalness: 0,
			bumpMap: barkDetailTexture,
			bumpScale: 1.0,
			roughnessMap: barkDetailTexture,
		});

		const leafMaterial = new THREE.MeshStandardMaterial({
			color: 0x2f7a2f,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide,
		});

		root.traverse((child) => {
			if (!child.isMesh) return;

			child.castShadow = true;
			child.receiveShadow = true;

			if (Array.isArray(child.material)) {
				child.material = child.material.map((mat) => {
					const matName = mat && mat.name ? mat.name.toLowerCase() : '';
					if (matName.includes('tree_leaves') || matName.includes('leaf') || matName.includes('leaves')) {
						return leafMaterial.clone();
					}
					if (matName.includes('bark') || matName.includes('trunk')) {
						return barkMaterial.clone();
					}
					return mat;
				});
			} else if (child.material) {
				const matName = child.material.name ? child.material.name.toLowerCase() : '';
				if (matName.includes('tree_leaves') || matName.includes('leaf') || matName.includes('leaves')) {
					child.material = leafMaterial.clone();
				} else if (matName.includes('bark') || matName.includes('trunk')) {
					child.material = barkMaterial.clone();
				}
			}
		});
	}

	function loadTreeTemplate({
		treeFolder = 'obj/',
		treeObjPath = 'tree.obj',
		treeMtlPath = 'tree.mtl',
	} = {}) {
		return new Promise((resolve) => {
			const mtlLoader = new MTLLoader();
			mtlLoader.setPath(treeFolder);

			mtlLoader.load(
				treeMtlPath,
				(materials) => {
					materials.preload();

					Object.values(materials.materials).forEach((mat) => {
						if (!mat) return;
						const name = mat.name ? mat.name.toLowerCase() : '';
						mat.roughness = 1;
						mat.metalness = 0;
						if (name.includes('bark') || name.includes('trunk')) {
							mat.color.set(0x6b3f1f);
						}
						if (name.includes('leaf') || name.includes('leaves') || name.includes('tree_leaves')) {
							mat.color.set(0x2f7a2f);
							mat.side = THREE.DoubleSide;
						}
					});

					const objLoader = new OBJLoader();
					objLoader.setPath(treeFolder);
					objLoader.setMaterials(materials);

					objLoader.load(
						treeObjPath,
						(root) => {
							normalizeTree(root);
							fixTreeMaterials(root);
							resolve(root);
						},
						undefined,
						(error) => {
							console.error('Failed to load tree OBJ:', error);
							resolve(null);
						}
					);
				},
				undefined,
				(error) => {
					console.error('Failed to load tree MTL:', error);
					resolve(null);
				}
			);
		});
	}

	function addRandomTrees({
		treeFolder = 'obj/',
		treeObjPath = 'tree.obj',
		treeMtlPath = 'tree.mtl',
		treeCount = 8,
		minRadius = 3.5,
		maxRadius = 14.6,
		scaleMin = 0.8,
		scaleMax = 1.2,
		blockerRadius = 1.45,
		minTreeSpacing = 7.0,
	} = {}) {
		return new Promise((resolve) => {
			loadTreeTemplate({ treeFolder, treeObjPath, treeMtlPath }).then((root) => {
				if (!root) {
					resolve([]);
					return;
				}

				let placed = 0;
				let attempts = 0;
				const treePositions = [];

				const blockedAreas = [
					{ x: 5, z: -10.5, radius: 5.2 },
				];

				while (placed < treeCount && attempts < treeCount * 150) {
					attempts++;

					const angle = Math.random() * Math.PI * 2;
					let dist;
					if (Math.random() < 0.65) {
						dist = THREE.MathUtils.randFloat(8.0, maxRadius);
					} else {
						dist = THREE.MathUtils.randFloat(minRadius, 8.0);
					}

					const x = Math.cos(angle) * dist;
					const z = Math.sin(angle) * dist;

					let tooClose = false;
					for (const blocked of blockedAreas) {
						const dx = x - blocked.x;
						const dz = z - blocked.z;
						if (dx * dx + dz * dz < blocked.radius * blocked.radius) {
							tooClose = true;
							break;
						}
					}
					if (tooClose) continue;

					for (const p of treePositions) {
						const dx = x - p.x;
						const dz = z - p.z;
						const randomSpacing = minTreeSpacing * THREE.MathUtils.randFloat(0.75, 1.45);
						if (dx * dx + dz * dz < randomSpacing * randomSpacing) {
							tooClose = true;
							break;
						}
					}
					if (tooClose) continue;

					const tree = root.clone(true);
					const scale = THREE.MathUtils.randFloat(scaleMin, scaleMax);

					tree.position.set(x, island.surfaceY, z);
					tree.rotation.y = Math.random() * Math.PI * 2;
					tree.scale.set(
						scale * THREE.MathUtils.randFloat(0.85, 1.15),
						scale * THREE.MathUtils.randFloat(0.9, 1.25),
						scale * THREE.MathUtils.randFloat(0.85, 1.15)
					);

					scene.add(tree);

					if (typeof island.addGrassBlockerCircle === 'function') {
						island.addGrassBlockerCircle(x, z, blockerRadius);
					}

					treePositions.push({ x, z });
					placed++;
				}

				console.log('Trees placed:', placed);
				resolve(treePositions);
			});
		});
	}

	function addRandomClouds({
		cloudFolder = 'obj/',
		cloudObjPath = 'Low Poly Clouds.obj',
		cloudMtlPath = 'Low Poly Clouds.mtl',
		cloudCount = 20,
		minRadius = 0,
		maxRadius = 15,
		minHeight = 15,
		maxHeight = 23,
		scaleMin = 0.75,
		scaleMax = 1.2,
		opacity = 0.72,
		shadowChance = 0.0,
	} = {}) {
		return new Promise((resolve) => {
			const mtlLoader = new MTLLoader();
			mtlLoader.setPath(cloudFolder);

			mtlLoader.load(
				cloudMtlPath,
				(materials) => {
					materials.preload();

					Object.values(materials.materials).forEach((mat) => {
						if (!mat) return;
						mat.color.set(0xffffff);
						mat.roughness = 1;
						mat.metalness = 0;
						mat.transparent = true;
						mat.opacity = opacity;
						mat.depthWrite = false;
					});

					const objLoader = new OBJLoader();
					objLoader.setPath(cloudFolder);
					objLoader.setMaterials(materials);

					objLoader.load(
						cloudObjPath,
						(root) => {
							const box = new THREE.Box3().setFromObject(root);
							const center = box.getCenter(new THREE.Vector3());

							const template = new THREE.Group();
							root.position.set(-center.x, -center.y, -center.z);
							template.add(root);

							template.traverse((child) => {
								if (!child.isMesh) return;
								child.castShadow = true;
								child.receiveShadow = false;
								child.material = new THREE.MeshStandardMaterial({
									color: 0xffffff,
									roughness: 1,
									metalness: 0,
									transparent: true,
									opacity,
									depthWrite: false,
								});
							});

							const cloudGroup = new THREE.Group();
							scene.add(cloudGroup);

							const cloudPositions = [];
							let placedClouds = 0;
							let cloudAttempts = 0;
							const minCloudSpacing = 9.0;

							while (placedClouds < cloudCount && cloudAttempts < cloudCount * 80) {
								cloudAttempts++;

								const cloud = template.clone(true);
								const angle = Math.random() * Math.PI * 2;
								let dist;
								const zoneRoll = Math.random();

								if (zoneRoll < 0.35) {
									dist = Math.sqrt(Math.random()) * 14;
								} else if (zoneRoll < 0.75) {
									dist = THREE.MathUtils.randFloat(14, 28);
								} else {
									dist = THREE.MathUtils.randFloat(28, 45);
								}

								const x = Math.cos(angle) * dist;
								const y = THREE.MathUtils.randFloat(minHeight, maxHeight);
								const z = Math.sin(angle) * dist;

								let tooClose = false;
								for (const p of cloudPositions) {
									const dx = x - p.x;
									const dz = z - p.z;
									const dy = y - p.y;
									if (dx * dx + dz * dz + dy * dy < minCloudSpacing * minCloudSpacing) {
										tooClose = true;
										break;
									}
								}
								if (tooClose) continue;

								const scale = THREE.MathUtils.randFloat(scaleMin, scaleMax);

								cloud.position.set(x, y, z);
								cloud.rotation.y = Math.random() * Math.PI * 2;
								cloud.rotation.x = THREE.MathUtils.randFloat(-0.05, 0.05);
								cloud.rotation.z = THREE.MathUtils.randFloat(-0.04, 0.04);

								cloud.scale.set(
									scale * THREE.MathUtils.randFloat(1.2, 2.0),
									scale * THREE.MathUtils.randFloat(0.45, 0.75),
									scale * THREE.MathUtils.randFloat(0.9, 1.5)
								);

								const shouldCastShadow = Math.random() < shadowChance;
								cloud.traverse((child) => {
									if (child.isMesh) child.castShadow = shouldCastShadow;
								});

								cloudGroup.add(cloud);
								cloudPositions.push({ x, y, z });
								placedClouds++;
							}

							console.log('Clouds placed:', placedClouds);
							resolve(cloudGroup);
						},
						undefined,
						(error) => {
							console.error('Failed to load cloud OBJ:', error);
							resolve(null);
						}
					);
				},
				undefined,
				(error) => {
					console.error('Failed to load cloud MTL:', error);
					resolve(null);
				}
			);
		});
	}

	Promise.allSettled([
		loadSpeaker(),
		addRandomTrees({
			treeFolder: 'obj/',
			treeObjPath: 'tree.obj',
			treeMtlPath: 'tree.mtl',
			treeCount: 8,
			minRadius: 3.5,
			maxRadius: 14.6,
			scaleMin: 0.9,
			scaleMax: 1.2,
			blockerRadius: 1.45,
			minTreeSpacing: 4.5,
		}),
		addRandomClouds({
			cloudFolder: 'obj/',
			cloudObjPath: 'Low Poly Clouds.obj',
			cloudMtlPath: 'Low Poly Clouds.mtl',
			cloudCount: 20,
			minRadius: 0,
			maxRadius: 34,
			minHeight: 30,
			maxHeight: 35,
			scaleMin: 0.75,
			scaleMax: 1.2,
			opacity: 0.72,
			shadowChance: 0.35,
		}),
	]).then(() => {
		if (typeof island.generateGrass === 'function') {
			island.generateGrass(true);
		}
	});

	// ---- GUI (defensive: only add controls for properties that exist) ----
	const gui = new GUI();

	const dayNightFolder = gui.addFolder('Day Night Cycle');
	dayNightFolder.add(dayNight, 'speed', 0, 0.3, 0.001).name('cycle speed');
	dayNightFolder.add(dayNight, 'radius', 10, 80, 1).name('sun/moon orbit');
	dayNightFolder.add(dayNight, 'sunIntensity', 0, 6, 0.01).name('sun intensity');
	dayNightFolder.add(dayNight, 'moonIntensity', 0, 3, 0.01).name('moon intensity');
	dayNightFolder.add(dayNight, 'ambientDayIntensity', 0, 3, 0.01).name('day ambient');
	dayNightFolder.add(dayNight, 'ambientNightIntensity', 0, 1, 0.01).name('night ambient');

	const safeAdd = (folder, obj, prop, ...args) => {
		if (obj && obj[prop] !== undefined) {
			return folder.add(obj, prop, ...args);
		}
		console.warn(`GUI skipped missing property: ${prop}`);
		return null;
	};

	const grassFolder = gui.addFolder('Grass');
	safeAdd(grassFolder, island, 'grassClusterCount', 0, 1200, 1)?.name('clusters');
	safeAdd(grassFolder, island, 'grassIsolatedTufts', 0, 600, 1)?.name('isolated tufts');
	safeAdd(grassFolder, island, 'grassScaleMin', 0.1, 3, 0.01)?.name('scale min');
	safeAdd(grassFolder, island, 'grassScaleMax', 0.1, 4, 0.01)?.name('scale max');
	safeAdd(grassFolder, island, 'grassEdgeMargin', 0, 5, 0.01)?.name('edge margin');
	safeAdd(grassFolder, island, 'grassMinSpacing', 0.05, 1, 0.01)?.name('spacing');
	if (typeof island.generateGrass === 'function') {
		grassFolder.add({ regenerate: () => island.generateGrass(true) }, 'regenerate').name('regenerate grass');
	}

	function resizeRendererToDisplaySize(renderer) {
		const canvas = renderer.domElement;
		const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
		const width = Math.floor(canvas.clientWidth * pixelRatio);
		const height = Math.floor(canvas.clientHeight * pixelRatio);
		const needResize = canvas.width !== width || canvas.height !== height;

		if (needResize) {
			renderer.setSize(width, height, false);
		}

		return needResize;
	}

	function render() {
		stats.begin();

		if (resizeRendererToDisplaySize(renderer)) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		const delta = clock.getDelta();
		ambient.update(delta);

		dayNight.update(delta, camera);

		if (activeControls === 'orbit') {
			orbitControls.update();
		} else {
			spectatorControls.update(delta);
			island.clampPosition(camera.position);
		}

		renderer.render(scene, camera);

		stats.end();

		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

main();