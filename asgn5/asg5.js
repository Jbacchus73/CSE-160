import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import SpectatorControls from './SpectatorControls.js';
import Island from './island.js';
import DayNight from './daynight.js';
import Studio from './studio.js';
import AmbientAudio from './audio.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class WalkControls {
	constructor(camera, domElement, island, {
		eyeHeight = 1.7,
		moveSpeed = 5,
		playerRadius = 0.35,
		collisionHandler = null,
	} = {}) {
		this.camera = camera;
		this.island = island;
		this.eyeHeight = eyeHeight;
		this.moveSpeed = moveSpeed;
		this.playerRadius = playerRadius;
		this.collisionHandler = collisionHandler;
		this.enabled = false;

		this.controls = new PointerLockControls(camera, domElement);
		this.keys = { forward: false, back: false, left: false, right: false };

		this._onKeyDown = (e) => this._setKey(e.code, true);
		this._onKeyUp = (e) => this._setKey(e.code, false);

		this.controls.addEventListener('unlock', () => {
			this.enabled = false;
			document.removeEventListener('keydown', this._onKeyDown);
			document.removeEventListener('keyup', this._onKeyUp);
		});
	}

	_setKey(code, value) {
		if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = value;
		if (code === 'KeyS' || code === 'ArrowDown') this.keys.back = value;
		if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = value;
		if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = value;
	}

	enable() {
		if (this.enabled) return;

		this.enabled = true;
		this.controls.lock();

		document.addEventListener('keydown', this._onKeyDown);
		document.addEventListener('keyup', this._onKeyUp);

		if (this.island && typeof this.island.surfaceY === 'number') {
			this.camera.position.y = this.island.surfaceY + this.eyeHeight;
		} else {
			this.camera.position.y = this.eyeHeight;
		}
	}

	disable() {
		this.enabled = false;
		this.controls.unlock();

		document.removeEventListener('keydown', this._onKeyDown);
		document.removeEventListener('keyup', this._onKeyUp);
	}

	update(delta) {
		if (!this.enabled) return;

		const inputX = Number(this.keys.right) - Number(this.keys.left);
		const inputZ = Number(this.keys.forward) - Number(this.keys.back);
		const inputLength = Math.hypot(inputX, inputZ);

		if (inputLength > 0) {
			const dist = this.moveSpeed * delta;
			this.controls.moveRight((inputX / inputLength) * dist);
			this.controls.moveForward((inputZ / inputLength) * dist);
		}

		if (this.island && typeof this.island.clampPosition === 'function') {
			this.island.clampPosition(this.camera.position);
		}

		if (typeof this.collisionHandler === 'function') {
			this.collisionHandler(this.camera.position, this.playerRadius);
		}

		if (this.island && typeof this.island.clampPosition === 'function') {
			this.island.clampPosition(this.camera.position);
		}

		if (this.island && typeof this.island.surfaceY === 'number') {
			this.camera.position.y = this.island.surfaceY + this.eyeHeight;
		} else {
			this.camera.position.y = this.eyeHeight;
		}
	}
}

function main() {
	const canvas = document.querySelector('#c');

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		canvas,
	});

	renderer.setPixelRatio(1);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.2;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap

	const stats = new Stats();
	stats.showPanel(0);
	document.body.appendChild(stats.dom);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);

	const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 200);
	camera.position.set(0, 1.7, 8);

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

	let activeControls = 'walk';
	let renderInfoTimer = 0;

	const switchButton = document.querySelector('#switchControls');

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

	const collisionObjects = {
		treeCircles: [],
		house: {
			x: 5,
			z: -10.5,
			width: 7.2,
			depth: 5.8,
			rotationY: -0.12,
			wallThickness: 0.42,
			doorCenterX: 7.2 * 0.19,
			doorwayWidth: 7.2 * 0.16,
		},
	};

	const cullables = [];
	const cullingFrustum = new THREE.Frustum();
	const cullingMatrix = new THREE.Matrix4();
	const cullingSphere = new THREE.Sphere();

	function getGeometryTriangleCount(geometry) {
		if (!geometry) return 0;

		if (geometry.index) {
			return Math.floor(geometry.index.count / 3);
		}

		if (geometry.attributes && geometry.attributes.position) {
			return Math.floor(geometry.attributes.position.count / 3);
		}

		return 0;
	}

	function logTriangleCounts(scene) {
		const rows = [];

		scene.traverse((object) => {
			if (!object.isMesh && !object.isInstancedMesh) return;
			if (!object.geometry) return;

			const baseTriangles = getGeometryTriangleCount(object.geometry);
			const instances = object.isInstancedMesh ? object.count : 1;
			const triangles = baseTriangles * instances;

			let materialName = 'none';

			if (Array.isArray(object.material)) {
				materialName = object.material
					.map((mat) => mat?.name || mat?.type || 'mat')
					.join(', ');
			} else if (object.material) {
				materialName = object.material.name || object.material.type || 'material';
			}

			rows.push({
				name: object.name || object.parent?.name || object.type,
				type: object.type,
				triangles,
				baseTriangles,
				instances,
				visible: object.visible,
				material: materialName,
			});
		});

		rows.sort((a, b) => b.triangles - a.triangles);

		console.log('--- TOP TRIANGLE SOURCES ---');
		console.table(rows.slice(0, 25));

		const total = rows.reduce((sum, row) => sum + row.triangles, 0);
		console.log('Total counted scene triangles:', total);
	}

	window.logTriangleCounts = () => logTriangleCounts(scene);

	function addCullable(object, {
		maxDistance = 60,
		extraMargin = 1.2,
		minRadius = 2,
	} = {}) {
		const box = new THREE.Box3().setFromObject(object);
		const sphere = box.getBoundingSphere(new THREE.Sphere());

		cullables.push({
			object,
			center: sphere.center.clone(),
			radius: Math.max(sphere.radius * extraMargin, minRadius),
			maxDistance,
		});
	}

	function updateCulling(camera) {
		camera.updateMatrixWorld();
		cullingMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		cullingFrustum.setFromProjectionMatrix(cullingMatrix);

		let visibleCount = 0;

		for (const item of cullables) {
			if (!item.object) continue;

			const distanceSq = camera.position.distanceToSquared(item.center);
			const maxDistanceSq = item.maxDistance * item.maxDistance;

			if (distanceSq > maxDistanceSq) {
				item.object.visible = false;
				continue;
			}

			cullingSphere.center.copy(item.center);
			cullingSphere.radius = item.radius;

			item.object.visible = cullingFrustum.intersectsSphere(cullingSphere);

			if (item.object.visible) visibleCount++;
		}

		const DEBUG_CULLING = false;

		if (DEBUG_CULLING) {
			let grassText = '';

			if (island && typeof island.getGrassCullingStats === 'function') {
				const grassStats = island.getGrassCullingStats();
				grassText = ` | grass chunks: ${grassStats.visible} / ${grassStats.total}`;
			}

			console.log(`visible cullables: ${visibleCount} / ${cullables.length}${grassText}`);
		}
	}

	function worldToHouseLocal(position, house) {
		const dx = position.x - house.x;
		const dz = position.z - house.z;
		const c = Math.cos(house.rotationY);
		const s = Math.sin(house.rotationY);

		return {
			x: c * dx - s * dz,
			z: s * dx + c * dz,
		};
	}

	function houseLocalToWorld(local, house) {
		const c = Math.cos(house.rotationY);
		const s = Math.sin(house.rotationY);

		return {
			x: house.x + c * local.x + s * local.z,
			z: house.z - s * local.x + c * local.z,
		};
	}

	function pushCircleOutOfRectLocal(point, rect, radius) {
		const closestX = THREE.MathUtils.clamp(point.x, rect.minX, rect.maxX);
		const closestZ = THREE.MathUtils.clamp(point.z, rect.minZ, rect.maxZ);

		let dx = point.x - closestX;
		let dz = point.z - closestZ;
		const distSq = dx * dx + dz * dz;

		if (distSq > 0 && distSq < radius * radius) {
			const dist = Math.sqrt(distSq);
			const push = radius - dist;
			point.x += (dx / dist) * push;
			point.z += (dz / dist) * push;
			return true;
		}

		if (
			point.x >= rect.minX &&
			point.x <= rect.maxX &&
			point.z >= rect.minZ &&
			point.z <= rect.maxZ
		) {
			const left = Math.abs(point.x - rect.minX);
			const right = Math.abs(rect.maxX - point.x);
			const bottom = Math.abs(point.z - rect.minZ);
			const top = Math.abs(rect.maxZ - point.z);
			const min = Math.min(left, right, bottom, top);

			if (min === left) point.x = rect.minX - radius;
			else if (min === right) point.x = rect.maxX + radius;
			else if (min === bottom) point.z = rect.minZ - radius;
			else point.z = rect.maxZ + radius;

			return true;
		}

		return false;
	}

	function collideWithTrees(position, radius) {
		for (const tree of collisionObjects.treeCircles) {
			const dx = position.x - tree.x;
			const dz = position.z - tree.z;
			const minDist = radius + tree.radius;
			const distSq = dx * dx + dz * dz;

			if (distSq > 0 && distSq < minDist * minDist) {
				const dist = Math.sqrt(distSq);
				const push = minDist - dist;
				position.x += (dx / dist) * push;
				position.z += (dz / dist) * push;
			}
		}
	}

	function collideWithHouse(position, radius) {
		const house = collisionObjects.house;
		const local = worldToHouseLocal(position, house);

		const halfW = house.width / 2;
		const halfD = house.depth / 2;
		const t = house.wallThickness;

		const doorLeft = house.doorCenterX - house.doorwayWidth / 2;
		const doorRight = house.doorCenterX + house.doorwayWidth / 2;

		const wallRects = [
			{
				minX: -halfW - t / 2,
				maxX: -halfW + t / 2,
				minZ: -halfD,
				maxZ: halfD,
			},
			{
				minX: halfW - t / 2,
				maxX: halfW + t / 2,
				minZ: -halfD,
				maxZ: halfD,
			},
			{
				minX: -halfW,
				maxX: halfW,
				minZ: -halfD - t / 2,
				maxZ: -halfD + t / 2,
			},
			{
				minX: -halfW,
				maxX: doorLeft,
				minZ: halfD - t / 2,
				maxZ: halfD + t / 2,
			},
			{
				minX: doorRight,
				maxX: halfW,
				minZ: halfD - t / 2,
				maxZ: halfD + t / 2,
			},
		];

		let changed = false;

		for (const rect of wallRects) {
			if (pushCircleOutOfRectLocal(local, rect, radius)) {
				changed = true;
			}
		}

		if (changed) {
			const world = houseLocalToWorld(local, house);
			position.x = world.x;
			position.z = world.z;
		}
	}

	function applyWorldCollisions(position, radius) {
		for (let i = 0; i < 3; i++) {
			collideWithTrees(position, radius);
			collideWithHouse(position, radius);
		}
	}

	const island = new Island(scene, textureLoader, {
		radius: 16,
		groundColor: 0x3d6b27,
		grassObjPath: 'obj/high_grass.obj',

		grassClusterCount: 1920,
		grassTuftsPerClusterMin: 2,
		grassTuftsPerClusterMax: 4,
		grassClusterRadiusMin: 0.18,
		grassClusterRadiusMax: 1.25,
		grassIsolatedTufts: 1060,

		grassEdgeMargin: 0.15,
		grassClearCenterRadius: 0,

		grassScaleMin: 0.7,
		grassScaleMax: 1.8,
		grassSink: 0.02,
		grassLeanAmount: 0.55,
		grassMinSpacing: 0.12,

		grassCastShadow: true,
		grassReceiveShadow: true,

		grassChunkSize: 4.5,
		grassCullMaxDistance: 20,
		grassCullExtraMargin: 1.05,
		grassForwardDotLimit: 0.35,
		grassSimplifyRatio: 0.93,
		grassCullingDebug: false,

		autoGenerateGrass: false,
	});

	camera.position.set(0, island.surfaceY + 1.7, 8);

	const walkControls = new WalkControls(camera, renderer.domElement, island, {
		eyeHeight: 1.7,
		moveSpeed: 5,
		playerRadius: 0.35,
		collisionHandler: applyWorldCollisions,
	});

	renderer.domElement.addEventListener('click', () => {
		if (activeControls === 'walk') {
			walkControls.enable();
		}
	});

	if (switchButton) {
		switchButton.textContent = 'Switch to Free Roam Controls';

		switchButton.addEventListener('click', () => {
			if (activeControls === 'walk') {
				activeControls = 'spectator';
				walkControls.disable();
				spectatorControls.enable();
				switchButton.textContent = 'Switch to Walk Controls';
			} else {
				activeControls = 'walk';
				spectatorControls.disable();
				walkControls.enable();
				switchButton.textContent = 'Switch to Free Roam Controls';
			}
		});
	}

	const studio = new Studio(scene, {
		x: collisionObjects.house.x,
		y: island.surfaceY,
		z: collisionObjects.house.z,
		width: collisionObjects.house.width,
		depth: collisionObjects.house.depth,
		height: 2.6,
		rotationY: collisionObjects.house.rotationY,
	});

	addCullable(studio.group, {
		maxDistance: 55,
		extraMargin: 1.35,
		minRadius: 8,
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

		enableShadows: true,
		shadowSize: 2056,
		shadowCameraSize: 18,
		shadowFollowCamera: true,

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

					addCullable(root, {
						maxDistance: 45,
						extraMargin: 1.25,
						minRadius: 4,
					});

					if (typeof island.addGrassBlockerCircle === 'function') {
						island.addGrassBlockerCircle(-2, 0, 3.5);
					}

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

					tree.matrixAutoUpdate = false;
					tree.updateMatrix();
					tree.updateMatrixWorld(true);

					addCullable(tree, {
						maxDistance: 60,
						extraMargin: 1.35,
						minRadius: 4,
					});

					if (typeof island.addGrassBlockerCircle === 'function') {
						island.addGrassBlockerCircle(x, z, blockerRadius);
					}

					collisionObjects.treeCircles.push({
						x,
						z,
						radius: 0.75 * scale,
					});

					treePositions.push({ x, z });
					placed++;
				}

				console.log('Trees placed:', placed);
				resolve(treePositions);
			});
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
			scaleMin: 0.85,
			scaleMax: 1.2,
			blockerRadius: 1.45,
			minTreeSpacing: 4.5,
		}),
	]).then(() => {
		if (typeof island.generateGrass === 'function') {
			island.generateGrass(true);
		}

		setTimeout(() => {
			logTriangleCounts(scene);
		}, 4500);
	});

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

		renderInfoTimer += delta;

		ambient.update(delta);
		dayNight.update(delta, camera);

		const isNight = dayNight.getCycleTime() > 0.45 && dayNight.getCycleTime() < 0.88;
		studio.setPorchLights(isNight);

		if (activeControls === 'spectator') {
			spectatorControls.update(delta);
			island.clampPosition(camera.position);
		} else if (activeControls === 'walk') {
			walkControls.update(delta);
		}

		if (typeof island.updateGrassCulling === 'function') {
			island.updateGrassCulling(camera);
		}

		updateCulling(camera);

		renderer.render(scene, camera);

		if (renderInfoTimer > 1) {
			console.log(
				'calls:', renderer.info.render.calls,
				'triangles:', renderer.info.render.triangles,
				'geometries:', renderer.info.memory.geometries,
				'textures:', renderer.info.memory.textures
			);

			renderInfoTimer = 0;
		}

		stats.end();

		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

main();