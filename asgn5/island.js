import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export default class Island {
	constructor(scene, textureLoader, {
		radius = 16,
		height = 1.5,
		wallMargin = 0.8,
		segments = 96,

		groundColor = 0x3d6b27,
		grassObjPath = 'obj/high_grass.obj',

		grassClusterCount = 480,
		grassTuftsPerClusterMin = 2,
		grassTuftsPerClusterMax = 4,
		grassClusterRadiusMin = 0.18,
		grassClusterRadiusMax = 1.25,
		grassIsolatedTufts = 240,

		grassEdgeMargin = 0.15,
		grassClearCenterRadius = 0,

		grassScaleMin = 0.7,
		grassScaleMax = 1.8,
		grassSink = 0.02,
		grassLeanAmount = 0.55,
		grassMinSpacing = 0.12,

		grassCastShadow = false,
		grassReceiveShadow = true,

		autoGenerateGrass = false,
	} = {}) {
		this.radius = radius;
		this.height = height;
		this.wallMargin = wallMargin;
		this.center = new THREE.Vector3(0, 0, 0);
		this.surfaceY = height;
		this.scene = scene;

		this.grassObjPath = grassObjPath;
		this.grassClusterCount = grassClusterCount;
		this.grassTuftsPerClusterMin = grassTuftsPerClusterMin;
		this.grassTuftsPerClusterMax = grassTuftsPerClusterMax;
		this.grassClusterRadiusMin = grassClusterRadiusMin;
		this.grassClusterRadiusMax = grassClusterRadiusMax;
		this.grassIsolatedTufts = grassIsolatedTufts;
		this.grassEdgeMargin = grassEdgeMargin;
		this.grassClearCenterRadius = grassClearCenterRadius;
		this.grassScaleMin = grassScaleMin;
		this.grassScaleMax = grassScaleMax;
		this.grassSink = grassSink;
		this.grassLeanAmount = grassLeanAmount;
		this.grassMinSpacing = grassMinSpacing;
		this.grassCastShadow = grassCastShadow;
		this.grassReceiveShadow = grassReceiveShadow;

		this.grassBlockers = [];
		this.grassGroup = null;
		this.grassGenerated = false;
		this.grassLoading = false;

		const topGeo = this._makeIslandTopGeometry(radius, height, segments);

		const topMat = new THREE.MeshStandardMaterial({
			color: groundColor,
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

		this.side = new THREE.Mesh(sideGeo, sideMat);
		this.side.position.y = -sideHeight / 2 + height / 2;
		this.side.receiveShadow = true;
		scene.add(this.side);

		if (autoGenerateGrass) {
			this.generateGrass();
		}
	}

	addGrassBlockerCircle(x, z, radius) {
		this.grassBlockers.push({
			type: 'circle',
			x,
			z,
			radius,
		});
	}

	addGrassBlockerFromObject(object, padding = 0.8) {
		const box = new THREE.Box3().setFromObject(object);

		box.min.x -= padding;
		box.min.z -= padding;
		box.max.x += padding;
		box.max.z += padding;

		this.grassBlockers.push({
			type: 'box',
			box,
		});
	}

	generateGrass(force = false) {
		if (this.grassLoading) return;

		if (force) {
			this._clearGrass();
		}

		if (this.grassGenerated) return;

		this.grassLoading = true;
		this._loadGrassObjects(this.grassObjPath);
	}

	_clearGrass() {
		if (!this.grassGroup) {
			this.grassGenerated = false;
			this.grassLoading = false;
			return;
		}

		this.scene.remove(this.grassGroup);
		this.grassGroup = null;
		this.grassGenerated = false;
		this.grassLoading = false;
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

				const variance = y > 0
					? Math.sin(angle * 3.0) * 0.08 +
					  Math.sin(angle * 7.0) * 0.05 +
					  Math.sin(angle * 13.0) * 0.03
					: Math.sin(angle * 3.0) * 0.34 +
					  Math.sin(angle * 7.0) * 0.22 +
					  Math.sin(angle * 13.0) * 0.12;

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

	_loadGrassObjects(grassObjPath) {
		const objLoader = new OBJLoader();

		objLoader.load(
			grassObjPath,
			(root) => {
				console.log('Grass OBJ loaded:', grassObjPath);

				const box = new THREE.Box3().setFromObject(root);
				const center = box.getCenter(new THREE.Vector3());

				root.position.x -= center.x;
				root.position.z -= center.z;
				root.position.y -= box.min.y;

				root.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = this.grassCastShadow;
						child.receiveShadow = this.grassReceiveShadow;
						child.material = new THREE.MeshStandardMaterial({
							color: 0x5faa3f,
							roughness: 1,
							metalness: 0,
							side: THREE.DoubleSide,
						});
					}
				});

				this.grassGroup = new THREE.Group();
				this.scene.add(this.grassGroup);

				const placed = [];
				const usableRadius = this.radius - this.grassEdgeMargin;
				let placedCount = 0;

				const spawnGrass = (px, pz, scaleBoost = 1) => {
					if (!this._isValidGrassPoint(px, pz)) return false;
					if (!this._hasEnoughSpacing(px, pz, placed)) return false;

					const grass = root.clone(true);

					const baseScale = THREE.MathUtils.lerp(
						this.grassScaleMin,
						this.grassScaleMax,
						Math.random()
					) * scaleBoost;

					grass.scale.set(
						baseScale * THREE.MathUtils.randFloat(0.65, 1.35),
						baseScale * THREE.MathUtils.randFloat(0.7, 1.8),
						baseScale * THREE.MathUtils.randFloat(0.65, 1.35)
					);

					grass.position.set(
						px,
						this.surfaceY - this.grassSink + THREE.MathUtils.randFloat(-0.015, 0.015),
						pz
					);

					grass.rotation.y = Math.random() * Math.PI * 2;
					grass.rotation.x = THREE.MathUtils.randFloatSpread(this.grassLeanAmount);
					grass.rotation.z = THREE.MathUtils.randFloatSpread(this.grassLeanAmount);

					this.grassGroup.add(grass);
					placed.push({ x: px, z: pz });
					placedCount++;

					return true;
				};

				for (let i = 0; i < this.grassClusterCount; i++) {
					const centerAngle = Math.random() * Math.PI * 2;
					const centerDist = Math.sqrt(Math.random()) * usableRadius;

					const cx = Math.cos(centerAngle) * centerDist;
					const cz = Math.sin(centerAngle) * centerDist;

					if (!this._isValidGrassPoint(cx, cz)) continue;

					const tuftsInCluster = THREE.MathUtils.randInt(
						this.grassTuftsPerClusterMin,
						this.grassTuftsPerClusterMax
					);

					const clusterRadius = THREE.MathUtils.randFloat(
						this.grassClusterRadiusMin,
						this.grassClusterRadiusMax
					);

					for (let j = 0; j < tuftsInCluster; j++) {
						const angle = Math.random() * Math.PI * 2;
						const dist = Math.pow(Math.random(), 1.8) * clusterRadius;

						const px = cx + Math.cos(angle) * dist;
						const pz = cz + Math.sin(angle) * dist;

						spawnGrass(px, pz, THREE.MathUtils.randFloat(0.8, 1.35));
					}
				}

				for (let i = 0; i < this.grassIsolatedTufts; i++) {
					const angle = Math.random() * Math.PI * 2;
					const dist = Math.sqrt(Math.random()) * usableRadius;

					const px = Math.cos(angle) * dist;
					const pz = Math.sin(angle) * dist;

					spawnGrass(px, pz, THREE.MathUtils.randFloat(0.55, 1.1));
				}

				this.grassGenerated = true;
				this.grassLoading = false;

				console.log('Grass placed:', placedCount);
			},
			undefined,
			(error) => {
				this.grassLoading = false;
				console.error('Failed to load grass OBJ:', grassObjPath, error);
			}
		);
	}

	_isValidGrassPoint(x, z) {
		const distFromCenter = Math.sqrt(x * x + z * z);
		const usableRadius = this.radius - this.grassEdgeMargin;

		if (distFromCenter > usableRadius) return false;
		if (distFromCenter < this.grassClearCenterRadius) return false;

		for (const blocker of this.grassBlockers) {
			if (blocker.type === 'circle') {
				const dx = x - blocker.x;
				const dz = z - blocker.z;

				if (dx * dx + dz * dz < blocker.radius * blocker.radius) {
					return false;
				}
			}

			if (blocker.type === 'box') {
				const box = blocker.box;

				if (
					x >= box.min.x &&
					x <= box.max.x &&
					z >= box.min.z &&
					z <= box.max.z
				) {
					return false;
				}
			}
		}

		return true;
	}

	_hasEnoughSpacing(x, z, placed) {
		for (const p of placed) {
			const dx = x - p.x;
			const dz = z - p.z;

			if (dx * dx + dz * dz < this.grassMinSpacing * this.grassMinSpacing) {
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

		return dx * dx + dz * dz <= (this.radius - this.wallMargin) ** 2;
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