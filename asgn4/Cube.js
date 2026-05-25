class Cube{
  constructor(){
  this.type='cube';
  this.color = [1.0,1.0,1.0,1.0];
  this.matrix = new Matrix4();
  this.normalMatrix = new Matrix4();
  this.textureNum = -2;
  }

  render() {
    var rgba = this.color;

    if (g_normalViz) {
      gl.uniform1i(u_whichTexture, -3);
    } else {
      gl.uniform1i(u_whichTexture, this.textureNum);
    }

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    this.normalMatrix.setInverseOf(this.matrix);
    this.normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    // Front of cube (z=0), normal (0,0,-1)
    drawTriangle3DUVNormal([0,0,0,  1,1,0,  1,0,0],  [0,0, 1,1, 1,0],  [0,0,-1, 0,0,-1, 0,0,-1]);
    drawTriangle3DUVNormal([0,0,0,  0,1,0,  1,1,0],  [0,0, 0,1, 1,1],  [0,0,-1, 0,0,-1, 0,0,-1]);

    // Top of cube (y=1), normal (0,1,0)
    drawTriangle3DUVNormal([0,1,0,  0,1,1,  1,1,1],  [0,0, 0,1, 1,1],  [0,1,0, 0,1,0, 0,1,0]);
    drawTriangle3DUVNormal([0,1,0,  1,1,1,  1,1,0],  [0,0, 1,1, 1,0],  [0,1,0, 0,1,0, 0,1,0]);

    // Right of cube (x=1), normal (1,0,0)
    drawTriangle3DUVNormal([1,0,0,  1,1,0,  1,1,1],  [0,0, 0,1, 1,1],  [1,0,0, 1,0,0, 1,0,0]);
    drawTriangle3DUVNormal([1,0,0,  1,1,1,  1,0,1],  [0,0, 1,1, 1,0],  [1,0,0, 1,0,0, 1,0,0]);

    // Left of cube (x=0), normal (-1,0,0)
    drawTriangle3DUVNormal([0,0,0,  0,1,1,  0,1,0],  [0,0, 1,1, 0,1],  [-1,0,0, -1,0,0, -1,0,0]);
    drawTriangle3DUVNormal([0,0,0,  0,0,1,  0,1,1],  [0,0, 1,0, 1,1],  [-1,0,0, -1,0,0, -1,0,0]);

    // Back of cube (z=1), normal (0,0,1)
    drawTriangle3DUVNormal([0,0,1,  1,0,1,  1,1,1],  [0,0, 1,0, 1,1],  [0,0,1, 0,0,1, 0,0,1]);
    drawTriangle3DUVNormal([0,0,1,  1,1,1,  0,1,1],  [0,0, 1,1, 0,1],  [0,0,1, 0,0,1, 0,0,1]);

    // Bottom of cube (y=0), normal (0,-1,0)
    drawTriangle3DUVNormal([0,0,0,  1,0,0,  1,0,1],  [0,0, 1,0, 1,1],  [0,-1,0, 0,-1,0, 0,-1,0]);
    drawTriangle3DUVNormal([0,0,0,  1,0,1,  0,0,1],  [0,0, 1,1, 0,1],  [0,-1,0, 0,-1,0, 0,-1,0]);
  }
}