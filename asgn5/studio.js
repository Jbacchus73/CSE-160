import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

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

		// tiles-per-world-unit: UVs scale to each piece's real size so planks
		// are the SAME size on every wall and line up across openings.
		wallTilesPerUnit = 0.42,
		roofTilesPerUnit = 0.55,
	} = {}) {
		this.group = new THREE.Group();
		this.textureLoader = new THREE.TextureLoader();

		this.wallTilesPerUnit = wallTilesPerUnit;
		this.roofTilesPerUnit = roofTilesPerUnit;

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

		const wallThickness = 0.18;

		const doorwayWidth = width * 0.16;
		const doorwayHeight = height * 0.78;
		const doorCenterX = width * 0.19;

		const windowWidth = width * 0.17;
		const windowHeight = height * 0.24;
		const windowCenterX = -width * 0.23;
		const windowCenterY = height * 0.57;

		const floor = this.createBox(width, 0.14, depth, floorMaterial);
		floor.position.set(0, 0.07, 0);
		this.group.add(floor);

		// solid walls use world-scaled UVs (uniform planks)
		const backWall = this.createWallBox(width, height, wallThickness, wallMaterial);
		backWall.position.set(0, height / 2, -depth / 2);
		this.group.add(backWall);

		const leftWall = this.createWallBox(wallThickness, height, depth, wallMaterial);
		leftWall.position.set(-width / 2, height / 2, 0);
		this.group.add(leftWall);

		const rightWall = this.createWallBox(wallThickness, height, depth, wallMaterial);
		rightWall.position.set(width / 2, height / 2, 0);
		this.group.add(rightWall);

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

		const leftDoorFrame = this.createBox(0.16, doorwayHeight, 0.26, frameMaterial);
		leftDoorFrame.position.set(doorCenterX - doorwayWidth / 2, doorwayHeight / 2, depth / 2 + 0.05);
		this.group.add(leftDoorFrame);

		const rightDoorFrame = this.createBox(0.16, doorwayHeight, 0.26, frameMaterial);
		rightDoorFrame.position.set(doorCenterX + doorwayWidth / 2, doorwayHeight / 2, depth / 2 + 0.05);
		this.group.add(rightDoorFrame);

		const topDoorFrame = this.createBox(doorwayWidth + 0.14, 0.16, 0.26, frameMaterial);
		topDoorFrame.position.set(doorCenterX, doorwayHeight, depth / 2 + 0.05);
		this.group.add(topDoorFrame);

		const doorStep = this.createBox(doorwayWidth + 0.75, 0.12, 0.58, trimMaterial);
		doorStep.position.set(doorCenterX, 0.06, depth / 2 + 0.42);
		this.group.add(doorStep);

		// porch lights flanking the door
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

		const ceiling = this.createBox(width - 0.1, 0.08, depth - 0.1, interiorCeilingMaterial);
		ceiling.position.set(0, height - 0.04, 0);
		this.group.add(ceiling);

		const roof = this.createHipRoofAssembly(width, depth, 1.8, 0.6, roofMaterial, roofUnderMaterial);
		roof.position.y = height + 0.04;
		this.group.add(roof);

		const chimney = this.createBox(0.34, 0.95, 0.34, trimMaterial);
		chimney.position.set(0.05, height + 1.0, -depth * 0.08);
		this.group.add(chimney);

		// desk against the back wall
		this.addDesk(width, depth, height);

		// two speakers on the desk (loads async; pops in when ready)
		this.addSpeakers();

		this.group.position.set(x, y, z);
		this.group.rotation.y = rotationY;

		scene.add(this.group);
	}

	// desk built from primitives, against the back wall
	addDesk(width, depth, height, {
		deskWidth = width * 0.62,
		deskDepth = 0.9,
		deskHeight = 0.95,
		topThickness = 0.08,
		legThickness = 0.1,
		backInset = 0.35,
	} = {}) {
		const deskMat = new THREE.MeshStandardMaterial({
			color: 0x6b4f33,
			roughness: 0.85,
			metalness: 0,
		});

		const zCenter = -depth / 2 + backInset + deskDepth / 2;

		// tabletop
		const top = this.createBox(deskWidth, topThickness, deskDepth, deskMat);
		top.position.set(0, deskHeight, zCenter);
		this.group.add(top);

		// four legs
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
			const leg = this.createBox(legThickness, legH, legThickness, deskMat);
			leg.position.set(lx, legH / 2, zCenter + lz);
			this.group.add(leg);
		}

		// surface info in LOCAL coords (inside the studio group)
		this.deskSurface = {
			y: deskHeight + topThickness / 2,
			z: zCenter,
			width: deskWidth,
			depth: deskDepth,
			center: new THREE.Vector3(0, deskHeight + topThickness / 2, zCenter),
		};

		return this.deskSurface;
	}

	// place a mesh/group on the desk at a local offset from desk center.
	// objects added this way inherit the studio's position & rotation.
	placeOnDesk(object, offsetX = 0, offsetZ = 0, yNudge = 0) {
		if (!this.deskSurface) return;
		object.position.set(
			this.deskSurface.center.x + offsetX,
			this.deskSurface.y + yNudge,
			this.deskSurface.center.z + offsetZ
		);
		this.group.add(object);
	}

	// load the speaker OBJ once, clone into two, place on the desk.
	// async: speakers appear a moment after the studio is built.
	addSpeakers({
		objPath = 'obj/speaker.obj',
		texturePath = 'obj/textures/',
		scale = 5.0,
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

				// recenter horizontally + base at local origin so it sits ON the desk
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

	// soft round glow texture (radial alpha falloff) for light sprites
	_makeGlowSprite(color) {
		if (!this._glowTexture) {
			const size = 128;
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = size;
			const ctx = canvas.getContext('2d');
			const g = ctx.createRadialGradient(
				size / 2, size / 2, 0,
				size / 2, size / 2, size / 2
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
			opacity: 0.85,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		}));
	}

	// two wall-mounted lantern fixtures on either side of the door.
	// each = a dark housing box + a glowing bulb + a real PointLight.
	addPorchLights({
		doorCenterX = 0,
		doorwayWidth = 1,
		doorwayHeight = 2,
		depth = 5.8,
		spread = 0.55,        // how far out from the door edge
		mountHeight = null,   // defaults to ~80% of door height
		bulbColor = 0xffd28a,
		lightIntensity = 1.4,
		lightDistance = 14,
	} = {}) {
		const z = depth / 2 + 0.12; // just proud of the front wall

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

			// back plate against the wall
			const plate = this.createBox(0.16, 0.22, 0.05, housingMat);
			plate.position.set(0, 0.02, -0.06);
			lantern.add(plate);

			// little arm bracket holding the lantern out from the wall
			const arm = this.createBox(0.05, 0.05, 0.16, housingMat);
			arm.position.set(0, 0.1, 0.04);
			lantern.add(arm);

			// lantern top cap
			const cap = this.createBox(0.18, 0.05, 0.18, housingMat);
			cap.position.set(0, 0.04, 0.14);
			lantern.add(cap);

			// open cage: 4 thin vertical posts (bulb shows through the gaps)
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
				lantern.add(post);
			}

			// bottom cap
			const bottom = this.createBox(0.16, 0.04, 0.16, housingMat);
			bottom.position.set(0, -0.19, 0.14);
			lantern.add(bottom);

			// glowing bulb — now visible inside the open cage
			const bulb = new THREE.Mesh(
				new THREE.SphereGeometry(0.06, 14, 14),
				bulbMat
			);
			bulb.position.set(0, -0.08, 0.14);
			lantern.add(bulb);

			// soft glow sprite so the bulb reads as bright even up close
			const glow = this._makeGlowSprite(bulbColor);
			glow.scale.set(0.45, 0.45, 1);
			glow.position.set(0, -0.08, 0.14);
			lantern.add(glow);

			// actual light source, placed in front so it lights the wall + porch
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

	// optional: toggle porch lights on/off (e.g. at night)
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

		// each piece sits at its true world position, UVs offset so the texture
		// is continuous across all pieces (planks line up across the openings)
		const addPiece = (xMin, xMax, yMin, yMax) => {
			const pieceWidth = xMax - xMin;
			const pieceHeight = yMax - yMin;

			if (pieceWidth <= 0.001 || pieceHeight <= 0.001) return;

			const piece = this.createWallBox(pieceWidth, pieceHeight, wallThickness, wallMaterial, {
				uOffset: (xMin + width / 2) * this.wallTilesPerUnit,
				vOffset: yMin * this.wallTilesPerUnit,
			});
			piece.position.set((xMin + xMax) / 2, (yMin + yMax) / 2, z);
			this.group.add(piece);
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

		const leftFrame = this.createBox(0.08, h + 0.12, outerFrameDepth, frameMaterial);
		leftFrame.position.set(x - w / 2, y, z + 0.03);
		this.group.add(leftFrame);

		const rightFrame = this.createBox(0.08, h + 0.12, outerFrameDepth, frameMaterial);
		rightFrame.position.set(x + w / 2, y, z + 0.03);
		this.group.add(rightFrame);

		const topFrame = this.createBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial);
		topFrame.position.set(x, y + h / 2, z + 0.03);
		this.group.add(topFrame);

		const bottomFrame = this.createBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial);
		bottomFrame.position.set(x, y - h / 2, z + 0.03);
		this.group.add(bottomFrame);

		const innerLeft = this.createBox(0.05, h, innerFrameDepth, trimMaterial);
		innerLeft.position.set(x - w / 2 + 0.02, y, z - wallThickness / 2 + 0.04);
		this.group.add(innerLeft);

		const innerRight = this.createBox(0.05, h, innerFrameDepth, trimMaterial);
		innerRight.position.set(x + w / 2 - 0.02, y, z - wallThickness / 2 + 0.04);
		this.group.add(innerRight);

		const innerTop = this.createBox(w, 0.05, innerFrameDepth, trimMaterial);
		innerTop.position.set(x, y + h / 2 - 0.02, z - wallThickness / 2 + 0.04);
		this.group.add(innerTop);

		const innerBottom = this.createBox(w, 0.05, innerFrameDepth, trimMaterial);
		innerBottom.position.set(x, y - h / 2 + 0.02, z - wallThickness / 2 + 0.04);
		this.group.add(innerBottom);

		const sill = this.createBox(w + 0.22, 0.06, 0.20, trimMaterial);
		sill.position.set(x, y - h / 2 - 0.05, z + 0.11);
		this.group.add(sill);

		const shutterThickness = 0.035;
		const shutterWidth = w * 0.42;
		const shutterHeight = h + 0.04;
		const shutterZ = z + 0.085;
		const hingeInset = 0.01;

		const leftPivot = new THREE.Group();
		leftPivot.position.set(x - w / 2 - hingeInset, y, shutterZ);
		this.group.add(leftPivot);

		const leftShutter = this.createBox(shutterWidth, shutterHeight, shutterThickness, trimMaterial);
		leftShutter.position.set(-shutterWidth / 2, 0, 0);
		leftPivot.add(leftShutter);
		leftPivot.rotation.y = -Math.PI * 0.42;

		const rightPivot = new THREE.Group();
		rightPivot.position.set(x + w / 2 + hingeInset, y, shutterZ);
		this.group.add(rightPivot);

		const rightShutter = this.createBox(shutterWidth, shutterHeight, shutterThickness, trimMaterial);
		rightShutter.position.set(shutterWidth / 2, 0, 0);
		rightPivot.add(rightShutter);
		rightPivot.rotation.y = Math.PI * 0.42;
	}

	// OPTIMIZED: mipmaps on, low anisotropy
	loadTexture(path, srgb = false) {
		const texture = this.textureLoader.load(path);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(1, 1); // per-mesh UVs carry the tiling
		texture.anisotropy = 2;
		texture.generateMipmaps = true;
		texture.minFilter = THREE.LinearMipmapLinearFilter;
		if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
		return texture;
	}

	// OPTIMIZED: dropped aoMap + bumpMap (redundant with normalMap)
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

	// plain box: UVs 0..1 per face (trim/frames/floor where continuity doesn't matter)
	createBox(width, height, depth, material) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}

	// wall box: UVs scaled to world size (constant plank density), optional
	// offset so adjacent pieces share a continuous texture.
	createWallBox(width, height, depth, material, { uOffset = 0, vOffset = 0 } = {}) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const uv = geometry.attributes.uv;
		const tpu = this.wallTilesPerUnit;

		// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts each)
		const faceDims = [
			[depth, height], // +X
			[depth, height], // -X
			[width, depth],  // +Y
			[width, depth],  // -Y
			[width, height], // +Z
			[width, height], // -Z
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
				uv.setXY(idx, uv.getX(idx) * repU + oU, uv.getY(idx) * repV + oV);
			}
		}

		uv.needsUpdate = true;
		geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array, 2));

		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}

	// corner posts pushed clear of the wall faces (avoids z-fighting)
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
			const post = this.createBox(s, height, s, material);
			post.position.set(px, height / 2, pz);
			this.group.add(post);
		}
	}

	addRoofEdgeTrim(width, depth, height, material) {
		const front = this.createBox(width + 0.28, 0.12, 0.12, material);
		front.position.set(0, height + 0.02, depth / 2 + 0.08);
		this.group.add(front);

		const back = this.createBox(width + 0.28, 0.12, 0.12, material);
		back.position.set(0, height + 0.02, -depth / 2 - 0.08);
		this.group.add(back);

		const left = this.createBox(0.12, 0.12, depth + 0.28, material);
		left.position.set(-width / 2 - 0.08, height + 0.02, 0);
		this.group.add(left);

		const right = this.createBox(0.12, 0.12, depth + 0.28, material);
		right.position.set(width / 2 + 0.08, height + 0.02, 0);
		this.group.add(right);
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
			vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
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
		geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
		geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uvs), 2));
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