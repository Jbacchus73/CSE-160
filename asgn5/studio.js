import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Studio {
	constructor(scene, {
		x = 0,
		y = 0,
		z = -10,

		width = 7.2,
		depth = 5.8,
		height = 2.6,

		rotationY = 0,

		wallTexturePath = 'obj/textures/woodPlanks/',
		roofTexturePath = 'obj/textures/WoodRoof/',

		wallTilesPerUnit = 0.42,
		roofTilesPerUnit = 0.55,
	} = {}) {
		this.group = new THREE.Group();
		this.textureLoader = new THREE.TextureLoader();

		this.wallTilesPerUnit = wallTilesPerUnit;
		this.roofTilesPerUnit = roofTilesPerUnit;

		this._mergeBatches = [];

		const wallMaterial = this.createWallMaterial(wallTexturePath);
		const roofMaterial = this.createRoofMaterial(roofTexturePath);

		const roofUnderMaterial = new THREE.MeshStandardMaterial({
			color: 0x4b392a,
			roughness: 0.96,
			metalness: 0,
			side: THREE.BackSide,
		});

		const trimMaterial = new THREE.MeshStandardMaterial({
			color: 0x5b4731,
			roughness: 0.95,
			metalness: 0,
		});

		const frameMaterial = new THREE.MeshStandardMaterial({
			color: 0x3e2a1c,
			roughness: 0.95,
			metalness: 0,
		});

		const floorMaterial = new THREE.MeshStandardMaterial({
			color: 0x4a3726,
			roughness: 0.98,
			metalness: 0,
		});

		const interiorCeilingMaterial = new THREE.MeshStandardMaterial({
			color: 0x5a4635,
			roughness: 0.95,
			metalness: 0,
		});

		const deskMaterial = new THREE.MeshStandardMaterial({
			color: 0x6b4f33,
			roughness: 0.85,
			metalness: 0,
		});

		const wallThickness = 0.18;

		const doorwayWidth = width * 0.16;
		const doorwayHeight = height * 0.78;
		const doorCenterX = width * 0.19;

		const windowWidth = width * 0.17;
		const windowHeight = height * 0.24;
		const windowCenterX = -width * 0.23;
		const windowCenterY = height * 0.57;

		this.queueBox(width, 0.14, depth, floorMaterial, {
			position: new THREE.Vector3(0, 0.07, 0),
		});

		this.queueWallBox(width, height, wallThickness, wallMaterial, {
			position: new THREE.Vector3(0, height / 2, -depth / 2),
		});

		this.queueWallBox(wallThickness, height, depth, wallMaterial, {
			position: new THREE.Vector3(-width / 2, height / 2, 0),
		});

		this.queueWallBox(wallThickness, height, depth, wallMaterial, {
			position: new THREE.Vector3(width / 2, height / 2, 0),
		});

		this.addFrontWallWithOpenings({
			width,
			height,
			depth,
			wallThickness,
			wallMaterial,
			doorCenterX,
			doorwayWidth,
			doorwayHeight,
			windowCenterX,
			windowCenterY,
			windowWidth,
			windowHeight,
		});

		this.queueBox(0.16, doorwayHeight, 0.26, frameMaterial, {
			position: new THREE.Vector3(doorCenterX - doorwayWidth / 2, doorwayHeight / 2, depth / 2 + 0.05),
		});

		this.queueBox(0.16, doorwayHeight, 0.26, frameMaterial, {
			position: new THREE.Vector3(doorCenterX + doorwayWidth / 2, doorwayHeight / 2, depth / 2 + 0.05),
		});

		this.queueBox(doorwayWidth + 0.14, 0.16, 0.26, frameMaterial, {
			position: new THREE.Vector3(doorCenterX, doorwayHeight, depth / 2 + 0.05),
		});

		this.queueBox(doorwayWidth + 0.75, 0.12, 0.58, trimMaterial, {
			position: new THREE.Vector3(doorCenterX, 0.06, depth / 2 + 0.42),
		});

		this.addPorchLights({
			doorCenterX,
			doorwayWidth,
			doorwayHeight,
			depth,
		});

		this.addOpenWindow({
			x: windowCenterX,
			y: windowCenterY,
			z: depth / 2,
			w: windowWidth,
			h: windowHeight,
			wallThickness,
			frameMaterial,
			trimMaterial,
		});

		this.addCornerTrim(width, depth, height, trimMaterial);
		this.addRoofEdgeTrim(width, depth, height, trimMaterial);

		this.queueBox(width - 0.1, 0.08, depth - 0.1, interiorCeilingMaterial, {
			position: new THREE.Vector3(0, height - 0.04, 0),
		});

		const roof = this.createHipRoofAssembly(width, depth, 1.8, 0.6, roofMaterial, roofUnderMaterial);
		roof.position.y = height + 0.04;
		this.group.add(roof);

		const chimney = this.createBox(0.34, 0.95, 0.34, trimMaterial);
		chimney.position.set(0.05, height + 1.0, -depth * 0.08);
		this.group.add(chimney);

		this.addDesk(width, depth, height, {
			deskMaterial,
		});

		this.flushMergedMeshes();

		this.addSpeakers();

		this.group.position.set(x, y, z);
		this.group.rotation.y = rotationY;

		scene.add(this.group);
	}

	_findBatch(material) {
		let batch = this._mergeBatches.find((entry) => entry.material === material);

		if (!batch) {
			batch = {
				material,
				geometries: [],
			};
			this._mergeBatches.push(batch);
		}

		return batch;
	}

	queueGeometry(geometry, material, {
		position = new THREE.Vector3(),
		rotation = new THREE.Euler(),
		scale = new THREE.Vector3(1, 1, 1),
	} = {}) {
		const matrix = new THREE.Matrix4();
		const quaternion = new THREE.Quaternion().setFromEuler(rotation);
		matrix.compose(position, quaternion, scale);

		geometry.applyMatrix4(matrix);

		this._findBatch(material).geometries.push(geometry);
	}

	queueBox(width, height, depth, material, {
		position = new THREE.Vector3(),
		rotation = new THREE.Euler(),
		scale = new THREE.Vector3(1, 1, 1),
	} = {}) {
		const geometry = new THREE.BoxGeometry(width, height, depth);

		if (geometry.attributes.uv) {
			geometry.setAttribute(
				'uv2',
				new THREE.BufferAttribute(new Float32Array(geometry.attributes.uv.array), 2)
			);
		}

		this.queueGeometry(geometry, material, {
			position,
			rotation,
			scale,
		});
	}

	queueWallBox(width, height, depth, material, {
		position = new THREE.Vector3(),
		rotation = new THREE.Euler(),
		scale = new THREE.Vector3(1, 1, 1),
		uOffset = 0,
		vOffset = 0,
	} = {}) {
		const geometry = this.createWallBoxGeometry(width, height, depth, {
			uOffset,
			vOffset,
		});

		this.queueGeometry(geometry, material, {
			position,
			rotation,
			scale,
		});
	}

	flushMergedMeshes() {
		for (const batch of this._mergeBatches) {
			if (batch.geometries.length === 0) continue;

			let geometry;

			if (batch.geometries.length === 1) {
				geometry = batch.geometries[0];
			} else {
				geometry = mergeGeometries(batch.geometries, false);
				for (const source of batch.geometries) {
					source.dispose();
				}
			}

			if (!geometry) continue;

			geometry.computeBoundingSphere();
			geometry.computeBoundingBox();

			const mesh = new THREE.Mesh(geometry, batch.material);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();

			this.group.add(mesh);
		}

		this._mergeBatches.length = 0;
	}

	addDesk(width, depth, height, {
		deskWidth = width * 0.62,
		deskDepth = 0.9,
		deskHeight = 0.95,
		topThickness = 0.08,
		legThickness = 0.1,
		backInset = 0.35,
		deskMaterial = new THREE.MeshStandardMaterial({
			color: 0x6b4f33,
			roughness: 0.85,
			metalness: 0,
		}),
	} = {}) {
		const zCenter = -depth / 2 + backInset + deskDepth / 2;

		this.queueBox(deskWidth, topThickness, deskDepth, deskMaterial, {
			position: new THREE.Vector3(0, deskHeight, zCenter),
		});

		const legH = deskHeight - topThickness;
		const halfW = deskWidth / 2 - legThickness;
		const halfD = deskDepth / 2 - legThickness;

		const legPositions = [
			[-halfW, -halfD],
			[halfW, -halfD],
			[-halfW, halfD],
			[halfW, halfD],
		];

		for (const [lx, lz] of legPositions) {
			this.queueBox(legThickness, legH, legThickness, deskMaterial, {
				position: new THREE.Vector3(lx, legH / 2, zCenter + lz),
			});
		}

		this.deskSurface = {
			y: deskHeight + topThickness / 2,
			z: zCenter,
			width: deskWidth,
			depth: deskDepth,
			center: new THREE.Vector3(0, deskHeight + topThickness / 2, zCenter),
		};

		return this.deskSurface;
	}

	placeOnDesk(object, offsetX = 0, offsetZ = 0, yNudge = 0) {
		if (!this.deskSurface) return;

		object.position.set(
			this.deskSurface.center.x + offsetX,
			this.deskSurface.y + yNudge,
			this.deskSurface.center.z + offsetZ
		);

		this.group.add(object);
	}

	addSpeakers({
		objPath = 'obj/speaker.obj',
		texturePath = 'obj/textures/',
		scale = 2.0,
		offsetX = 1.7,
		offsetZ = -0.1,
	} = {}) {
		const loader = new THREE.TextureLoader();

		const baseColor = loader.load(`${texturePath}Multimedia Speaker_speaker_base_BaseColor.png`);
		const metallic = loader.load(`${texturePath}Multimedia Speaker_speaker_base_Metallic.png`);
		const normal = loader.load(`${texturePath}Multimedia Speaker_speaker_base_Normal.png`);
		const roughness = loader.load(`${texturePath}Multimedia Speaker_speaker_base_Roughness.png`);

		baseColor.colorSpace = THREE.SRGBColorSpace;
		baseColor.flipY = true;
		metallic.flipY = true;
		normal.flipY = true;
		roughness.flipY = true;

		const speakerMaterial = new THREE.MeshStandardMaterial({
			map: baseColor,
			metalnessMap: metallic,
			normalMap: normal,
			roughnessMap: roughness,
			metalness: 0.6,
			roughness: 0.75,
			normalScale: new THREE.Vector2(1.5, 1.5),
		});

		const objLoader = new OBJLoader();

		objLoader.load(
			objPath,
			(root) => {
				root.traverse((child) => {
					if (child.isMesh) {
						child.material = speakerMaterial;
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				const box = new THREE.Box3().setFromObject(root);
				const center = box.getCenter(new THREE.Vector3());

				root.position.x -= center.x;
				root.position.z -= center.z;
				root.position.y -= box.min.y;

				const left = root.clone(true);
				left.scale.set(scale, scale, scale);
				this.placeOnDesk(left, -offsetX, offsetZ);

				const right = root.clone(true);
				right.scale.set(scale, scale, scale);
				this.placeOnDesk(right, offsetX, offsetZ);

				this.speakers = { left, right };
			},
			undefined,
			(err) => console.error('Failed to load speaker:', err)
		);
	}

	_makeGlowSprite(color) {
		if (!this._glowTexture) {
			const size = 128;
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = size;

			const ctx = canvas.getContext('2d');
			const g = ctx.createRadialGradient(
				size / 2,
				size / 2,
				0,
				size / 2,
				size / 2,
				size / 2
			);

			g.addColorStop(0.0, 'rgba(255,255,255,1)');
			g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
			g.addColorStop(1.0, 'rgba(255,255,255,0)');

			ctx.fillStyle = g;
			ctx.fillRect(0, 0, size, size);

			this._glowTexture = new THREE.CanvasTexture(canvas);
		}

		return new THREE.Sprite(new THREE.SpriteMaterial({
			map: this._glowTexture,
			color,
			transparent: true,
			opacity: 0.35,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		}));
	}

	addPorchLights({
		doorCenterX = 0,
		doorwayWidth = 1,
		doorwayHeight = 2,
		depth = 5.8,
		spread = 0.55,
		mountHeight = null,
		bulbColor = 0xffd28a,
		lightIntensity = 1.6,
		lightDistance = 6,
	} = {}) {
		const z = depth / 2 + 0.12;
		const y = mountHeight !== null ? mountHeight : doorwayHeight * 0.8;

		const leftX = doorCenterX - doorwayWidth / 2 - spread;
		const rightX = doorCenterX + doorwayWidth / 2 + spread;

		this.porchLights = [];

		const housingMat = new THREE.MeshStandardMaterial({
			color: 0x2a2018,
			roughness: 0.8,
			metalness: 0.3,
		});

		const bulbMat = new THREE.MeshStandardMaterial({
			color: bulbColor,
			emissive: bulbColor,
			emissiveIntensity: 1.4,
			roughness: 0.4,
			metalness: 0,
		});

		const makeLantern = (x) => {
			const lantern = new THREE.Group();

			const plate = this.createBox(0.16, 0.22, 0.05, housingMat);
			plate.position.set(0, 0.02, -0.06);
			plate.castShadow = false;
			plate.receiveShadow = false;
			lantern.add(plate);

			const arm = this.createBox(0.05, 0.05, 0.16, housingMat);
			arm.position.set(0, 0.1, 0.04);
			arm.castShadow = false;
			arm.receiveShadow = false;
			lantern.add(arm);

			const cap = this.createBox(0.18, 0.05, 0.18, housingMat);
			cap.position.set(0, 0.04, 0.14);
			cap.castShadow = false;
			cap.receiveShadow = false;
			lantern.add(cap);

			const postH = 0.18;
			const postT = 0.025;
			const cageHalf = 0.07;

			const postPositions = [
				[-cageHalf, 0.14 - cageHalf],
				[cageHalf, 0.14 - cageHalf],
				[-cageHalf, 0.14 + cageHalf],
				[cageHalf, 0.14 + cageHalf],
			];

			for (const [px, pz] of postPositions) {
				const post = this.createBox(postT, postH, postT, housingMat);
				post.position.set(px, -0.08, pz);
				post.castShadow = false;
				post.receiveShadow = false;
				lantern.add(post);
			}

			const bottom = this.createBox(0.16, 0.04, 0.16, housingMat);
			bottom.position.set(0, -0.19, 0.14);
			bottom.castShadow = false;
			bottom.receiveShadow = false;
			lantern.add(bottom);

			const bulb = new THREE.Mesh(
				new THREE.SphereGeometry(0.06, 14, 14),
				bulbMat
			);
			bulb.position.set(0, -0.08, 0.14);
			bulb.castShadow = false;
			bulb.receiveShadow = false;
			lantern.add(bulb);

			const glow = this._makeGlowSprite(bulbColor);
			glow.scale.set(0.45, 0.45, 1);
			glow.position.set(0, -0.08, 0.14);
			lantern.add(glow);

			const light = new THREE.PointLight(bulbColor, lightIntensity, lightDistance, 2);
			light.position.set(0, -0.08, 0.2);
			light.castShadow = false;
			lantern.add(light);

			lantern.position.set(x, y, z);
			this.group.add(lantern);

			this.porchLights.push({ group: lantern, light, bulb, glow });

			return lantern;
		};

		makeLantern(leftX);
		makeLantern(rightX);
	}

	setPorchLights(on) {
		if (!this.porchLights) return;

		for (const { light, bulb, glow } of this.porchLights) {
			light.visible = on;
			bulb.material.emissiveIntensity = on ? 1.4 : 0;
			if (glow) glow.visible = on;
		}
	}

	addFrontWallWithOpenings({
		width,
		height,
		depth,
		wallThickness,
		wallMaterial,
		doorCenterX,
		doorwayWidth,
		doorwayHeight,
		windowCenterX,
		windowCenterY,
		windowWidth,
		windowHeight,
	}) {
		const z = depth / 2;

		const doorLeft = doorCenterX - doorwayWidth / 2;
		const doorRight = doorCenterX + doorwayWidth / 2;

		const windowLeft = windowCenterX - windowWidth / 2;
		const windowRight = windowCenterX + windowWidth / 2;
		const windowBottom = windowCenterY - windowHeight / 2;
		const windowTop = windowCenterY + windowHeight / 2;

		const addPiece = (xMin, xMax, yMin, yMax) => {
			const pieceWidth = xMax - xMin;
			const pieceHeight = yMax - yMin;

			if (pieceWidth <= 0.001 || pieceHeight <= 0.001) return;

			this.queueWallBox(pieceWidth, pieceHeight, wallThickness, wallMaterial, {
				position: new THREE.Vector3((xMin + xMax) / 2, (yMin + yMax) / 2, z),
				uOffset: (xMin + width / 2) * this.wallTilesPerUnit,
				vOffset: yMin * this.wallTilesPerUnit,
			});
		};

		addPiece(-width / 2, windowLeft, 0, height);
		addPiece(windowRight, doorLeft, 0, height);
		addPiece(doorRight, width / 2, 0, height);

		addPiece(windowLeft, windowRight, 0, windowBottom);
		addPiece(windowLeft, windowRight, windowTop, height);

		addPiece(doorLeft, doorRight, doorwayHeight, height);
	}

	addOpenWindow({
		x,
		y,
		z,
		w,
		h,
		wallThickness,
		frameMaterial,
		trimMaterial,
	}) {
		const outerFrameDepth = 0.10;
		const innerFrameDepth = 0.08;

		this.queueBox(0.08, h + 0.12, outerFrameDepth, frameMaterial, {
			position: new THREE.Vector3(x - w / 2, y, z + 0.03),
		});

		this.queueBox(0.08, h + 0.12, outerFrameDepth, frameMaterial, {
			position: new THREE.Vector3(x + w / 2, y, z + 0.03),
		});

		this.queueBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial, {
			position: new THREE.Vector3(x, y + h / 2, z + 0.03),
		});

		this.queueBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial, {
			position: new THREE.Vector3(x, y - h / 2, z + 0.03),
		});

		this.queueBox(0.05, h, innerFrameDepth, trimMaterial, {
			position: new THREE.Vector3(x - w / 2 + 0.02, y, z - wallThickness / 2 + 0.04),
		});

		this.queueBox(0.05, h, innerFrameDepth, trimMaterial, {
			position: new THREE.Vector3(x + w / 2 - 0.02, y, z - wallThickness / 2 + 0.04),
		});

		this.queueBox(w, 0.05, innerFrameDepth, trimMaterial, {
			position: new THREE.Vector3(x, y + h / 2 - 0.02, z - wallThickness / 2 + 0.04),
		});

		this.queueBox(w, 0.05, innerFrameDepth, trimMaterial, {
			position: new THREE.Vector3(x, y - h / 2 + 0.02, z - wallThickness / 2 + 0.04),
		});

		this.queueBox(w + 0.22, 0.06, 0.20, trimMaterial, {
			position: new THREE.Vector3(x, y - h / 2 - 0.05, z + 0.11),
		});

		const shutterThickness = 0.035;
		const shutterWidth = w * 0.42;
		const shutterHeight = h + 0.04;
		const shutterZ = z + 0.085;
		const hingeInset = 0.01;

		const leftPivot = new THREE.Vector3(x - w / 2 - hingeInset, y, shutterZ);
		const rightPivot = new THREE.Vector3(x + w / 2 + hingeInset, y, shutterZ);

		const leftOffset = new THREE.Vector3(-shutterWidth / 2, 0, 0);
		const rightOffset = new THREE.Vector3(shutterWidth / 2, 0, 0);

		const leftRotation = new THREE.Euler(0, -Math.PI * 0.42, 0);
		const rightRotation = new THREE.Euler(0, Math.PI * 0.42, 0);

		const leftQuaternion = new THREE.Quaternion().setFromEuler(leftRotation);
		const rightQuaternion = new THREE.Quaternion().setFromEuler(rightRotation);

		leftOffset.applyQuaternion(leftQuaternion);
		rightOffset.applyQuaternion(rightQuaternion);

		this.queueBox(shutterWidth, shutterHeight, shutterThickness, trimMaterial, {
			position: leftPivot.clone().add(leftOffset),
			rotation: leftRotation,
		});

		this.queueBox(shutterWidth, shutterHeight, shutterThickness, trimMaterial, {
			position: rightPivot.clone().add(rightOffset),
			rotation: rightRotation,
		});
	}

	loadTexture(path, srgb = false) {
		const texture = this.textureLoader.load(path);

		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(1, 1);
		texture.anisotropy = 2;
		texture.generateMipmaps = true;
		texture.minFilter = THREE.LinearMipmapLinearFilter;

		if (srgb) texture.colorSpace = THREE.SRGBColorSpace;

		return texture;
	}

	createWallMaterial(texturePath) {
		const map = this.loadTexture(`${texturePath}wood_planks_12_color_4k.png`, true);
		const normalMap = this.loadTexture(`${texturePath}wood_planks_12_normal_gl_4k.png`);
		const roughnessMap = this.loadTexture(`${texturePath}wood_planks_12_roughness_4k.png`);

		return new THREE.MeshStandardMaterial({
			map,
			normalMap,
			roughnessMap,
			color: 0xffffff,
			normalScale: new THREE.Vector2(0.4, 0.4),
			roughness: 0.95,
			metalness: 0,
		});
	}

	createRoofMaterial(texturePath) {
		const map = this.loadTexture(`${texturePath}wooden_roof_tiles_08_basecolor_4k.png`, true);
		const normalMap = this.loadTexture(`${texturePath}wooden_roof_tiles_08_normal_gl_4k.png`);
		const roughnessMap = this.loadTexture(`${texturePath}wooden_roof_tiles_08_roughness_4k.png`);

		return new THREE.MeshStandardMaterial({
			map,
			normalMap,
			roughnessMap,
			color: 0xffffff,
			normalScale: new THREE.Vector2(0.55, 0.55),
			roughness: 0.96,
			metalness: 0,
			side: THREE.FrontSide,
		});
	}

	createBox(width, height, depth, material) {
		const geometry = new THREE.BoxGeometry(width, height, depth);

		if (geometry.attributes.uv) {
			geometry.setAttribute(
				'uv2',
				new THREE.BufferAttribute(new Float32Array(geometry.attributes.uv.array), 2)
			);
		}

		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		return mesh;
	}

	createWallBoxGeometry(width, height, depth, {
		uOffset = 0,
		vOffset = 0,
	} = {}) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const uv = geometry.attributes.uv;
		const tpu = this.wallTilesPerUnit;

		const faceDims = [
			[depth, height],
			[depth, height],
			[width, depth],
			[width, depth],
			[width, height],
			[width, height],
		];

		for (let face = 0; face < 6; face++) {
			const [fw, fh] = faceDims[face];
			const repU = fw * tpu;
			const repV = fh * tpu;

			const isWallPlane = face === 4 || face === 5;
			const oU = isWallPlane ? uOffset : 0;
			const oV = isWallPlane ? vOffset : 0;

			for (let i = 0; i < 4; i++) {
				const idx = face * 4 + i;
				uv.setXY(
					idx,
					uv.getX(idx) * repU + oU,
					uv.getY(idx) * repV + oV
				);
			}
		}

		uv.needsUpdate = true;

		geometry.setAttribute(
			'uv2',
			new THREE.BufferAttribute(new Float32Array(uv.array), 2)
		);

		return geometry;
	}

	createWallBox(width, height, depth, material, { uOffset = 0, vOffset = 0 } = {}) {
		const geometry = this.createWallBoxGeometry(width, height, depth, {
			uOffset,
			vOffset,
		});

		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		return mesh;
	}

	addCornerTrim(width, depth, height, material) {
		const s = 0.16;
		const off = 0.09;

		const positions = [
			[-width / 2 - off, depth / 2 + off],
			[width / 2 + off, depth / 2 + off],
			[-width / 2 - off, -depth / 2 - off],
			[width / 2 + off, -depth / 2 - off],
		];

		for (const [px, pz] of positions) {
			this.queueBox(s, height, s, material, {
				position: new THREE.Vector3(px, height / 2, pz),
			});
		}
	}

	addRoofEdgeTrim(width, depth, height, material) {
		this.queueBox(width + 0.28, 0.12, 0.12, material, {
			position: new THREE.Vector3(0, height + 0.02, depth / 2 + 0.08),
		});

		this.queueBox(width + 0.28, 0.12, 0.12, material, {
			position: new THREE.Vector3(0, height + 0.02, -depth / 2 - 0.08),
		});

		this.queueBox(0.12, 0.12, depth + 0.28, material, {
			position: new THREE.Vector3(-width / 2 - 0.08, height + 0.02, 0),
		});

		this.queueBox(0.12, 0.12, depth + 0.28, material, {
			position: new THREE.Vector3(width / 2 + 0.08, height + 0.02, 0),
		});
	}

	buildHipRoofGeometry(width, depth, rise, overhang) {
		const w = width / 2 + overhang;
		const d = depth / 2 + overhang;

		const topA = new THREE.Vector3(-w * 0.28, rise, 0);
		const topB = new THREE.Vector3(w * 0.28, rise, 0);

		const fl = new THREE.Vector3(-w, 0, d);
		const fr = new THREE.Vector3(w, 0, d);
		const bl = new THREE.Vector3(-w, 0, -d);
		const br = new THREE.Vector3(w, 0, -d);

		const vertices = [];
		const uvs = [];

		const su = (width + overhang * 2) * this.roofTilesPerUnit;
		const sv = (depth + overhang * 2) * this.roofTilesPerUnit;

		const pushTri = (a, b, c, ua, ub, uc) => {
			vertices.push(
				a.x, a.y, a.z,
				b.x, b.y, b.z,
				c.x, c.y, c.z
			);

			uvs.push(
				ua[0] * su, ua[1] * sv,
				ub[0] * su, ub[1] * sv,
				uc[0] * su, uc[1] * sv
			);
		};

		pushTri(fl, fr, topB, [0, 0], [1, 0], [0.75, 1]);
		pushTri(fl, topB, topA, [0, 0], [0.75, 1], [0.25, 1]);
		pushTri(bl, topA, topB, [0, 0], [0.25, 1], [0.75, 1]);
		pushTri(bl, topB, br, [0, 0], [0.75, 1], [1, 0]);
		pushTri(fl, topA, bl, [0, 0], [0.5, 1], [1, 0]);
		pushTri(fr, br, topB, [0, 0], [1, 0], [0.5, 1]);

		const geometry = new THREE.BufferGeometry();

		geometry.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array(vertices), 3)
		);

		geometry.setAttribute(
			'uv',
			new THREE.BufferAttribute(new Float32Array(uvs), 2)
		);

		geometry.setAttribute(
			'uv2',
			new THREE.BufferAttribute(new Float32Array(uvs), 2)
		);

		geometry.computeVertexNormals();

		return geometry;
	}

	createHipRoofAssembly(width, depth, rise, overhang, outerMaterial, innerMaterial) {
		const group = new THREE.Group();
		const geometry = this.buildHipRoofGeometry(width, depth, rise, overhang);

		const outerRoof = new THREE.Mesh(geometry, outerMaterial);
		outerRoof.castShadow = true;
		outerRoof.receiveShadow = true;
		group.add(outerRoof);

		const innerRoof = new THREE.Mesh(geometry.clone(), innerMaterial);
		innerRoof.position.y = -0.05;
		innerRoof.scale.set(0.975, 1, 0.975);
		innerRoof.castShadow = true;
		innerRoof.receiveShadow = true;
		group.add(innerRoof);

		return group;
	}
}