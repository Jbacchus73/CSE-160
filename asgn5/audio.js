import * as THREE from 'three';

export default class AmbientAudio {
	constructor(camera, {
		path = './audio/nature.wav',
		volume = 0.5,
		loop = true,
	} = {}) {
		// the "ears" — attach to the camera so audio follows the listener
		this.listener = new THREE.AudioListener();
		camera.add(this.listener);

		// a non-positional (global) ambient sound
		this.sound = new THREE.Audio(this.listener);

		this.ready = false;

		const loader = new THREE.AudioLoader();
		loader.load(
			path,
			(buffer) => {
                console.log('buffer duration:', buffer.duration);

				this.sound.setBuffer(buffer);
				this.sound.setLoop(loop);
				this.sound.setVolume(volume);
				this.ready = true;
				console.log('Ambient audio loaded:', path);
				// if a gesture already happened, start now
				if (this._wantsPlay) this.play();
			},
			undefined,
			(err) => console.error('Failed to load ambient audio:', path, err)
		);
	}

	play() {
		const ctx = this.listener.context;

		if (!this.ready) {
			this._wantsPlay = true;
			return;
		}

		if (ctx.state === 'suspended') {
			ctx.resume().then(() => {
				if (!this.sound.isPlaying) this.sound.play();
                console.log('ctx state:', this.listener.context.state, 'volume:', this.sound.getVolume(), 'playing:', this.sound.isPlaying);

			});
		} else {
			if (!this.sound.isPlaying) this.sound.play();
            console.log('ctx state:', this.listener.context.state, 'volume:', this.sound.getVolume(), 'playing:', this.sound.isPlaying);

		}
	}

	pause() {
		if (this.sound.isPlaying) this.sound.pause();
	}

	setVolume(v) {
		this.sound.setVolume(v);
	}
}