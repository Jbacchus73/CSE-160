import * as THREE from 'three';

export default class SpeakerAudio {
	constructor(listener, {
		tracks = [],          // array of file paths (your 6 songs)
		volume = 0.8,
		refDistance = 2,      // distance at which volume is "full"
		maxDistance = 25,     // beyond this, no further falloff
		rolloffFactor = 1.6,  // how fast it fades with distance
		loop = false,         // loop the single track? (false = advance playlist)
	} = {}) {
		this.listener = listener;
		this.tracks = tracks;
		this.volume = volume;
		this.refDistance = refDistance;
		this.maxDistance = maxDistance;
		this.rolloffFactor = rolloffFactor;
		this.loop = loop;

		this.emitters = [];       // PositionalAudio objects (one per speaker)
		this.currentIndex = 0;
		this.buffers = [];        // loaded AudioBuffers, lazy
		this.isPlaying = false;
		this._wantsPlay = false;

		this.audioLoader = new THREE.AudioLoader();
	}

	// attach a positional emitter to a speaker mesh/group
	attachToSpeaker(object3D) {
		const sound = new THREE.PositionalAudio(this.listener);
		sound.setRefDistance(this.refDistance);
		sound.setMaxDistance(this.maxDistance);
		sound.setRolloffFactor(this.rolloffFactor);
		sound.setDistanceModel('exponential'); // natural falloff
		sound.setVolume(this.volume);
		sound.setLoop(this.loop);

		object3D.add(sound);   // emitter now lives at the speaker's position
		this.emitters.push(sound);
		return sound;
	}

	_loadBuffer(index) {
		return new Promise((resolve, reject) => {
			if (this.buffers[index]) {
				resolve(this.buffers[index]);
				return;
			}
			this.audioLoader.load(
				this.tracks[index],
				(buffer) => {
					this.buffers[index] = buffer;
					resolve(buffer);
				},
				undefined,
				(err) => reject(err)
			);
		});
	}

	async _setTrack(index) {
		if (this.emitters.length === 0) return;

		// stop current
		for (const e of this.emitters) {
			if (e.isPlaying) e.stop();
		}

		const buffer = await this._loadBuffer(index);

		for (const e of this.emitters) {
			e.setBuffer(buffer);
			e.setLoop(this.loop);
		}

		this.currentIndex = index;

		// when a non-looping track ends, advance to the next.
		// Three.js sets the emitter's isPlaying = false before calling onEnded,
		// so we don't touch it ourselves here.
		if (!this.loop) {
			const primary = this.emitters[0];
			primary.onEnded = () => {
				if (this.isPlaying) this.next();
			};
		}
	}

	async play() {
		this._wantsPlay = true;
		const ctx = this.listener.context;
		if (ctx.state === 'suspended') await ctx.resume();

		if (!this.emitters[0] || !this.emitters[0].buffer) {
			await this._setTrack(this.currentIndex);
		}

		for (const e of this.emitters) {
			if (!e.isPlaying) e.play();
		}
		this.isPlaying = true;
	}

	pause() {
		for (const e of this.emitters) {
			if (e.isPlaying) e.pause();
		}
		this.isPlaying = false;
	}

	stop() {
		for (const e of this.emitters) {
			if (e.isPlaying) e.stop();
		}
		this.isPlaying = false;
	}

	async next() {
		const index = (this.currentIndex + 1) % this.tracks.length;
		await this._setTrack(index);
		if (this.isPlaying) {
			for (const e of this.emitters) e.play();
		}
	}

	async prev() {
		const index = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
		await this._setTrack(index);
		if (this.isPlaying) {
			for (const e of this.emitters) e.play();
		}
	}

	setVolume(v) {
		this.volume = v;
		for (const e of this.emitters) e.setVolume(v);
	}
}