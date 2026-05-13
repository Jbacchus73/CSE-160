class TerrainGenerator {
  constructor(size) {
    this.size = size;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  smooth(t) {
    return t * t * (3 - 2 * t);
  }

  random2D(x, z) {
    let n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  valueNoise(x, z) {
    let x0 = Math.floor(x);
    let z0 = Math.floor(z);
    let x1 = x0 + 1;
    let z1 = z0 + 1;

    let sx = this.smooth(x - x0);
    let sz = this.smooth(z - z0);

    let n00 = this.random2D(x0, z0);
    let n10 = this.random2D(x1, z0);
    let n01 = this.random2D(x0, z1);
    let n11 = this.random2D(x1, z1);

    let ix0 = this.lerp(n00, n10, sx);
    let ix1 = this.lerp(n01, n11, sx);

    return this.lerp(ix0, ix1, sz);
  }

  fbm(x, z) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let max = 0;

    for (let i = 0; i < 4; i++) {
      total += this.valueNoise(x * frequency, z * frequency) * amplitude;
      max += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / max;
  }

  generate() {
    g_blocks = [];
    g_blockCubes = [];
    g_blockSet = new Set();

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        let worldX = x - BLOCK_OFFSET;
        let worldZ = z - BLOCK_OFFSET;

        let height = Math.floor(this.fbm(x * 0.06, z * 0.06) * 4);

        if (Math.abs(worldX) < 4 && Math.abs(worldZ) < 4) {
          height = 0;
        }

        for (let y = 0; y <= height; y++) {
          addBlockAt(x, y, z);
        }
      }
    }
  }
}