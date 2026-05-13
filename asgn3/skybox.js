class SkyBox {
  constructor(textureNum) {
    this.textureNum = textureNum;
    this.radius = 80;
    this.latSteps = 10;
    this.lonSteps = 20;
    this.vertexBuffer = null;
    this.uvBuffer = null;
    this.vertexCount = 0;
    this.matrix = new Matrix4();

    this.init();
  }

  point(r, phi, theta) {
    return [
      r * Math.cos(phi) * Math.sin(theta),
      r * Math.sin(phi),
      r * Math.cos(phi) * Math.cos(theta)
    ];
  }

  init() {
    let vertices = [];
    let uvs = [];

    for (let lat = 0; lat < this.latSteps; lat++) {
      let phi1 = -Math.PI / 2 + lat * Math.PI / this.latSteps;
      let phi2 = -Math.PI / 2 + (lat + 1) * Math.PI / this.latSteps;

      for (let lon = 0; lon < this.lonSteps; lon++) {
        let theta1 = lon * 2 * Math.PI / this.lonSteps;
        let theta2 = (lon + 1) * 2 * Math.PI / this.lonSteps;

        let p1 = this.point(this.radius, phi1, theta1);
        let p2 = this.point(this.radius, phi2, theta1);
        let p3 = this.point(this.radius, phi2, theta2);
        let p4 = this.point(this.radius, phi1, theta2);

        let u1 = lon / this.lonSteps;
        let u2 = (lon + 1) / this.lonSteps;
        let v1 = lat / this.latSteps;
        let v2 = (lat + 1) / this.latSteps;

        vertices.push(p1[0],p1[1],p1[2], p2[0],p2[1],p2[2], p3[0],p3[1],p3[2]);
        uvs.push(u1,v1, u1,v2, u2,v2);

        vertices.push(p1[0],p1[1],p1[2], p3[0],p3[1],p3[2], p4[0],p4[1],p4[2]);
        uvs.push(u1,v1, u2,v2, u2,v1);
      }
    }

    this.vertexCount = vertices.length / 3;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  }

  render() {
    gl.depthMask(false);
    gl.disable(gl.DEPTH_TEST);

    gl.uniform1i(u_whichTexture, this.textureNum);

    let identity = new Matrix4();
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identity.elements);

    this.matrix.setTranslate(
      g_camera.eye.elements[0],
      g_camera.eye.elements[1],
      g_camera.eye.elements[2]
    );

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }
}