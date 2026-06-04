import * as THREE from 'three';

export default class AmbientAudio {
	constructor(camera, {
		path = './audio/nature.wav',
		volume = 0.5,
		loop = true,
		reverbAmount = 0.18,
		swellAmount = 0.12,
		swellSpeed = 0.35,
	} = {}) {
		this.listener = new THREE.AudioListener();
		camera.add(this.listener);

		this.drySound = new THREE.Audio(this.listener);
		this.wetSound = new THREE.Audio(this.listener);

		this.volume = volume;
		this.reverbAmount = reverbAmount;
		this.swellAmount = swellAmount;
		this.swellSpeed = swellSpeed;
		this.swellTime = 0;

		this.ready = false;
		this._wantsPlay = false;

		this.reverb = this.createReverbNode();

		this.wetSound.setFilter(this.reverb);

		const loader = new THREE.AudioLoader();

		loader.load(
			path,
			(buffer) => {
				this.drySound.setBuffer(buffer);
				this.drySound.setLoop(loop);
				this.drySound.setVolume(volume);

				this.wetSound.setBuffer(buffer);
				this.wetSound.setLoop(loop);
				this.wetSound.setVolume(volume * reverbAmount);

				this.ready = true;

				console.log('Ambient audio loaded:', path);
				console.log('buffer duration:', buffer.duration);

				if (this._wantsPlay) this.play();
			},
			undefined,
			(err) => console.error('Failed to load ambient audio:', path, err)
		);
	}

	createReverbNode() {
		const ctx = this.listener.context;
		const length = ctx.sampleRate * 1.2;
		const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

		for (let channel = 0; channel < 2; channel++) {
			const data = impulse.getChannelData(channel);

			for (let i = 0; i < length; i++) {
				const decay = Math.pow(1 - i / length, 2.2);
				data[i] = (Math.random() * 2 - 1) * decay;
			}
		}

		const convolver = ctx.createConvolver();
		convolver.buffer = impulse;

		return convolver;
	}

	play() {
		const ctx = this.listener.context;

		this._wantsPlay = true;

		if (!this.ready) {
			console.log('Audio not ready yet');
			return;
		}

		const start = () => {
			if (!this.drySound.isPlaying) this.drySound.play();
			if (!this.wetSound.isPlaying) this.wetSound.play();

			console.log(
				'ctx state:',
				ctx.state,
				'dry volume:',
				this.drySound.getVolume(),
				'wet volume:',
				this.wetSound.getVolume(),
				'playing:',
				this.drySound.isPlaying
			);
		};

		if (ctx.state === 'suspended') {
			ctx.resume().then(start);
		} else {
			start();
		}
	}

	pause() {
		if (this.drySound.isPlaying) this.drySound.pause();
		if (this.wetSound.isPlaying) this.wetSound.pause();
	}

	setVolume(v) {
		this.volume = v;
		this.drySound.setVolume(v);
		this.wetSound.setVolume(v * this.reverbAmount);
	}

	update(delta) {
		if (!this.ready) return;

		this.swellTime += delta * this.swellSpeed;

		const swell = 1 + Math.sin(this.swellTime * Math.PI * 2) * this.swellAmount;

		this.drySound.setVolume(this.volume * swell);
		this.wetSound.setVolume(this.volume * this.reverbAmount * swell);
	}
}