class collision {
  constructor(camera, map) {
    this.camera = camera;
    this.map = map;

    this.radius = 0.18;
    this.floorY = -0.75;
    this.playerHeight = 1.15;

    this.velocityY = 0;
    this.gravity = 0.014;
    this.jumpStrength = 0.22;
    this.onGround = true;

    this.jumpBuffer = 0;
    this.jumpBufferTime = 8;
  }

  jump() {
    this.jumpBuffer = this.jumpBufferTime;
  }

  tryJump() {
    if (this.jumpBuffer > 0 && this.onGround) {
      this.velocityY = this.jumpStrength;
      this.onGround = false;
      this.jumpBuffer = 0;
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
    }
  }

  cellHasTree(x, y, z) {
    return typeof treeExists === "function" && treeExists(x, y, z);
  }

  cellIsSolid(x, y, z) {
    return blockExists(x, y, z) || this.cellHasTree(x, y, z);
  }

  getGroundY() {
    let eye = this.camera.eye.elements;
    let x = eye[0];
    let z = eye[2];

    let highestGround = this.floorY;

    let checks = [
      [x - this.radius, z - this.radius],
      [x + this.radius, z - this.radius],
      [x - this.radius, z + this.radius],
      [x + this.radius, z + this.radius]
    ];

    for (let i = 0; i < checks.length; i++) {
      let mapX = Math.floor(checks[i][0] + BLOCK_OFFSET);
      let mapZ = Math.floor(checks[i][1] + BLOCK_OFFSET);

      if (mapX < 0 || mapX >= BLOCK_GRID_SIZE || mapZ < 0 || mapZ >= BLOCK_GRID_SIZE) {
        continue;
      }

      for (let y = 0; y < MAX_BLOCK_HEIGHT; y++) {
        if (blockExists(mapX, y, mapZ)) {
          let blockTop = this.floorY + y + 1.0;

          if (blockTop > highestGround) {
            highestGround = blockTop;
          }
        }
      }
    }

    return highestGround;
  }

  updateVertical() {
    let eye = this.camera.eye.elements;
    let at = this.camera.at.elements;

    eye[1] += this.velocityY;
    at[1] += this.velocityY;

    this.velocityY -= this.gravity;

    let groundY = this.getGroundY();
    let minEyeY = groundY + this.playerHeight;

    if (eye[1] <= minEyeY) {
      let difference = minEyeY - eye[1];

      eye[1] += difference;
      at[1] += difference;

      this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  isWallAt(x, z) {
    let mapX = Math.floor(x + BLOCK_OFFSET);
    let mapZ = Math.floor(z + BLOCK_OFFSET);

    if (mapX < 0 || mapX >= BLOCK_GRID_SIZE || mapZ < 0 || mapZ >= BLOCK_GRID_SIZE) {
      return false;
    }

    let eyeY = this.camera.eye.elements[1];
    let feetY = eyeY - this.playerHeight;

    for (let y = 0; y < MAX_BLOCK_HEIGHT; y++) {
      if (this.cellIsSolid(mapX, y, mapZ)) {
        let blockTop = this.floorY + y + 1.0;

        if (feetY < blockTop - 0.15) {
          return true;
        }
      }
    }

    return false;
  }

  hitsWallAt(x, z) {
    let r = this.radius;

    return (
      this.isWallAt(x - r, z - r) ||
      this.isWallAt(x + r, z - r) ||
      this.isWallAt(x - r, z + r) ||
      this.isWallAt(x + r, z + r)
    );
  }

  move(dx, dz) {
    let eye = this.camera.eye.elements;
    let at = this.camera.at.elements;

    this.tryJump();
    this.updateVertical();
    this.tryJump();

    let oldEyeX = eye[0];
    let oldEyeZ = eye[2];
    let oldAtX = at[0];
    let oldAtZ = at[2];

    eye[0] += dx;
    at[0] += dx;

    if (this.hitsWallAt(eye[0], eye[2])) {
      eye[0] = oldEyeX;
      at[0] = oldAtX;
    }

    eye[2] += dz;
    at[2] += dz;

    if (this.hitsWallAt(eye[0], eye[2])) {
      eye[2] = oldEyeZ;
      at[2] = oldAtZ;
    }

    this.camera.updateView();
  }
}