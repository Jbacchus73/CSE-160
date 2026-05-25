class OBJModel {
  constructor() {
    this.matrix = new Matrix4();
    this.color = [0.4, 0.55, 0.3, 1.0];
    this.textureNum = -2;
    this.normalMatrix = new Matrix4();
    this.vertices = []; 
    this.normals  = []; 
    this.loaded = false;
  }

  parse(text) {
    let positions = [];
    let norms = [];
    let lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('v ')) {
        let p = line.split(/\s+/);
        positions.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
      } else if (line.startsWith('vn ')) {
        let p = line.split(/\s+/);
        norms.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
      } else if (line.startsWith('f ')) {
        let parts = line.split(/\s+/).slice(1);   // the face verts
        // parse each "v/vt/vn" into {v, n} 0-based
        let face = parts.map(tok => {
          let idx = tok.split('/');
          return {
            v: parseInt(idx[0]) - 1,
            n: idx[2] ? parseInt(idx[2]) - 1 : -1
          };
        });
        for (let i = 1; i < face.length - 1; i++) {
          this.pushVert(positions, norms, face[0]);
          this.pushVert(positions, norms, face[i]);
          this.pushVert(positions, norms, face[i + 1]);
        }
      }
    }
    this.loaded = true;
  }

  pushVert(positions, norms, f) {
    let p = positions[f.v];
    this.vertices.push(p[0], p[1], p[2]);
    if (f.n >= 0 && norms[f.n]) {
      let n = norms[f.n];
      this.normals.push(n[0], n[1], n[2]);
    } else {
      this.normals.push(0, 1, 0);  // fallback
    }
  }

  render() {
    if (!this.loaded) return;
    gl.uniform1i(u_whichTexture, g_normalViz ? -3 : this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    this.normalMatrix.setInverseOf(this.matrix);
    this.normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    const TRUNK = [0.40, 0.26, 0.13, 1.0];
    const LEAF  = [0.20, 0.50, 0.20, 1.0];

    for (let i = 0; i < this.vertices.length; i += 9) {
        let v = this.vertices.slice(i, i + 9);
        let n = this.normals.slice(i, i + 9);
        let avgY = (v[1] + v[4] + v[7]) / 3;        // mean Y of the triangle
        let c = avgY < 10.0 ? TRUNK : LEAF;
        gl.uniform4f(u_FragColor, c[0], c[1], c[2], c[3]);
        drawTriangle3DUVNormal(v, [0,0, 0,0, 0,0], n);
        }
    }
}