import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
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
			color: 0x4b392a, roughness: 0.96, metalness: 0, side: THREE.BackSide,
		});
		const trimMaterial = new THREE.MeshStandardMaterial({
			color: 0x5b4731, roughness: 0.95, metalness: 0,
		});
		const frameMaterial = new THREE.MeshStandardMaterial({
			color: 0x3e2a1c, roughness: 0.95, metalness: 0,
		});
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: 0x4a3726, roughness: 0.98, metalness: 0,
		});
		const interiorCeilingMaterial = new THREE.MeshStandardMaterial({
			color: 0x5a4635, roughness: 0.95, metalness: 0,
		});
		const deskMaterial = new THREE.MeshStandardMaterial({
			color: 0x6b4f33, roughness: 0.85, metalness: 0,
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
			width, height, depth, wallThickness, wallMaterial,
			doorCenterX, doorwayWidth, doorwayHeight,
			windowCenterX, windowCenterY, windowWidth, windowHeight,
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

		this.addPorchLights({ doorCenterX, doorwayWidth, doorwayHeight, depth });

		this.addOpenWindow({
			x: windowCenterX, y: windowCenterY, z: depth / 2,
			w: windowWidth, h: windowHeight, wallThickness, frameMaterial, trimMaterial,
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

		this.addDesk(width, depth, height, { deskMaterial });

		this.flushMergedMeshes();

        this.addHangingShelves({
            width,
            depth,
            height,
            side: 'left',
            centerZ: 0.2,
            shelfWidth: 2.25,
            shelfDepth: 0.9,
            shelfThickness: 0.08,
            lowerShelfY: 1.08,
            upperShelfY: 1.95,
            wallGap: -0.02,
            topAnchorRaise: 0.62,
            cableInset: 0.18,
            shelfMaterial: deskMaterial,
        });

        this.addCustomSynthsToShelves();


		// FIX: interior light so dark desk items aren't pure black inside the room
		this.addInteriorLight(height);

		this.addSpeakers({ scale: 5.0, offsetX: 1.7, offsetZ: -0.35 });

        this.addCornerLamp({
            x: 2.75,
            z: 2.3,
            height: 1.65,
        });

        this.addRug({
            x: 0,
            z: 0.55,
            width: 2.8,
            depth: 1.8,
        });

		this.addMonitor({
			targetWidth: 1.45,
			offsetX: 0,
			offsetZ: -0.45,
			yNudge: 0.02,
		});

		this.addKeyboard({
			targetWidth: 1.05,
			offsetX: -0.3,
			offsetZ: 0.28,
			yNudge: 0.03,
			rotationX: 0,
			rotationY: Math.PI,
			rotationZ: 0,
		});

        this.addAudioInterface({
            offsetX: 1.0,
            offsetZ: 0.23,
            yNudge: 0.035,
            rotationY: 0,
        });

        this.addInteriorLights({
            width,
            depth,
            height,
        });

		this.group.position.set(x, y, z);
		this.group.rotation.y = rotationY;

		scene.add(this.group);
	}

	// soft interior fill light so desk items read inside the room
	addInteriorLight(height) {
        const light = new THREE.PointLight(0xfff0dd, 0.25, 4, 2);

        const z = this.deskSurface ? this.deskSurface.z + 1.2 : 0;

        light.position.set(0, height * 0.7, z);
        light.castShadow = false;

        this.group.add(light);
        this.interiorLight = light;
    }

	_findBatch(material) {
		let batch = this._mergeBatches.find((entry) => entry.material === material);
		if (!batch) {
			batch = { material, geometries: [] };
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

	addMonitorDisplay(monitor, {
		width = 1.15,
		height = 0.62,
		offsetY = 0.55,
		offsetZ = -0.035,
		color = 0x4cc9ff,
	} = {}) {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 288;

		const ctx = canvas.getContext('2d');

		const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, '#0b1020');
		gradient.addColorStop(0.55, '#133a5e');
		gradient.addColorStop(1, '#0a0d16');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = 'rgba(76, 201, 255, 0.22)';
		for (let i = 0; i < 8; i++) {
			ctx.fillRect(45, 45 + i * 24, 260 + Math.random() * 90, 8);
		}

		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
		ctx.font = 'bold 34px Arial';
		ctx.fillText('ASG5 STUDIO', 42, 245);

		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;

		const screenMat = new THREE.MeshBasicMaterial({
			map: texture,
			color,
			side: THREE.DoubleSide,
		});

		const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), screenMat);
		screen.position.set(0, offsetY, offsetZ);
		monitor.add(screen);
		this.monitorScreen = screen;
	}

	queueBox(width, height, depth, material, {
		position = new THREE.Vector3(),
		rotation = new THREE.Euler(),
		scale = new THREE.Vector3(1, 1, 1),
	} = {}) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		if (geometry.attributes.uv) {
			geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(geometry.attributes.uv.array), 2));
		}
		this.queueGeometry(geometry, material, { position, rotation, scale });
	}

	queueWallBox(width, height, depth, material, {
		position = new THREE.Vector3(),
		rotation = new THREE.Euler(),
		scale = new THREE.Vector3(1, 1, 1),
		uOffset = 0,
		vOffset = 0,
	} = {}) {
		const geometry = this.createWallBoxGeometry(width, height, depth, { uOffset, vOffset });
		this.queueGeometry(geometry, material, { position, rotation, scale });
	}

	flushMergedMeshes() {
		for (const batch of this._mergeBatches) {
			if (batch.geometries.length === 0) continue;

			let geometry;
			if (batch.geometries.length === 1) {
				geometry = batch.geometries[0];
			} else {
				geometry = mergeGeometries(batch.geometries, false);
				for (const source of batch.geometries) source.dispose();
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
    createRugTexture({
        bg = '#2f2f35',
        border = '#c8b38a',
    } = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = border;
        ctx.lineWidth = 24;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 4;
        ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;

        return texture;
    }

    addRug({
        x = 0,
        z = 0.55,
        width = 2.8,
        depth = 1.8,
        thickness = 0.025,
    } = {}) {
        const rugTexture = this.createRugTexture();

        const rugMat = new THREE.MeshStandardMaterial({
            map: rugTexture,
            roughness: 0.92,
            metalness: 0,
        });

        const rug = new THREE.Mesh(
            new THREE.BoxGeometry(width, thickness, depth),
            rugMat
        );

        rug.position.set(x, 0.14 + thickness / 2 + 0.003, z);
        rug.castShadow = false;
        rug.receiveShadow = true;

        this.group.add(rug);
        this.rug = rug;
    }
	addDesk(width, depth, height, {
		deskWidth = width * 0.62,
		deskDepth = 1.5,
		deskHeight = 0.95,
		topThickness = 0.08,
		legThickness = 0.1,
		backInset = 0.35,
		deskMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4f33, roughness: 0.85, metalness: 0 }),
	} = {}) {
		const zCenter = -depth / 2 + backInset + deskDepth / 2;

		this.queueBox(deskWidth, topThickness, deskDepth, deskMaterial, {
			position: new THREE.Vector3(0, deskHeight, zCenter),
		});

		const legH = deskHeight - topThickness;
		const halfW = deskWidth / 2 - legThickness;
		const halfD = deskDepth / 2 - legThickness;

		const legPositions = [
			[-halfW, -halfD], [halfW, -halfD],
			[-halfW, halfD], [halfW, halfD],
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

    addRodBetween(start, end, radius, material) {
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, length, 10),
            material
        );

        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.group.add(mesh);
        return mesh;
    }

    addHangingShelves({
        width = 7.2,
        depth = 5.8,
        height = 2.6,

        side = 'left',
        centerZ = 0.2,

        shelfWidth = 2.25,
        shelfDepth = 0.9,
        shelfThickness = 0.08,

        lowerShelfY = 1.08,
        upperShelfY = 1.95,

        wallGap = -0.02,
        topAnchorRaise = 0.62,
        cableInset = 0.18,
        cableRadius = 0.012,

        shelfMaterial = new THREE.MeshStandardMaterial({
            color: 0x6b4f33,
            roughness: 0.9,
            metalness: 0,
        }),

        cableMaterial = new THREE.MeshStandardMaterial({
            color: 0x1c1c1c,
            roughness: 0.7,
            metalness: 0.35,
        }),

        anchorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.4,
        }),
    } = {}) {
        if (!this.shelfSurfaces) {
            this.shelfSurfaces = [];
        }

        const shelfX = side === 'left'
            ? -width / 2 + shelfDepth / 2 + wallGap
            : width / 2 - shelfDepth / 2 - wallGap;

        const makeShelf = (y, name) => {
            const board = new THREE.Mesh(
                new THREE.BoxGeometry(shelfDepth, shelfThickness, shelfWidth),
                shelfMaterial
            );

            board.position.set(shelfX, y, centerZ);
            board.castShadow = true;
            board.receiveShadow = true;
            this.group.add(board);

            const frontZ = centerZ + shelfWidth / 2 - cableInset;
            const backZ = centerZ - shelfWidth / 2 + cableInset;

            const topY = y + topAnchorRaise;

            const anchorX = side === 'left'
                ? -width / 2 + wallGap
                : width / 2 - wallGap;

            const boardX = side === 'left'
                ? shelfX + shelfDepth / 2 - 0.08
                : shelfX - shelfDepth / 2 + 0.08;

            const boardY = y + shelfThickness / 2;
            const anchorSize = 0.06;

            const frontAnchor = new THREE.Mesh(
                new THREE.BoxGeometry(anchorSize, anchorSize, anchorSize),
                anchorMaterial
            );
            frontAnchor.position.set(anchorX, topY, frontZ);
            frontAnchor.castShadow = true;
            frontAnchor.receiveShadow = true;
            this.group.add(frontAnchor);

            const backAnchor = new THREE.Mesh(
                new THREE.BoxGeometry(anchorSize, anchorSize, anchorSize),
                anchorMaterial
            );
            backAnchor.position.set(anchorX, topY, backZ);
            backAnchor.castShadow = true;
            backAnchor.receiveShadow = true;
            this.group.add(backAnchor);

            this.addRodBetween(
                new THREE.Vector3(anchorX, topY, frontZ),
                new THREE.Vector3(boardX, boardY, frontZ),
                cableRadius,
                cableMaterial
            );

            this.addRodBetween(
                new THREE.Vector3(anchorX, topY, backZ),
                new THREE.Vector3(boardX, boardY, backZ),
                cableRadius,
                cableMaterial
            );

            this.shelfSurfaces.push({
                name,
                side,
                center: new THREE.Vector3(shelfX, y + shelfThickness / 2, centerZ),
                width: shelfWidth,
                depth: shelfDepth,
            });
        };

        makeShelf(lowerShelfY, 'synthShelfLower');
        makeShelf(upperShelfY, 'synthShelfUpper');
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

    placeOnShelf(object, shelfName = 'synthShelfLower', offsetAlong = 0, offsetDepth = 0, yNudge = 0) {
        if (!this.shelfSurfaces) return;

        const shelf = this.shelfSurfaces.find((s) => s.name === shelfName);
        if (!shelf) return;

        object.position.set(
            shelf.center.x + offsetAlong,
            shelf.center.y + yNudge,
            shelf.center.z + offsetDepth
        );

        this.group.add(object);
    }

    createCustomSynth({
        width = 1.1,
        depth = 0.34,
        height = 0.06,
        bodyColor = 0x17191f,
        panelColor = 0x252833,
        accentColor = 0x4cc9ff,
        keyColor = 0xe8e8df,
        blackKeyColor = 0x050505,
        knobColor = 0x0d0d0f,
        woodColor = 0x5a3820,
    } = {}) {
        const synth = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.72,
            metalness: 0.12,
        });

        const panelMat = new THREE.MeshStandardMaterial({
            color: panelColor,
            roughness: 0.68,
            metalness: 0.18,
        });

        const accentMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.18,
            roughness: 0.45,
            metalness: 0.15,
        });

        const keyMat = new THREE.MeshStandardMaterial({
            color: keyColor,
            roughness: 0.62,
            metalness: 0.02,
        });

        const blackKeyMat = new THREE.MeshStandardMaterial({
            color: blackKeyColor,
            roughness: 0.55,
            metalness: 0.08,
        });

        const knobMat = new THREE.MeshStandardMaterial({
            color: knobColor,
            roughness: 0.48,
            metalness: 0.3,
        });

        const woodMat = new THREE.MeshStandardMaterial({
            color: woodColor,
            roughness: 0.8,
            metalness: 0,
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            bodyMat
        );
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        synth.add(body);

        const rearPanel = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.72, height * 0.45, depth * 0.32),
            panelMat
        );
        rearPanel.position.set(width * 0.08, height + 0.012, -depth * 0.22);
        rearPanel.castShadow = true;
        rearPanel.receiveShadow = true;
        synth.add(rearPanel);

        const leftCheek = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.08, height * 1.45, depth * 1.05),
            woodMat
        );
        leftCheek.position.set(-width * 0.52, height * 0.72, 0);
        leftCheek.castShadow = true;
        leftCheek.receiveShadow = true;
        synth.add(leftCheek);

        const rightCheek = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.08, height * 1.45, depth * 1.05),
            woodMat
        );
        rightCheek.position.set(width * 0.52, height * 0.72, 0);
        rightCheek.castShadow = true;
        rightCheek.receiveShadow = true;
        synth.add(rightCheek);

        const whiteKeyCount = 16;
        const keyW = width * 0.042;
        const keyH = height * 0.15;
        const keyD = depth * 0.44;
        const startX = -width * 0.38;

        for (let i = 0; i < whiteKeyCount; i++) {
            const key = new THREE.Mesh(
                new THREE.BoxGeometry(keyW, keyH, keyD),
                keyMat
            );

            key.position.set(
                startX + i * keyW * 1.04,
                height + 0.018,
                depth * 0.17
            );

            key.castShadow = true;
            key.receiveShadow = true;
            synth.add(key);
        }

        const blackPattern = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14];

        for (const i of blackPattern) {
            const key = new THREE.Mesh(
                new THREE.BoxGeometry(keyW * 0.58, keyH * 1.7, keyD * 0.58),
                blackKeyMat
            );

            key.position.set(
                startX + (i + 0.55) * keyW * 1.04,
                height + 0.04,
                depth * 0.06
            );

            key.castShadow = true;
            key.receiveShadow = true;
            synth.add(key);
        }

        for (let i = 0; i < 6; i++) {
            const knob = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, 0.014, 18),
                knobMat
            );

            knob.rotation.x = Math.PI / 2;
            knob.position.set(
                width * 0.17 + i * 0.06,
                height + 0.035,
                -depth * 0.24
            );

            knob.castShadow = true;
            knob.receiveShadow = true;
            synth.add(knob);
        }

        for (let i = 0; i < 4; i++) {
            const sliderTrack = new THREE.Mesh(
                new THREE.BoxGeometry(0.012, 0.01, 0.09),
                panelMat
            );

            sliderTrack.position.set(
                -width * 0.28 + i * 0.055,
                height + 0.03,
                -depth * 0.23
            );

            sliderTrack.castShadow = true;
            sliderTrack.receiveShadow = true;
            synth.add(sliderTrack);

            const sliderCap = new THREE.Mesh(
                new THREE.BoxGeometry(0.026, 0.018, 0.018),
                accentMat
            );

            sliderCap.position.set(
                -width * 0.28 + i * 0.055,
                height + 0.045,
                -depth * 0.23 + (i % 2 === 0 ? 0.018 : -0.018)
            );

            sliderCap.castShadow = true;
            sliderCap.receiveShadow = true;
            synth.add(sliderCap);
        }

        for (let i = 0; i < 4; i++) {
            const led = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 12, 12),
                accentMat
            );

            led.position.set(
                width * 0.24 + i * 0.055,
                height + 0.045,
                -depth * 0.08
            );

            led.castShadow = false;
            led.receiveShadow = false;
            synth.add(led);
        }

        return synth;
    }

    addCustomSynthsToShelves() {
        const lowerSynth = this.createCustomSynth({
            width: 1.25,
            depth: 0.38,
            height: 0.09,
            bodyColor: 0x202126,
            accentColor: 0x4cc9ff,
        });

        lowerSynth.rotation.y = Math.PI / 2;

        this.placeOnShelf(
            lowerSynth,
            'synthShelfLower',
            0,
            0.16,
            0.035
        );

        const upperSynth = this.createCustomSynth({
            width: 1.05,
            depth: 0.34,
            height: 0.08,
            bodyColor: 0x2b222d,
            accentColor: 0xff5fd2,
            keyColor: 0xf4ead8,
        });

        upperSynth.rotation.y = Math.PI / 2;

        this.placeOnShelf(
            upperSynth,
            'synthShelfUpper',
            0.15,
            0.16,
            0.035
        );

        this.customSynths = {
            lowerSynth,
            upperSynth,
        };
    }

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

	addMonitor({
		objPath = 'LCD.obj',
		mtlPath = 'LCD.mtl',
		modelPath = 'obj/',
		targetWidth = 1.45,
		offsetX = 0,
		offsetZ = -0.12,
		yNudge = 0.02,
		rotationX = -Math.PI / 2,
		rotationY = 0,
		rotationZ = 0,
	} = {}) {
		const mtlLoader = new MTLLoader();
		mtlLoader.setPath(modelPath);

		mtlLoader.load(
			mtlPath,
			(materials) => {
				materials.preload();

				const objLoader = new OBJLoader();
				objLoader.setPath(modelPath);
				objLoader.setMaterials(materials);

				objLoader.load(
					objPath,
					(root) => {
						root.updateMatrixWorld(true);

						const box = new THREE.Box3().setFromObject(root);
						const size = box.getSize(new THREE.Vector3());
						const center = box.getCenter(new THREE.Vector3());

						root.position.x -= center.x;
						root.position.z -= center.z;
						root.position.y -= box.min.y;

						const largestXZ = Math.max(size.x, size.z);
						const scale = targetWidth / largestXZ;

						root.scale.set(scale, scale, scale);
						root.rotation.set(rotationX, rotationY, rotationZ);

						// FIX: give monitor an explicit, non-black material
						root.traverse((child) => {
							if (!child.isMesh) return;
							child.castShadow = true;
							child.receiveShadow = true;
							child.material = new THREE.MeshStandardMaterial({
								color: 0x202024,   // dark gray, not pure black
								roughness: 0.55,
								metalness: 0.25,
							});
						});

						this.placeOnDesk(root, offsetX, offsetZ, yNudge);
						this.monitor = root;

						this.addMonitorDisplay(root, {
							width: 1.15,
							height: 0.62,
							offsetY: 0.55,
							offsetZ: -0.035,
						});

						console.log('LCD monitor normalized scale:', scale);
					},
					undefined,
					(err) => console.error('Failed to load LCD monitor OBJ:', err)
				);
			},
			undefined,
			(err) => console.error('Failed to load LCD monitor MTL:', err)
		);
	}

    addAudioInterface({
        offsetX = 1.0,
        offsetZ = 0.23,
        yNudge = 0.035,
        rotationY = 0,
        width = 0.48,
        depth = 0.32,
        height = 0.08,
    } = {}) {
        const audioInterface = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1d1f24,
            roughness: 0.58,
            metalness: 0.25,
        });

        const frontMat = new THREE.MeshStandardMaterial({
            color: 0x2c3038,
            roughness: 0.52,
            metalness: 0.3,
        });

        const knobMat = new THREE.MeshStandardMaterial({
            color: 0x0d0d0f,
            roughness: 0.45,
            metalness: 0.35,
        });

        const ledMat = new THREE.MeshStandardMaterial({
            color: 0x36ff7a,
            emissive: 0x36ff7a,
            emissiveIntensity: 0.9,
            roughness: 0.4,
            metalness: 0.05,
        });

        const jackMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.4,
            metalness: 0.45,
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            bodyMat
        );
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        audioInterface.add(body);

        const frontPanel = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.96, height * 0.72, 0.018),
            frontMat
        );
        frontPanel.position.set(0, height * 0.55, depth / 2 + 0.011);
        frontPanel.castShadow = true;
        frontPanel.receiveShadow = true;
        audioInterface.add(frontPanel);

        for (let i = 0; i < 2; i++) {
            const jack = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, 0.018, 20),
                jackMat
            );
            jack.rotation.x = Math.PI / 2;
            jack.position.set(-width * 0.28 + i * 0.11, height * 0.58, depth / 2 + 0.028);
            jack.castShadow = true;
            jack.receiveShadow = true;
            audioInterface.add(jack);
        }

        for (let i = 0; i < 2; i++) {
            const knob = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.045, 0.025, 24),
                knobMat
            );
            knob.rotation.x = Math.PI / 2;
            knob.position.set(width * 0.12 + i * 0.13, height * 0.62, depth / 2 + 0.03);
            knob.castShadow = true;
            knob.receiveShadow = true;
            audioInterface.add(knob);

            const indicator = new THREE.Mesh(
                new THREE.BoxGeometry(0.006, 0.028, 0.004),
                ledMat
            );
            indicator.position.set(width * 0.12 + i * 0.13, height * 0.66, depth / 2 + 0.045);
            audioInterface.add(indicator);
        }

        for (let i = 0; i < 3; i++) {
            const led = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 12, 12),
                ledMat
            );
            led.position.set(-width * 0.08 + i * 0.04, height * 0.72, depth / 2 + 0.035);
            led.castShadow = false;
            led.receiveShadow = false;
            audioInterface.add(led);
        }

        const labelMat = new THREE.MeshStandardMaterial({
            color: 0xbfc6d1,
            roughness: 0.6,
            metalness: 0.05,
        });

        const label = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.22, 0.006, 0.01),
            labelMat
        );
        label.position.set(0, height + 0.006, -depth * 0.18);
        label.castShadow = false;
        label.receiveShadow = false;
        audioInterface.add(label);

        audioInterface.rotation.y = rotationY;

        this.placeOnDesk(audioInterface, offsetX, offsetZ, yNudge);
        this.audioInterface = audioInterface;
    }

	addKeyboard({
		objPath = 'Keyboard.obj',
		mtlPath = 'Keyboard.mtl',
		modelPath = 'obj/',
		targetWidth = 1.05,
		offsetX = 0,
		offsetZ = 0.28,
		yNudge = 0.03,
		rotationX = 0,
		rotationY = Math.PI,
		rotationZ = 0,
	} = {}) {
		const mtlLoader = new MTLLoader();
		mtlLoader.setPath(modelPath);

		mtlLoader.load(
			mtlPath,
			(materials) => {
				materials.preload();

				const objLoader = new OBJLoader();
				objLoader.setPath(modelPath);
				objLoader.setMaterials(materials);

				objLoader.load(
					objPath,
					(root) => {
						const pivot = new THREE.Group();
						root.updateMatrixWorld(true);

						let box = new THREE.Box3().setFromObject(root);
						const size = box.getSize(new THREE.Vector3());
						const center = box.getCenter(new THREE.Vector3());

						root.position.x -= center.x;
						root.position.z -= center.z;
						root.position.y -= center.y;

						const largestXZ = Math.max(size.x, size.z);
						const scale = targetWidth / largestXZ;

						root.scale.set(scale, scale, scale);
						root.rotation.set(rotationX, rotationY, rotationZ);

						pivot.add(root);
						pivot.updateMatrixWorld(true);

						box = new THREE.Box3().setFromObject(pivot);
						const minY = box.min.y;
						root.position.y -= minY;

						// FIX: explicit non-black material for the keyboard
						root.traverse((child) => {
							if (!child.isMesh) return;
							child.castShadow = true;
							child.receiveShadow = true;
							child.material = new THREE.MeshStandardMaterial({
								color: 0x2a2a30,
								roughness: 0.7,
								metalness: 0.15,
							});
						});

						this.placeOnDesk(pivot, offsetX, offsetZ, yNudge);
						this.keyboard = pivot;

						console.log('Keyboard normalized scale:', scale);
					},
					undefined,
					(err) => console.error('Failed to load keyboard OBJ:', err)
				);
			},
			undefined,
			(err) => console.error('Failed to load keyboard MTL:', err)
		);
	}

	_makeGlowSprite(color) {
		if (!this._glowTexture) {
			const size = 128;
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = size;

			const ctx = canvas.getContext('2d');
			const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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

		const housingMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8, metalness: 0.3 });
		const bulbMat = new THREE.MeshStandardMaterial({
			color: bulbColor, emissive: bulbColor, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0,
		});

		const makeLantern = (x) => {
			const lantern = new THREE.Group();

			const plate = this.createBox(0.16, 0.22, 0.05, housingMat);
			plate.position.set(0, 0.02, -0.06);
			plate.castShadow = false; plate.receiveShadow = false;
			lantern.add(plate);

			const arm = this.createBox(0.05, 0.05, 0.16, housingMat);
			arm.position.set(0, 0.1, 0.04);
			arm.castShadow = false; arm.receiveShadow = false;
			lantern.add(arm);

			const cap = this.createBox(0.18, 0.05, 0.18, housingMat);
			cap.position.set(0, 0.04, 0.14);
			cap.castShadow = false; cap.receiveShadow = false;
			lantern.add(cap);

			const postH = 0.18;
			const postT = 0.025;
			const cageHalf = 0.07;
			const postPositions = [
				[-cageHalf, 0.14 - cageHalf], [cageHalf, 0.14 - cageHalf],
				[-cageHalf, 0.14 + cageHalf], [cageHalf, 0.14 + cageHalf],
			];
			for (const [px, pz] of postPositions) {
				const post = this.createBox(postT, postH, postT, housingMat);
				post.position.set(px, -0.08, pz);
				post.castShadow = false; post.receiveShadow = false;
				lantern.add(post);
			}

			const bottom = this.createBox(0.16, 0.04, 0.16, housingMat);
			bottom.position.set(0, -0.19, 0.14);
			bottom.castShadow = false; bottom.receiveShadow = false;
			lantern.add(bottom);

			const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), bulbMat);
			bulb.position.set(0, -0.08, 0.14);
			bulb.castShadow = false; bulb.receiveShadow = false;
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

    addCornerLamp({
        x = 2.75,
        z = 1.9,
        height = 1.65,
        baseRadius = 0.16,
        poleRadius = 0.025,
        shadeRadiusTop = 0.18,
        shadeRadiusBottom = 0.32,
        shadeHeight = 0.34,
        lightColor = 0xffd28a,
        lightIntensity = 1.25,
        lightDistance = 4.5,
    } = {}) {
        const lamp = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x24201c,
            roughness: 0.45,
            metalness: 0.45,
        });

        const shadeMat = new THREE.MeshStandardMaterial({
            color: 0xd8b783,
            roughness: 0.85,
            metalness: 0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
        });

        const bulbMat = new THREE.MeshStandardMaterial({
            color: lightColor,
            emissive: lightColor,
            emissiveIntensity: 1.5,
            roughness: 0.35,
            metalness: 0,
        });

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(baseRadius, baseRadius, 0.045, 32),
            metalMat
        );
        base.position.y = 0.14 + 0.022;
        base.castShadow = true;
        base.receiveShadow = true;
        lamp.add(base);

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(poleRadius, poleRadius, height, 16),
            metalMat
        );
        pole.position.y = 0.14 + height / 2;
        pole.castShadow = true;
        pole.receiveShadow = true;
        lamp.add(pole);

        const shadeY = 0.14 + height + shadeHeight * 0.25;

        const shade = new THREE.Mesh(
            new THREE.CylinderGeometry(
                shadeRadiusTop,
                shadeRadiusBottom,
                shadeHeight,
                32,
                1,
                true
            ),
            shadeMat
        );
        shade.position.y = shadeY;
        shade.castShadow = true;
        shade.receiveShadow = true;
        lamp.add(shade);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 16),
            bulbMat
        );
        bulb.position.y = shadeY - shadeHeight * 0.12;
        bulb.castShadow = false;
        bulb.receiveShadow = false;
        lamp.add(bulb);

        const light = new THREE.PointLight(lightColor, lightIntensity, lightDistance, 2);
        light.position.y = bulb.position.y;
        light.castShadow = false;
        lamp.add(light);

        const glow = this._makeGlowSprite(lightColor);
        glow.position.y = bulb.position.y;
        glow.scale.set(0.55, 0.55, 1);
        lamp.add(glow);

        lamp.position.set(x, 0, z);

        this.group.add(lamp);
        this.cornerLamp = {
            group: lamp,
            light,
            bulb,
            glow,
        };
    }

    addInteriorLights({
        width = 7.2,
        depth = 5.8,
        height = 2.6,
    } = {}) {
        this.interiorLights = [];

        const warmColor = 0xffc987;
        const screenColor = 0x4cc9ff;

        const ceilingBulbMat = new THREE.MeshStandardMaterial({
            color: warmColor,
            emissive: warmColor,
            emissiveIntensity: 1.8,
            roughness: 0.4,
            metalness: 0,
        });

        const ceilingHousingMat = new THREE.MeshStandardMaterial({
            color: 0x2a2118,
            roughness: 0.7,
            metalness: 0.2,
        });

        const ceilingFixture = new THREE.Group();

        const plate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.26, 0.05, 24),
            ceilingHousingMat
        );
        plate.position.set(0, height - 0.11, -depth * 0.05);
        plate.rotation.x = Math.PI / 2;
        plate.castShadow = false;
        plate.receiveShadow = false;
        ceilingFixture.add(plate);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 18, 18),
            ceilingBulbMat
        );
        bulb.position.set(0, height - 0.22, -depth * 0.05);
        bulb.castShadow = false;
        bulb.receiveShadow = false;
        ceilingFixture.add(bulb);

        const ceilingLight = new THREE.PointLight(warmColor, 2.4, 7.5, 2);
        ceilingLight.position.set(0, height - 0.3, -depth * 0.05);
        ceilingLight.castShadow = true;
        ceilingLight.shadow.mapSize.set(512, 512);
        ceilingLight.shadow.bias = -0.0004;
        ceilingFixture.add(ceilingLight);

        const fillLight = new THREE.PointLight(0xffe1b0, 0.7, 5.5, 2);
        fillLight.position.set(-width * 0.22, height * 0.55, -depth * 0.25);
        fillLight.castShadow = false;
        this.group.add(fillLight);

        const deskLight = new THREE.PointLight(warmColor, 1.15, 3.2, 2);
        deskLight.position.set(width * 0.25, 1.45, -depth * 0.3);
        deskLight.castShadow = false;
        this.group.add(deskLight);

        const ceilingGlow = this._makeGlowSprite(warmColor);
        ceilingGlow.position.copy(bulb.position);
        ceilingGlow.scale.set(0.85, 0.85, 1);
        ceilingFixture.add(ceilingGlow);

        this.group.add(ceilingFixture);

        this.interiorLights.push({
            ceilingLight,
            fillLight,
            deskLight,
            bulb,
            ceilingGlow,
        });
    }

	addFrontWallWithOpenings({
		width, height, depth, wallThickness, wallMaterial,
		doorCenterX, doorwayWidth, doorwayHeight,
		windowCenterX, windowCenterY, windowWidth, windowHeight,
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

	addOpenWindow({ x, y, z, w, h, wallThickness, frameMaterial, trimMaterial }) {
		const outerFrameDepth = 0.10;
		const innerFrameDepth = 0.08;

		this.queueBox(0.08, h + 0.12, outerFrameDepth, frameMaterial, { position: new THREE.Vector3(x - w / 2, y, z + 0.03) });
		this.queueBox(0.08, h + 0.12, outerFrameDepth, frameMaterial, { position: new THREE.Vector3(x + w / 2, y, z + 0.03) });
		this.queueBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial, { position: new THREE.Vector3(x, y + h / 2, z + 0.03) });
		this.queueBox(w + 0.08, 0.08, outerFrameDepth, frameMaterial, { position: new THREE.Vector3(x, y - h / 2, z + 0.03) });

		this.queueBox(0.05, h, innerFrameDepth, trimMaterial, { position: new THREE.Vector3(x - w / 2 + 0.02, y, z - wallThickness / 2 + 0.04) });
		this.queueBox(0.05, h, innerFrameDepth, trimMaterial, { position: new THREE.Vector3(x + w / 2 - 0.02, y, z - wallThickness / 2 + 0.04) });
		this.queueBox(w, 0.05, innerFrameDepth, trimMaterial, { position: new THREE.Vector3(x, y + h / 2 - 0.02, z - wallThickness / 2 + 0.04) });
		this.queueBox(w, 0.05, innerFrameDepth, trimMaterial, { position: new THREE.Vector3(x, y - h / 2 + 0.02, z - wallThickness / 2 + 0.04) });
		this.queueBox(w + 0.22, 0.06, 0.20, trimMaterial, { position: new THREE.Vector3(x, y - h / 2 - 0.05, z + 0.11) });

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
			map, normalMap, roughnessMap,
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
			map, normalMap, roughnessMap,
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
			geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(geometry.attributes.uv.array), 2));
		}
		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}

	createWallBoxGeometry(width, height, depth, { uOffset = 0, vOffset = 0 } = {}) {
		const geometry = new THREE.BoxGeometry(width, height, depth);
		const uv = geometry.attributes.uv;
		const tpu = this.wallTilesPerUnit;

		const faceDims = [
			[depth, height], [depth, height],
			[width, depth], [width, depth],
			[width, height], [width, height],
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
		geometry.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv.array), 2));
		return geometry;
	}

	createWallBox(width, height, depth, material, { uOffset = 0, vOffset = 0 } = {}) {
		const geometry = this.createWallBoxGeometry(width, height, depth, { uOffset, vOffset });
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
			this.queueBox(s, height, s, material, { position: new THREE.Vector3(px, height / 2, pz) });
		}
	}

	addRoofEdgeTrim(width, depth, height, material) {
		this.queueBox(width + 0.28, 0.12, 0.12, material, { position: new THREE.Vector3(0, height + 0.02, depth / 2 + 0.08) });
		this.queueBox(width + 0.28, 0.12, 0.12, material, { position: new THREE.Vector3(0, height + 0.02, -depth / 2 - 0.08) });
		this.queueBox(0.12, 0.12, depth + 0.28, material, { position: new THREE.Vector3(-width / 2 - 0.08, height + 0.02, 0) });
		this.queueBox(0.12, 0.12, depth + 0.28, material, { position: new THREE.Vector3(width / 2 + 0.08, height + 0.02, 0) });
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
			uvs.push(ua[0] * su, ua[1] * sv, ub[0] * su, ub[1] * sv, uc[0] * su, uc[1] * sv);
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