class Cone {
  constructor() {
    this.type = 'cone';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 10;
  }

  render() {
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    let angleStep = 360 / this.segments;

    for (let angle = 0; angle < 360; angle += angleStep) {
      let angle1 = angle;
      let angle2 = angle + angleStep;

      let x1 = Math.cos(angle1 * Math.PI / 180) * 0.5;
      let z1 = Math.sin(angle1 * Math.PI / 180) * 0.5;
      let x2 = Math.cos(angle2 * Math.PI / 180) * 0.5;
      let z2 = Math.sin(angle2 * Math.PI / 180) * 0.5;

      drawTriangle3D([
        0, 0.5, 0,
        x1, -0.5, z1,
        x2, -0.5, z2
      ]);

      drawTriangle3D([
        0, -0.5, 0,
        x2, -0.5, z2,
        x1, -0.5, z1
      ]);
    }
  }
}