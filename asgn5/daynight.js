import * as THREE from 'three';

function makeGlowTexture(color = 'rgba(255,255,255,1)') {
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext('2d');
	const gradient = ctx.createRadialGradient(
		size / 2,
		size / 2,
		0,
		size / 2,
		size / 2,
		size / 2
	);

	gradient.addColorStop(0.0, color);
	gradient.addColorStop(0.18, color);
	gradient.addColorStop(0.55, 'rgba(255,255,255,0.22)');
	gradient.addColorStop(1.0, 'rgba(255,255,255,0)');

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default class DayNight {
	constructor(scene, {
		radius = 34,
		speed = 0.005,

		sunColor = 0xfff2b0,
		moonColor = 0xbfd7ff,

		sunSize = 1.3,
		moonSize = 0.9,

		sunIntensity = 3.2,
		moonIntensity = 0.75,
		ambientDayIntensity = 1.1,
		ambientNightIntensity = 0.18,

		enableShadows = true,
		shadowSize = 4096,
		shadowCameraSize = 20,

		textureLoader = null,
		skyRadius = 500,
		morningSky = 'img/sky/morning.png',
		daySky = 'img/sky/day.png',
		goldenSky = 'img/sky/golden_hour.png',
		nightSky = 'img/sky/night.png',
	} = {}) {
		this.scene = scene;
		this.radius = radius;
		this.speed = speed;
		this.time = 0.18;

		this.sunIntensity = sunIntensity;
		this.moonIntensity = moonIntensity;
		this.ambientDayIntensity = ambientDayIntensity;
		this.ambientNightIntensity = ambientNightIntensity;

		this.sun = new THREE.Mesh(
			new THREE.SphereGeometry(sunSize, 32, 32),
			new THREE.MeshBasicMaterial({ color: sunColor })
		);

		this.moon = new THREE.Mesh(
			new THREE.SphereGeometry(moonSize, 32, 32),
			new THREE.MeshBasicMaterial({ color: moonColor })
		);

		this.sunGlow = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: makeGlowTexture('rgba(255,220,120,1)'),
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				depthTest: false,
				opacity: 0.9,
			})
		);

		this.moonGlow = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: makeGlowTexture('rgba(150,190,255,1)'),
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				depthTest: false,
				opacity: 0.55,
			})
		);

		this.sunGlow.scale.set(sunSize * 9, sunSize * 9, 1);
		this.moonGlow.scale.set(moonSize * 7, moonSize * 7, 1);

		this.sunGroup = new THREE.Group();
		this.moonGroup = new THREE.Group();

		this.sun.position.set(0, 0, 0);
		this.moon.position.set(0, 0, 0);
		this.sunGlow.position.set(0, 0, 0);
		this.moonGlow.position.set(0, 0, 0);

		this.sunGroup.add(this.sunGlow);
		this.sunGroup.add(this.sun);

		this.moonGroup.add(this.moonGlow);
		this.moonGroup.add(this.moon);

		this.sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
		this.moonLight = new THREE.DirectionalLight(moonColor, 0);

		this.ambientLight = new THREE.AmbientLight(0xffffff, ambientDayIntensity);
		this.hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x202030, 0.8);

		if (enableShadows) {
			this.sunLight.castShadow = true;
			this.sunLight.shadow.mapSize.width = shadowSize;
			this.sunLight.shadow.mapSize.height = shadowSize;

			this.sunLight.shadow.camera.near = 1;
			this.sunLight.shadow.camera.far = 120;
			this.sunLight.shadow.camera.left = -shadowCameraSize;
			this.sunLight.shadow.camera.right = shadowCameraSize;
			this.sunLight.shadow.camera.top = shadowCameraSize;
			this.sunLight.shadow.camera.bottom = -shadowCameraSize;
			this.sunLight.shadow.camera.updateProjectionMatrix();

			this.sunLight.shadow.bias = -0.00005;
			this.sunLight.shadow.normalBias = 0.04;
			this.sunLight.shadow.radius = 2;
		}

		scene.add(this.sunGroup);
		scene.add(this.moonGroup);
		scene.add(this.sunLight);
		scene.add(this.sunLight.target);
		scene.add(this.moonLight);
		scene.add(this.moonLight.target);
		scene.add(this.ambientLight);
		scene.add(this.hemiLight);

		this.skyMesh = null;
		this.skyMaterial = null;
		this.skyTextures = [];

		this.bottomColors = [
            new THREE.Color(0xe7b49f),
            new THREE.Color(0x9ec2e6),
            new THREE.Color(0xc96a4d),
            new THREE.Color(0x000000),
        ];

		if (textureLoader) {
			this._createSky(scene, textureLoader, {
				skyRadius,
				morningSky,
				daySky,
				goldenSky,
				nightSky,
			});
		}

		this.update(0);
	}

	_createSky(scene, textureLoader, {
		skyRadius,
		morningSky,
		daySky,
		goldenSky,
		nightSky,
	}) {
		this.skyTextures = [
			textureLoader.load(morningSky),
			textureLoader.load(daySky),
			textureLoader.load(goldenSky),
			textureLoader.load(nightSky),
		];

		this.skyTextures.forEach((texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;
		});

		this.skyMaterial = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
			uniforms: {
                textureA: { value: this.skyTextures[0] },
                textureB: { value: this.skyTextures[1] },
                mixAmount: { value: 0 },
                bottomColorA: { value: this.bottomColors[0].clone() },
                bottomColorB: { value: this.bottomColors[1].clone() },
                nightFactor: { value: 0 },
            },
			vertexShader: `
				varying vec2 vUv;

				void main() {
					vUv = vec2(1.0 - uv.x, clamp(uv.y, 0.02, 0.98));
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
                uniform sampler2D textureA;
                uniform sampler2D textureB;
                uniform float mixAmount;

                uniform vec3 bottomColorA;
                uniform vec3 bottomColorB;
                uniform float nightFactor;

                varying vec2 vUv;

                void main() {
                    vec4 colorA = texture2D(textureA, vUv);
                    vec4 colorB = texture2D(textureB, vUv);

                    vec4 skyColor = mix(colorA, colorB, mixAmount);
                    vec3 bottomColor = mix(bottomColorA, bottomColorB, mixAmount);

                    float bottomMask = 1.0 - smoothstep(0.18, 0.42, vUv.y);
                    vec3 finalColor = mix(skyColor.rgb, bottomColor, bottomMask);

                    float nightHorizonMask = (1.0 - smoothstep(0.22, 0.60, vUv.y)) * nightFactor;
                    finalColor = mix(finalColor, vec3(0.0), nightHorizonMask);

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
		});

		const skyGeo = new THREE.SphereGeometry(skyRadius, 96, 48);
		this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
		this.skyMesh.renderOrder = -999;
		this.skyMesh.frustumCulled = false;

		scene.add(this.skyMesh);
	}

	setSpeed(speed) {
		this.speed = speed;
	}

	getCycleTime() {
		return ((this.time % 1) + 1) % 1;
	}

	updateSky(camera) {
		if (!this.skyMesh || !this.skyMaterial) return;

		if (camera) {
			this.skyMesh.position.copy(camera.position);
		}

		const t = this.getCycleTime();
        let nightFactor = 0;

        if (t < 0.58) {
            nightFactor = 0;
        } else if (t < 0.66) {
            nightFactor = (t - 0.58) / 0.08;
        } else if (t < 0.80) {
            nightFactor = 1;
        } else if (t < 0.88) {
            nightFactor = 1 - (t - 0.80) / 0.08;
        } else {
            nightFactor = 0;
        }
        nightFactor = THREE.MathUtils.smoothstep(nightFactor, 0, 1);

		let indexA;
		let indexB;
		let mixAmount;

		if (t < 0.10) {
			indexA = 0;
			indexB = 1;
			mixAmount = t / 0.10;
		} else if (t < 0.46) {
			indexA = 1;
			indexB = 1;
			mixAmount = 0;
		} else if (t < 0.55) {
			indexA = 1;
			indexB = 2;
			mixAmount = (t - 0.46) / 0.09;
		} else if (t < 0.61) {
			indexA = 2;
			indexB = 3;
			mixAmount = (t - 0.55) / 0.06;
		} else if (t < 0.80) {
			indexA = 3;
			indexB = 3;
			mixAmount = 0;
		} else {
			indexA = 3;
			indexB = 0;
			mixAmount = (t - 0.80) / 0.20;
		}

		mixAmount = THREE.MathUtils.smoothstep(mixAmount, 0, 1);

		this.skyMaterial.uniforms.textureA.value = this.skyTextures[indexA];
		this.skyMaterial.uniforms.textureB.value = this.skyTextures[indexB];
		this.skyMaterial.uniforms.mixAmount.value = mixAmount;

		this.skyMaterial.uniforms.bottomColorA.value.copy(this.bottomColors[indexA]);
		this.skyMaterial.uniforms.bottomColorB.value.copy(this.bottomColors[indexB]);
        this.skyMaterial.uniforms.nightFactor.value = nightFactor;
	}

	update(delta, camera = null) {
		this.time += delta * this.speed;

		const angle = this.time * Math.PI * 2;

		const sunX = Math.cos(angle) * this.radius;
		const sunY = Math.sin(angle) * this.radius;
		const sunZ = -10;

		const moonX = Math.cos(angle + Math.PI) * this.radius;
		const moonY = Math.sin(angle + Math.PI) * this.radius;
		const moonZ = -10;

		this.sunGroup.position.set(sunX, sunY, sunZ);
		this.moonGroup.position.set(moonX, moonY, moonZ);

		this.sun.position.set(0, 0, 0);
		this.moon.position.set(0, 0, 0);
		this.sunGlow.position.set(0, 0, 0);
		this.moonGlow.position.set(0, 0, 0);

		this.sunLight.position.copy(this.sunGroup.position);
		this.moonLight.position.copy(this.moonGroup.position);

		this.sunLight.target.position.set(0, 0, 0);
		this.moonLight.target.position.set(0, 0, 0);

		const sunHeight = THREE.MathUtils.clamp((sunY / this.radius + 1) / 2, 0, 1);
		const moonHeight = THREE.MathUtils.clamp((moonY / this.radius + 1) / 2, 0, 1);

		const daylight = THREE.MathUtils.smoothstep(sunHeight, 0.25, 0.75);
		const moonlight = THREE.MathUtils.smoothstep(moonHeight, 0.25, 0.75);

		this.sunGroup.visible = sunY > -2;
		this.moonGroup.visible = moonY > -2;

		this.sunGlow.material.opacity = 0.9 * daylight;
		this.moonGlow.material.opacity = 0.55 * moonlight * (1 - daylight);

		this.sunLight.intensity = sunY > 4 ? this.sunIntensity * daylight : 0;
		this.moonLight.intensity = this.moonIntensity * moonlight * (1 - daylight);

		this.ambientLight.intensity = THREE.MathUtils.lerp(
			this.ambientNightIntensity,
			this.ambientDayIntensity,
			daylight
		);

        this.hemiLight.intensity = THREE.MathUtils.lerp(0.02, 0.8, daylight);
		this.updateSky(camera);
	}
}