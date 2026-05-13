// Cube.js — CSE 160 Assignment 3
// Optimized: batched geometry + static GPU buffers (uploaded once, reused every frame)

const CUBE_VERTS = [
  0,0,0,  1,1,0,  1,0,0,
  0,0,0,  0,1,0,  1,1,0,
  0,1,0,  0,1,1,  1,1,1,
  0,1,0,  1,1,1,  1,1,0,

  1,0,0,  1,1,0,  1,1,1,
  1,0,0,  1,1,1,  1,0,1,
  0,0,0,  0,1,1,  0,1,0,
  0,0,0,  0,0,1,  0,1,1,

  0,0,1,  1,0,1,  1,1,1,
  0,0,1,  1,1,1,  0,1,1,
  0,0,0,  1,0,0,  1,0,1,
  0,0,0,  1,0,1,  0,0,1
];

const CUBE_UVS = [
  0,0,  1,1,  1,0,
  0,0,  0,1,  1,1,

  0,0,  0,1,  1,1,
  0,0,  1,1,  1,0,

  0,0,  0,1,  1,1,
  0,0,  1,1,  1,0,

  0,0,  1,1,  0,1,
  0,0,  1,0,  1,1,

  0,0,  1,0,  1,1,
  0,0,  1,1,  0,1,

  0,0,  1,0,  1,1,
  0,0,  1,1,  0,1
];

let g_cubeVertexBuffer = null;
let g_cubeUVBuffer     = null;

function initCubeBuffers() {
  g_cubeVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(CUBE_VERTS), gl.STATIC_DRAW);

  g_cubeUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(CUBE_UVS), gl.STATIC_DRAW);
}

class Cube {
  constructor() {
    this.type       = 'cube';
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = 0;
  }

  render() {
    this.renderFast();
  }

  renderFast() {
    if (this.textureNum !== g_lastTextureNum) {
      gl.uniform1i(u_whichTexture, this.textureNum);
      g_lastTextureNum = this.textureNum;
    }
    var rgba = this.color;

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);


    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}