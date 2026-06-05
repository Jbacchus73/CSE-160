import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import SpectatorControls from './SpectatorControls.js';
import Island from './island.js';
import DayNight from './daynight.js';
import Studio from './studio.js';
import AmbientAudio from './audio.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import SpeakerAudio from './SpeakerAudio.js';


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
	renderer.shadowMap.type = THREE.PCFShadowMap;

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

	const speakerAudio = new SpeakerAudio(ambient.listener, {
		tracks: [
			'audio/track1.wav',
			'audio/track2.wav',
			'audio/track3.wav',
			'audio/track4.wav',
			'audio/track5.wav',
			'audio/track6.wav',
		],
		volume: 0.85,
		refDistance: 2,
		maxDistance: 25,
		rolloffFactor: 1.6,
	});

	let activeControls = 'walk';
	let renderInfoTimer = 0;


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
		if (geometry.index) return Math.floor(geometry.index.count / 3);
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
				materialName = object.material.map((mat) => mat?.name || mat?.type || 'mat').join(', ');
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
		}
	}

	function worldToHouseLocal(position, house) {
		const dx = position.x - house.x;
		const dz = position.z - house.z;
		const c = Math.cos(house.rotationY);
		const s = Math.sin(house.rotationY);
		return { x: c * dx - s * dz, z: s * dx + c * dz };
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

		if (point.x >= rect.minX && point.x <= rect.maxX && point.z >= rect.minZ && point.z <= rect.maxZ) {
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
			{ minX: -halfW - t / 2, maxX: -halfW + t / 2, minZ: -halfD, maxZ: halfD },
			{ minX: halfW - t / 2, maxX: halfW + t / 2, minZ: -halfD, maxZ: halfD },
			{ minX: -halfW, maxX: halfW, minZ: -halfD - t / 2, maxZ: -halfD + t / 2 },
			{ minX: -halfW, maxX: doorLeft, minZ: halfD - t / 2, maxZ: halfD + t / 2 },
			{ minX: doorRight, maxX: halfW, minZ: halfD - t / 2, maxZ: halfD + t / 2 },
		];

		let changed = false;
		for (const rect of wallRects) {
			if (pushCircleOutOfRectLocal(local, rect, radius)) changed = true;
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
		grassCullMaxDistance: 40,
		grassCullExtraMargin: 1.05,
		grassForwardDotLimit: -1,
		grassSimplifyRatio: 0.95,
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

	// ---------------- Escape settings menu ----------------
	const menuOverlay = document.querySelector('#menuOverlay');
	const resumeBtn = document.querySelector('#resumeBtn');
	const cameraModeText = document.querySelector('#cameraModeText');
	const hudMode = document.querySelector('#hudMode');
	const switchButton = document.querySelector('#switchControls');

	let menuOpen = false;

	function updateCameraModeUI() {
		const text = activeControls === 'walk' ? 'Walk Camera' : 'Free Roam Camera';

		if (cameraModeText) cameraModeText.textContent = text;
		if (hudMode) hudMode.textContent = text;

		if (switchButton) {
			switchButton.textContent = activeControls === 'walk'
				? 'Switch to Free Roam'
				: 'Switch to Walk';
		}
	}

	function setCameraMode(mode) {
		if (mode === activeControls) return;

		if (mode === 'spectator') {
			activeControls = 'spectator';
			walkControls.disable();
			spectatorControls.enable();
		} else {
			activeControls = 'walk';
			spectatorControls.disable();

			if (!menuOpen) {
				walkControls.enable();
			}
		}

		updateCameraModeUI();
	}

	function toggleCameraMode() {
		setCameraMode(activeControls === 'walk' ? 'spectator' : 'walk');
	}

	function openMenu() {
		if (menuOpen) return;

		menuOpen = true;

		if (menuOverlay) {
			menuOverlay.classList.add('open');
		}

		if (activeControls === 'walk') {
			walkControls.disable();
		}
	}

	function closeMenu() {
		if (!menuOpen) return;

		menuOpen = false;

		if (menuOverlay) {
			menuOverlay.classList.remove('open');
		}

		if (activeControls === 'walk') {
			walkControls.enable();
		}
	}

	function toggleMenu() {
		if (menuOpen) {
			closeMenu();
		} else {
			openMenu();
		}
	}

	if (resumeBtn) {
		resumeBtn.addEventListener('click', closeMenu);
	}

	if (menuOverlay) {
		menuOverlay.addEventListener('click', (e) => {
			if (e.target === menuOverlay) {
				closeMenu();
			}
		});
	}

	if (switchButton) {
		switchButton.addEventListener('click', toggleCameraMode);
	}

	window.addEventListener('keydown', (e) => {
		if (e.code === 'Escape') {
			e.preventDefault();
			toggleMenu();
		}

		if (e.code === 'Tab') {
			e.preventDefault();

			if (!menuOpen) {
				toggleCameraMode();
			}
		}
	});

	renderer.domElement.addEventListener('click', () => {
		if (!menuOpen && activeControls === 'walk') {
			walkControls.enable();
		}
	});

updateCameraModeUI();

	function distanceToSegment2D(px, pz, ax, az, bx, bz) {
		const abx = bx - ax;
		const abz = bz - az;
		const apx = px - ax;
		const apz = pz - az;

		const abLenSq = abx * abx + abz * abz;
		if (abLenSq === 0) return Math.hypot(px - ax, pz - az);

		const t = THREE.MathUtils.clamp((apx * abx + apz * abz) / abLenSq, 0, 1);
		const cx = ax + abx * t;
		const cz = az + abz * t;

		return Math.hypot(px - cx, pz - cz);
	}

	function addDirtPathToStudio() {
		const pathMat = new THREE.MeshStandardMaterial({
			color: 0x6b4a2f,
			roughness: 1,
			metalness: 0,
		});

		const edgeMat = new THREE.MeshStandardMaterial({
			color: 0x3f2a1a,
			roughness: 1,
			metalness: 0,
		});

		const house = collisionObjects.house;

		const startLocal = {
			x: house.doorCenterX,
			z: house.depth / 2 + 0.60,
		};

		const start = houseLocalToWorld(startLocal, house);

		const end = {
			x: 0,
			z: 8,
		};

		window.pathBlockerSegment = {
			ax: start.x,
			az: start.z,
			bx: end.x,
			bz: end.z,
			radius: 1.15,
		};

		const dx = end.x - start.x;
		const dz = end.z - start.z;
		const length = Math.hypot(dx, dz);

		const pathWidth = 1.05;

		const path = new THREE.Mesh(
			new THREE.BoxGeometry(pathWidth, 0.022, length),
			pathMat
		);

		path.position.set(
			(start.x + end.x) / 2,
			island.surfaceY + 0.017,
			(start.z + end.z) / 2
		);

		path.rotation.y = Math.atan2(dx, dz);
		path.castShadow = false;
		path.receiveShadow = true;
		scene.add(path);

		const leftEdge = new THREE.Mesh(
			new THREE.BoxGeometry(0.07, 0.028, length),
			edgeMat
		);
		leftEdge.position.set(-pathWidth / 2 - 0.045, 0.012, 0);
		leftEdge.castShadow = false;
		leftEdge.receiveShadow = true;
		path.add(leftEdge);

		const rightEdge = leftEdge.clone();
		rightEdge.position.set(pathWidth / 2 + 0.045, 0.012, 0);
		path.add(rightEdge);

		for (let i = 0; i < 45; i++) {
			const pebble = new THREE.Mesh(
				new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.018, 0.04), 0),
				edgeMat
			);

			const side = Math.random() < 0.5 ? -1 : 1;

			pebble.position.set(
				side * THREE.MathUtils.randFloat(pathWidth * 0.5, pathWidth * 0.67),
				0.035,
				THREE.MathUtils.randFloat(-length / 2, length / 2)
			);

			pebble.rotation.set(
				Math.random() * Math.PI,
				Math.random() * Math.PI,
				Math.random() * Math.PI
			);

			pebble.scale.y = THREE.MathUtils.randFloat(0.35, 0.65);
			pebble.castShadow = true;
			pebble.receiveShadow = true;
			path.add(pebble);
		}

		if (typeof island.addGrassBlockerCircle === 'function') {
			const blockerCount = 16;

			for (let i = 0; i <= blockerCount; i++) {
				const t = i / blockerCount;
				const bx = start.x + dx * t;
				const bz = start.z + dz * t;

				island.addGrassBlockerCircle(bx, bz, 1.05);
			}

			island.addGrassBlockerCircle(start.x, start.z, 1.4);
			island.addGrassBlockerCircle(end.x, end.z, 1.25);
		}

		window.pathMesh = path;
	}

	function addLowPolyRocks() {
		const rockMat = new THREE.MeshStandardMaterial({
			color: 0x6a6258,
			roughness: 0.95,
			metalness: 0,
		});

		const darkRockMat = new THREE.MeshStandardMaterial({
			color: 0x4f4a44,
			roughness: 0.98,
			metalness: 0,
		});

		const rockPositions = [
			{ x: -10.5, z: 6.5, s: 0.65 },
			{ x: -12.4, z: -2.8, s: 0.5 },
			{ x: -7.2, z: -11.8, s: 0.75 },
			{ x: 1.8, z: 12.6, s: 0.45 },
			{ x: 9.8, z: 7.5, s: 0.7 },
			{ x: 12.3, z: -3.4, s: 0.55 },
			{ x: -3.7, z: 9.4, s: 0.5 },
			{ x: 7.8, z: -6.0, s: 0.42 },
		];

		for (const p of rockPositions) {
			if (window.pathBlockerSegment) {
				const d = distanceToSegment2D(
					p.x,
					p.z,
					window.pathBlockerSegment.ax,
					window.pathBlockerSegment.az,
					window.pathBlockerSegment.bx,
					window.pathBlockerSegment.bz
				);

				if (d < window.pathBlockerSegment.radius + p.s) {
					continue;
				}
			}

			const rockGroup = new THREE.Group();
			const rockCount = THREE.MathUtils.randInt(1, 3);

			for (let i = 0; i < rockCount; i++) {
				const rock = new THREE.Mesh(
					new THREE.DodecahedronGeometry(p.s * THREE.MathUtils.randFloat(0.45, 0.85), 0),
					Math.random() < 0.5 ? rockMat : darkRockMat
				);

				rock.position.set(
					THREE.MathUtils.randFloat(-0.25, 0.25),
					p.s * 0.22,
					THREE.MathUtils.randFloat(-0.25, 0.25)
				);

				rock.scale.set(
					THREE.MathUtils.randFloat(1.0, 1.45),
					THREE.MathUtils.randFloat(0.35, 0.7),
					THREE.MathUtils.randFloat(0.8, 1.25)
				);

				rock.rotation.set(
					Math.random() * Math.PI,
					Math.random() * Math.PI,
					Math.random() * Math.PI
				);

				rock.castShadow = true;
				rock.receiveShadow = true;
				rockGroup.add(rock);
			}

			rockGroup.position.set(p.x, island.surfaceY, p.z);
			scene.add(rockGroup);

			addCullable(rockGroup, {
				maxDistance: 55,
				extraMargin: 1.4,
				minRadius: 2,
			});

			if (typeof island.addGrassBlockerCircle === 'function') {
				island.addGrassBlockerCircle(p.x, p.z, p.s * 1.4);
			}
		}
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

	// poll until the studio speakers exist, then attach emitters
	function attachSpeakerAudio() {
		if (studio.speakers && studio.speakers.left && studio.speakers.right) {
			speakerAudio.attachToSpeaker(studio.speakers.left);
			speakerAudio.attachToSpeaker(studio.speakers.right);
			console.log('Speaker audio emitters attached');
		} else {
			setTimeout(attachSpeakerAudio, 200);
		}
	}
	attachSpeakerAudio();

	addCullable(studio.group, { maxDistance: 55, extraMargin: 1.35, minRadius: 8 });

	if (typeof island.addGrassBlockerCircle === 'function') {
		island.addGrassBlockerCircle(5, -10.5, 5.7);
	}

	addDirtPathToStudio();
	addLowPolyRocks();

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

	function bindSlider(sliderId, valueId, obj, prop, format = (v) => v.toFixed(2), onChange = null) {
		const slider = document.querySelector(sliderId);
		const valueEl = document.querySelector(valueId);
		if (!slider) return;

		slider.value = obj[prop];

		const updateValue = () => {
			const v = parseFloat(slider.value);
			obj[prop] = v;
			if (valueEl) valueEl.textContent = format(v);
			if (onChange) onChange(v);
		};

		updateValue();

		slider.addEventListener('input', updateValue);
	}

	function setAmbientVolume(v) {
		ambient.volume = v;
		ambient.baseVolume = v;

		if (ambient.sound && typeof ambient.sound.setVolume === 'function') {
			ambient.sound.setVolume(v);
		}
	}

	function setMusicVolume(v) {
		if (typeof speakerAudio.setVolume === 'function') {
			speakerAudio.setVolume(v);
			return;
		}

		speakerAudio.volume = v;

		if (speakerAudio.sound && typeof speakerAudio.sound.setVolume === 'function') {
			speakerAudio.sound.setVolume(v);
		}

		if (speakerAudio.leftSound && typeof speakerAudio.leftSound.setVolume === 'function') {
			speakerAudio.leftSound.setVolume(v);
		}

		if (speakerAudio.rightSound && typeof speakerAudio.rightSound.setVolume === 'function') {
			speakerAudio.rightSound.setVolume(v);
		}
	}

	bindSlider(
		'#speedSlider',
		'#speedVal',
		dayNight,
		'speed',
		(v) => v.toFixed(3)
	);

	const ambientVolumeState = { volume: 0.5 };

	bindSlider(
		'#ambientVolumeSlider',
		'#ambientVolumeVal',
		ambientVolumeState,
		'volume',
		(v) => `${Math.round(v * 100)}%`,
		setAmbientVolume
	);

	bindSlider(
		'#musicVolumeSlider',
		'#musicVolumeVal',
		{ volume: 0.85 },
		'volume',
		(v) => `${Math.round(v * 100)}%`,
		setMusicVolume
	);

	document.querySelector('#musicPlay')?.addEventListener('click', () => {
	speakerAudio.isPlaying ? speakerAudio.pause() : speakerAudio.play();
	});
	document.querySelector('#musicNext')?.addEventListener('click', () => speakerAudio.next());
	document.querySelector('#musicPrev')?.addEventListener('click', () => speakerAudio.prev());

	const audioToggle = document.querySelector('#audioToggle');
	let audioOn = false;

	if (audioToggle) {
		audioToggle.addEventListener('click', () => {
			if (!audioOn) {
				ambient.play();
				audioToggle.textContent = 'Stop Ambient';
				audioOn = true;
			} else {
				ambient.pause();
				audioToggle.textContent = 'Start Ambient';
				audioOn = false;
			}
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
		treeCount = 10,
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

					addCullable(tree, { maxDistance: 60, extraMargin: 1.35, minRadius: 4 });

					if (typeof island.addGrassBlockerCircle === 'function') {
						island.addGrassBlockerCircle(x, z, blockerRadius);
					}

					collisionObjects.treeCircles.push({ x, z, radius: 0.75 * scale });

					treePositions.push({ x, z });
					placed++;
				}

				console.log('Trees placed:', placed);
				resolve(treePositions);
			});
		});
	}

	Promise.allSettled([
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
	});

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