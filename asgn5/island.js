import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export default class Island {
	constructor(scene, textureLoader, {
		radius = 16,
		height = 1.5,
		wallMargin = 0.8,
		segments = 96,

		grassPath = null,
		grassObjPath = 'obj/grass.obj',

		grassCount = 140,
		grassPatchCount = 24,
		grassPatchRadius = 3.0,
		grassEdgeMargin = 3.2,
		grassClearCenterRadius = 4.6,

		grassScaleMin = 0.08,
		grassScaleMax = 0.14,
		grassSink = 0.02,

		grassLeanAmount = 0.08,
		grassMinSpacing = 0.45,

		exclusionZones = [
			{ x: -2, z: 0, radius: 2.8 },
			{ x: 2, z: 0, radius: 1.8 },
			{ x: 0, z: 0, radius: 4.6 },
		],
	} = {}) {
		this.radius = radius;
		this.height = height;
		this.wallMargin = wallMargin;
		this.center = new THREE.Vector3(0, 0, 0);
		this.surfaceY = height;
		this.scene = scene;

		this.grassCount = grassCount;
		this.grassPatchCount = grassPatchCount;
		this.grassPatchRadius = grassPatchRadius;
		this.grassEdgeMargin = grassEdgeMargin;
		this.grassClearCenterRadius = grassClearCenterRadius;
		this.grassScaleMin = grassScaleMin;
		this.grassScaleMax = grassScaleMax;
		this.grassSink = grassSink;
		this.grassLeanAmount = grassLeanAmount;
		this.grassMinSpacing = grassMinSpacing;
		this.exclusionZones = exclusionZones;

		const grassTex = grassPath
			? textureLoader.load(grassPath)
			: this._makeGrassTexture(1024);

		grassTex.wrapS = THREE.RepeatWrapping;
		grassTex.wrapT = THREE.RepeatWrapping;
		grassTex.repeat.set(radius / 4.5, radius / 4.5);
		grassTex.colorSpace = THREE.SRGBColorSpace;
		grassTex.anisotropy = 16;
		grassTex.minFilter = THREE.LinearMipmapLinearFilter;
		grassTex.generateMipmaps = true;

		const topGeo = this._makeIslandTopGeometry(radius, height, segments);

		const topMat = new THREE.MeshStandardMaterial({
			map: grassTex,
			roughness: 1,
			metalness: 0,
		});

		this.mesh = new THREE.Mesh(topGeo, topMat);
		this.mesh.position.y = height / 2;
		this.mesh.receiveShadow = true;
		scene.add(this.mesh);

		const sideHeight = height * 2.2;
		const cliffTex = this._makeCliffTexture(512);

		cliffTex.wrapS = THREE.RepeatWrapping;
		cliffTex.wrapT = THREE.RepeatWrapping;
		cliffTex.repeat.set(Math.max(3, Math.round(radius / 2)), 1);
		cliffTex.colorSpace = THREE.SRGBColorSpace;
		cliffTex.anisotropy = 8;

		const sideGeo = new THREE.CylinderGeometry(
			radius * 0.98,
			radius * 0.78,
			sideHeight,
			segments,
			1,
			true
		);

		const sideMat = new THREE.MeshStandardMaterial({
			map: cliffTex,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide,
		});

		const side = new THREE.Mesh(sideGeo, sideMat);
		side.position.y = -sideHeight / 2 + height / 2;
		side.receiveShadow = true;
		scene.add(side);

		this._addGrassDetails(scene);
		this._loadGrassObjects(grassObjPath);
	}

	_makeIslandTopGeometry(radius, height, segments) {
		const geo = new THREE.CylinderGeometry(radius, radius * 0.9, height, segments);
		const pos = geo.attributes.position;

		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			const dist = Math.sqrt(x * x + z * z);

			if (dist > radius * 0.85) {
				const angle = Math.atan2(z, x);

				let variance;

				if (y > 0) {
					variance =
						Math.sin(angle * 3.0) * 0.08 +
						Math.sin(angle * 7.0) * 0.05 +
						Math.sin(angle * 13.0) * 0.03;
				} else {
					variance =
						Math.sin(angle * 3.0) * 0.34 +
						Math.sin(angle * 7.0) * 0.22 +
						Math.sin(angle * 13.0) * 0.12;
				}

				const newRadius = radius + variance;
				const scale = newRadius / dist;

				pos.setX(i, x * scale);
				pos.setZ(i, z * scale);
			}
		}

		pos.needsUpdate = true;
		geo.computeVertexNormals();

		return geo;
	}

	_makeGrassTexture(size = 1024) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = '#77bd4d';
		ctx.fillRect(0, 0, size, size);

		const grassColors = [
			'#4f9f38',
			'#67b84a',
			'#82cf5c',
			'#9edb73',
			'#3f7f32',
			'#b8d86a',
		];

		for (let i = 0; i < 7000; i++) {
			const x = Math.random() * size;
			const y = Math.random() * size;
			const len = 4 + Math.random() * 14;
			const angle = Math.random() * Math.PI * 2;

			ctx.strokeStyle = grassColors[(Math.random() * grassColors.length) | 0];
			ctx.globalAlpha = 0.22 + Math.random() * 0.38;
			ctx.lineWidth = 1;

			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
			ctx.stroke();
		}

		ctx.globalAlpha = 1;

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	_addGrassDetails(scene) {
		const flowerGeo = new THREE.CircleGeometry(0.035, 8);
		const flowerColors = [0xffffff, 0xffcce5, 0xffffaa, 0xccddff];

		for (let i = 0; i < 80; i++) {
			const point = this._getRandomValidPoint();
			if (!point) continue;

			const mat = new THREE.MeshBasicMaterial({
				color: flowerColors[(Math.random() * flowerColors.length) | 0],
				side: THREE.DoubleSide,
			});

			const flower = new THREE.Mesh(flowerGeo, mat);
			flower.position.set(point.x, this.surfaceY + 0.02, point.z);
			flower.rotation.x = -Math.PI / 2;
			scene.add(flower);
		}
	}

	_loadGrassObjects(grassObjPath) {
        const objLoader = new OBJLoader();

        objLoader.load(
            grassObjPath,
            (root) => {
                console.log('Grass OBJ loaded:', grassObjPath);

                const box = new THREE.Box3().setFromObject(root);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                root.position.x -= center.x;
                root.position.z -= center.z;
                root.position.y -= box.min.y;

                root.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = true;

                        child.material = new THREE.MeshStandardMaterial({
                            color: 0x5faa3f,
                            roughness: 1,
                            metalness: 0,
                            side: THREE.DoubleSide,
                        });
                    }
                });

                console.log('Grass OBJ size:', size);

                const placed = [];
                let attempts = 0;
                const maxAttempts = this.grassCount * 100;

                while (placed.length < this.grassCount && attempts < maxAttempts) {
                    attempts++;

                    const point = this._getRandomValidPoint();
                    if (!point) continue;
                    if (!this._hasEnoughSpacing(point.x, point.z, placed)) continue;

                    const grass = root.clone(true);

                    const scale = THREE.MathUtils.lerp(
                        this.grassScaleMin,
                        this.grassScaleMax,
                        Math.random()
                    );

                    grass.scale.set(scale, scale, scale);
                    grass.position.set(point.x, this.surfaceY - this.grassSink, point.z);

                    grass.rotation.y = Math.random() * Math.PI * 2;
                    grass.rotation.x = (Math.random() - 0.5) * this.grassLeanAmount;
                    grass.rotation.z = (Math.random() - 0.5) * this.grassLeanAmount;

                    this.scene.add(grass);
                    placed.push(new THREE.Vector2(point.x, point.z));
                }

                console.log('Grass placed:', placed.length);
            },
            undefined,
            (error) => {
                console.error('Failed to load grass OBJ:', grassObjPath, error);
            }
        );
    }

	_makeGrassPatchCenters() {
		const centers = [];
		let attempts = 0;
		const usableRadius = this.radius - this.grassEdgeMargin;

		while (centers.length < this.grassPatchCount && attempts < this.grassPatchCount * 30) {
			attempts++;

			const angle = Math.random() * Math.PI * 2;
			const dist = Math.sqrt(Math.random()) * usableRadius;

			const x = Math.cos(angle) * dist;
			const z = Math.sin(angle) * dist;

			if (!this._isValidGrassPoint(x, z)) continue;

			centers.push(new THREE.Vector2(x, z));
		}

		return centers;
	}

	_getRandomPatchPoint(patchCenters) {
		if (patchCenters.length === 0) return this._getRandomValidPoint();

		const patch = patchCenters[(Math.random() * patchCenters.length) | 0];
		const angle = Math.random() * Math.PI * 2;
		const dist = Math.sqrt(Math.random()) * this.grassPatchRadius;

		return {
			x: patch.x + Math.cos(angle) * dist,
			z: patch.y + Math.sin(angle) * dist,
		};
	}

	_getRandomValidPoint() {
		let attempts = 0;

		while (attempts < 60) {
			attempts++;

			const usableRadius = this.radius - this.grassEdgeMargin;
			const angle = Math.random() * Math.PI * 2;
			const dist = Math.sqrt(Math.random()) * usableRadius;

			const x = Math.cos(angle) * dist;
			const z = Math.sin(angle) * dist;

			if (this._isValidGrassPoint(x, z)) {
				return { x, z };
			}
		}

		return null;
	}

	_isValidGrassPoint(x, z) {
		const distFromCenter = Math.sqrt(x * x + z * z);
		const usableRadius = this.radius - this.grassEdgeMargin;

		if (distFromCenter > usableRadius) return false;
		if (distFromCenter < this.grassClearCenterRadius) return false;

		for (const zone of this.exclusionZones) {
			const dx = x - zone.x;
			const dz = z - zone.z;
			const d = Math.sqrt(dx * dx + dz * dz);

			if (d < zone.radius) {
				return false;
			}
		}

		return true;
	}

	_hasEnoughSpacing(x, z, placed) {
		for (const p of placed) {
			const dx = x - p.x;
			const dz = z - p.y;
			const distSq = dx * dx + dz * dz;

			if (distSq < this.grassMinSpacing * this.grassMinSpacing) {
				return false;
			}
		}

		return true;
	}

	_makeCliffTexture(size = 512) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d');

		const grad = ctx.createLinearGradient(0, 0, 0, size);
		grad.addColorStop(0, '#8a6a40');
		grad.addColorStop(1, '#5c4326');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, size, size);

		const tones = ['#9a7a4a', '#6e5230', '#7d5d38', '#5c4326', '#a98a5a'];

		for (let i = 0; i < 300; i++) {
			const x = Math.random() * size;
			const y = Math.random() * size;
			const r = 10 + Math.random() * 40;
			const g = ctx.createRadialGradient(x, y, 0, x, y, r);

			g.addColorStop(0, tones[(Math.random() * tones.length) | 0]);
			g.addColorStop(1, 'rgba(0,0,0,0)');

			ctx.globalAlpha = 0.15 + Math.random() * 0.2;
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 0.25;
		ctx.lineWidth = 1.5;

		for (let i = 0; i < 120; i++) {
			const x = Math.random() * size;
			ctx.strokeStyle = Math.random() < 0.5 ? '#4a3320' : '#a98a5a';

			ctx.beginPath();
			ctx.moveTo(x, Math.random() * size * 0.3);
			ctx.lineTo(x + (Math.random() - 0.5) * 8, size * (0.6 + Math.random() * 0.4));
			ctx.stroke();
		}

		ctx.globalAlpha = 1;

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	contains(pos) {
		const dx = pos.x - this.center.x;
		const dz = pos.z - this.center.z;
		return (dx * dx + dz * dz) <= (this.radius - this.wallMargin) ** 2;
	}

	clampPosition(pos) {
		const dx = pos.x - this.center.x;
		const dz = pos.z - this.center.z;
		const distSq = dx * dx + dz * dz;
		const maxR = this.radius - this.wallMargin;

		if (distSq > maxR * maxR) {
			const dist = Math.sqrt(distSq);
			const scale = maxR / dist;
			pos.x = this.center.x + dx * scale;
			pos.z = this.center.z + dz * scale;
		}

		return pos;
	}
}