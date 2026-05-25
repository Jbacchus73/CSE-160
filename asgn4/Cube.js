class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.normalMatrix = new Matrix4();
    this.textureNum = -2;
  }

  render() {
    if (!Cube.vertexBuffer || !Cube.uvBuffer || !Cube.normalBuffer) {
      initCubeBuffers();
    }

    var rgba = this.color;

    gl.uniform1i(u_whichTexture, g_normalViz ? -3 : this.textureNum);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    this.normalMatrix.setInverseOf(this.matrix);
    this.normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

function initCubeBuffers() {
  Cube.vertices = new Float32Array([
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
  ]);

  Cube.uvs = new Float32Array([
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
  ]);

  Cube.normals = new Float32Array([
    0,0,-1,  0,0,-1,  0,0,-1,
    0,0,-1,  0,0,-1,  0,0,-1,

    0,1,0,  0,1,0,  0,1,0,
    0,1,0,  0,1,0,  0,1,0,

    1,0,0,  1,0,0,  1,0,0,
    1,0,0,  1,0,0,  1,0,0,

    -1,0,0,  -1,0,0,  -1,0,0,
    -1,0,0,  -1,0,0,  -1,0,0,

    0,0,1,  0,0,1,  0,0,1,
    0,0,1,  0,0,1,  0,0,1,

    0,-1,0,  0,-1,0,  0,-1,0,
    0,-1,0,  0,-1,0,  0,-1,0
  ]);

  Cube.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, Cube.vertices, gl.STATIC_DRAW);

  Cube.uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, Cube.uvs, gl.STATIC_DRAW);

  Cube.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, Cube.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, Cube.normals, gl.STATIC_DRAW);
}