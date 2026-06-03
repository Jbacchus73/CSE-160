import * as THREE from 'three';

const FORWARD = 1 << 0;
const LEFT = 1 << 1;
const RIGHT = 1 << 2;
const BACK = 1 << 3;
const UP = 1 << 4;
const DOWN = 1 << 5;
const SPRINT = 1 << 6;

const MOVESPEED = 5;
const FRICTION = 0.85;
const LOOKSPEED = 0.0025;
const SPRINTMULT = 2;

const KEYMAPPING = {
	87: 'FORWARD',
	83: 'BACK',
	65: 'LEFT',
	68: 'RIGHT',
	32: 'UP',
	67: 'DOWN',
	16: 'SPRINT',
};

export default class SpectatorControls {
	constructor(camera, domElement, {
		lookSpeed = LOOKSPEED,
		moveSpeed = MOVESPEED,
		friction = FRICTION,
		keyMapping = KEYMAPPING,
		sprintMultiplier = SPRINTMULT,
	} = {}) {
		this.camera = camera;
		this.domElement = domElement;
		this.lookSpeed = lookSpeed;
		this.moveSpeed = moveSpeed;
		this.friction = friction;
		this.sprintMultiplier = sprintMultiplier;
		this.keyMapping = Object.assign({}, KEYMAPPING, keyMapping);
		this.enabled = false;
		this.dragging = false;
		this._mouseState = { x: 0, y: 0 };
		this._keyState = { press: 0 };
		this._moveState = { velocity: new THREE.Vector3(0, 0, 0) };

		this._onMouseDown = this._onMouseDown.bind(this);
		this._onMouseUp = this._onMouseUp.bind(this);
		this._onMouseLeave = this._onMouseLeave.bind(this);
		this._onMouseMove = this._onMouseMove.bind(this);
		this._onKeyEvent = this._onKeyEvent.bind(this);
		this._onContextMenu = this._onContextMenu.bind(this);
	}

	_onMouseDown(event) {
		if (!this.enabled) return;
		if (event.button === 0) {
			this.dragging = true;
			this.domElement.requestPointerLock?.();
			event.preventDefault();
		}
	}

	_onMouseUp() {
		this.dragging = false;
		document.exitPointerLock?.();
	}

	_onMouseLeave() {
		this.dragging = false;
	}

	_onMouseMove(event) {
		if (!this.enabled || !this.dragging) return;

		this._mouseState.x += event.movementX || 0;
		this._mouseState.y += event.movementY || 0;
	}

	_onContextMenu(event) {
		event.preventDefault();
	}

	_onKeyEvent(event) {
		if (!this.enabled) return;
		this._processKey(event.keyCode, event.type === 'keydown');
	}

	_processKey(key, isPressed) {
		const { press } = this._keyState;
		let newPress = press;

		switch (this.keyMapping[key]) {
			case 'FORWARD':
				isPressed ? newPress |= FORWARD : newPress &= ~FORWARD;
				break;
			case 'BACK':
				isPressed ? newPress |= BACK : newPress &= ~BACK;
				break;
			case 'LEFT':
				isPressed ? newPress |= LEFT : newPress &= ~LEFT;
				break;
			case 'RIGHT':
				isPressed ? newPress |= RIGHT : newPress &= ~RIGHT;
				break;
			case 'UP':
				isPressed ? newPress |= UP : newPress &= ~UP;
				break;
			case 'DOWN':
				isPressed ? newPress |= DOWN : newPress &= ~DOWN;
				break;
			case 'SPRINT':
				isPressed ? newPress |= SPRINT : newPress &= ~SPRINT;
				break;
		}

		this._keyState.press = newPress;
	}

	enable() {
		this.enabled = true;
		this.camera.rotation.reorder('YXZ');

		this.domElement.addEventListener('mousedown', this._onMouseDown);
		this.domElement.addEventListener('mousemove', this._onMouseMove);
		this.domElement.addEventListener('mouseleave', this._onMouseLeave);
		this.domElement.addEventListener('contextmenu', this._onContextMenu);
		document.addEventListener('mouseup', this._onMouseUp);
		document.addEventListener('keydown', this._onKeyEvent);
		document.addEventListener('keyup', this._onKeyEvent);
	}

	disable() {
		this.enabled = false;
		this.dragging = false;
		this._keyState.press = 0;
		this._mouseState = { x: 0, y: 0 };

		this.domElement.removeEventListener('mousedown', this._onMouseDown);
		this.domElement.removeEventListener('mousemove', this._onMouseMove);
		this.domElement.removeEventListener('mouseleave', this._onMouseLeave);
		this.domElement.removeEventListener('contextmenu', this._onContextMenu);
		document.removeEventListener('mouseup', this._onMouseUp);
		document.removeEventListener('keydown', this._onKeyEvent);
		document.removeEventListener('keyup', this._onKeyEvent);

		document.exitPointerLock?.();
		this.camera.rotation.reorder('XYZ');
	}

	dispose() {
		this.disable();
	}

	update(delta = 1) {
		if (!this.enabled) return;

		const lon = this._mouseState.x * this.lookSpeed;
		const lat = this._mouseState.y * this.lookSpeed;

		this.camera.rotation.x = Math.max(
			Math.min(this.camera.rotation.x - lat, Math.PI / 2),
			-Math.PI / 2
		);

		this.camera.rotation.y -= lon;
		this._mouseState = { x: 0, y: 0 };

		let actualMoveSpeed = this.moveSpeed * delta;
		const velocity = new THREE.Vector3(0, 0, 0);
		const { press } = this._keyState;

		if (press & SPRINT) actualMoveSpeed *= this.sprintMultiplier;
		if (press & FORWARD) velocity.z -= actualMoveSpeed;
		if (press & BACK) velocity.z += actualMoveSpeed;
		if (press & LEFT) velocity.x -= actualMoveSpeed;
		if (press & RIGHT) velocity.x += actualMoveSpeed;
		if (press & UP) velocity.y += actualMoveSpeed;
		if (press & DOWN) velocity.y -= actualMoveSpeed;

		this._moveState.velocity.lerp(velocity, 1 - this.friction);

		this.camera.translateX(this._moveState.velocity.x);
		this.camera.translateY(this._moveState.velocity.y);
		this.camera.translateZ(this._moveState.velocity.z);
	}
}