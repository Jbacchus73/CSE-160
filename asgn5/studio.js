import * as THREE from 'three';

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

		wallTextureRepeatX = 2.4,
		wallTextureRepeatY = 1.25,
		roofTextureRepeatX = 3.6,
		roofTextureRepeatY = 2.8,
	} = {}) {
		this.group = new THREE.Group();
		this.textureLoader = new THREE.TextureLoader();

		const wallMaterial = this.createWallMaterial(
			wallTexturePath,
			wallTextureRepeatX,
			wallTextureRepeatY
		);

		const roofMaterial = this.createRoofMaterial(
			roofTexturePath,
			roofTextureRepeatX,
			roofTextureRepeatY
		);

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

		const backWall = this.createBox(width, height, wallThickness, wallMaterial);
		backWall.position.set(0, height / 2, -depth / 2);
		this.group.add(backWall);

		const leftWall = this.createBox(wallThickness, height, depth, wallMaterial);
		leftWall.position.set(-width / 2, height / 2, 0);
		this.group.add(leftWall);

		const rightWall = this.createBox(wallThickness, height, depth, wallMaterial);
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
		leftDoorFrame.position.set(
			doorCenterX - doorwayWidth / 2,
			doorwayHeight / 2,
			depth / 2 + 0.05
		);
		this.group.add(leftDoorFrame);

		const rightDoorFrame = this.createBox(0.16, doorwayHeight, 0.26, frameMaterial);
		rightDoorFrame.position.set(
			doorCenterX + doorwayWidth / 2,
			doorwayHeight / 2,
			depth / 2 + 0.05
		);
		this.group.add(rightDoorFrame);

		const topDoorFrame = this.createBox(doorwayWidth + 0.14, 0.16, 0.26, frameMaterial);
		topDoorFrame.position.set(
			doorCenterX,
			doorwayHeight,
			depth / 2 + 0.05
		);
		this.group.add(topDoorFrame);

		const doorStep = this.createBox(doorwayWidth + 0.75, 0.12, 0.58, trimMaterial);
		doorStep.position.set(doorCenterX, 0.06, depth / 2 + 0.42);
		this.group.add(doorStep);

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

		const roof = this.createHipRoofAssembly(
			width,
			depth,
			1.8,
			0.6,
			roofMaterial,
			roofUnderMaterial
		);
		roof.position.y = height + 0.04;
		this.group.add(roof);

		const chimney = this.createBox(0.34, 0.95, 0.34, trimMaterial);
		chimney.position.set(0.05, height + 1.0, -depth * 0.08);
		this.group.add(chimney);

		this.group.position.set(x, y, z);
		this.group.rotation.y = rotationY;

		scene.add(this.group);
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

			const piece = this.createBox(pieceWidth, pieceHeight, wallThickness, wallMaterial);
			piece.position.set(
				(xMin + xMax) / 2,
				(yMin + yMax) / 2,
				z
			);
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

        const leftShutter = this.createBox(
            shutterWidth,
            shutterHeight,
            shutterThickness,
            trimMaterial
        );
        leftShutter.position.set(-shutterWidth / 2, 0, 0);
        leftPivot.add(leftShutter);

        leftPivot.rotation.y = -Math.PI * 0.42;

        const rightPivot = new THREE.Group();
        rightPivot.position.set(x + w / 2 + hingeInset, y, shutterZ);
        this.group.add(rightPivot);

        const rightShutter = this.createBox(
            shutterWidth,
            shutterHeight,
            shutterThickness,
            trimMaterial
        );
        rightShutter.position.set(shutterWidth / 2, 0, 0);
        rightPivot.add(rightShutter);

        rightPivot.rotation.y = Math.PI * 0.42;
    }

	loadTexture(path, repeatX, repeatY, color = false) {
		const texture = this.textureLoader.load(path);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(repeatX, repeatY);

		if (color) {
			texture.colorSpace = THREE.SRGBColorSpace;
		}

		return texture;
	}

	createWallMaterial(texturePath, repeatX, repeatY) {
		const map = this.loadTexture(
			`${texturePath}wood_planks_12_color_4k.png`,
			repeatX,
			repeatY,
			true
		);

		const normalMap = this.loadTexture(
			`${texturePath}wood_planks_12_normal_gl_4k.png`,
			repeatX,
			repeatY
		);

		const roughnessMap = this.loadTexture(
			`${texturePath}wood_planks_12_roughness_4k.png`,
			repeatX,
			repeatY
		);

		const aoMap = this.loadTexture(
			`${texturePath}wood_planks_12_ambient_occlusion_4k.png`,
			repeatX,
			repeatY
		);

		const bumpMap = this.loadTexture(
			`${texturePath}wood_planks_12_height_4k.png`,
			repeatX,
			repeatY
		);

		return new THREE.MeshStandardMaterial({
			map,
			normalMap,
			roughnessMap,
			aoMap,
			bumpMap,
			color: 0xd9c7a1,
			bumpScale: 0.018,
			normalScale: new THREE.Vector2(0.35, 0.35),
			roughness: 0.98,
			metalness: 0,
		});
	}

	createRoofMaterial(texturePath, repeatX, repeatY) {
		const map = this.loadTexture(
			`${texturePath}wooden_roof_tiles_08_basecolor_4k.png`,
			repeatX,
			repeatY,
			true
		);

		const normalMap = this.loadTexture(
			`${texturePath}wooden_roof_tiles_08_normal_gl_4k.png`,
			repeatX,
			repeatY
		);

		const roughnessMap = this.loadTexture(
			`${texturePath}wooden_roof_tiles_08_roughness_4k.png`,
			repeatX,
			repeatY
		);

		const aoMap = this.loadTexture(
			`${texturePath}wooden_roof_tiles_08_ambientocclusion_4k.png`,
			repeatX,
			repeatY
		);

		const bumpMap = this.loadTexture(
			`${texturePath}wooden_roof_tiles_08_height_4k.png`,
			repeatX,
			repeatY
		);

		return new THREE.MeshStandardMaterial({
			map,
			normalMap,
			roughnessMap,
			aoMap,
			bumpMap,
			color: 0x9b8b72,
			bumpScale: 0.03,
			normalScale: new THREE.Vector2(0.55, 0.55),
			roughness: 0.96,
			metalness: 0,
			side: THREE.FrontSide,
		});
	}

	createBox(width, height, depth, material) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		geometry.setAttribute(
			'uv2',
			new THREE.BufferAttribute(geometry.attributes.uv.array, 2)
		);

		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}

	addCornerTrim(width, depth, height, material) {
		const s = 0.14;

		const a = this.createBox(s, height, s, material);
		a.position.set(-width / 2 - 0.02, height / 2, depth / 2 + 0.02);
		this.group.add(a);

		const b = this.createBox(s, height, s, material);
		b.position.set(width / 2 + 0.02, height / 2, depth / 2 + 0.02);
		this.group.add(b);

		const c = this.createBox(s, height, s, material);
		c.position.set(-width / 2 - 0.02, height / 2, -depth / 2 - 0.02);
		this.group.add(c);

		const d = this.createBox(s, height, s, material);
		d.position.set(width / 2 + 0.02, height / 2, -depth / 2 - 0.02);
		this.group.add(d);
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

		const pushTri = (a, b, c, ua, ub, uc) => {
			vertices.push(
				a.x, a.y, a.z,
				b.x, b.y, b.z,
				c.x, c.y, c.z
			);
			uvs.push(
				ua[0], ua[1],
				ub[0], ub[1],
				uc[0], uc[1]
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
		innerRoof.position.y = -0.035;
		innerRoof.scale.set(0.985, 1, 0.985);
		innerRoof.castShadow = true;
		innerRoof.receiveShadow = true;
		group.add(innerRoof);

		return group;
	}
}