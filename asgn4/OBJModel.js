class OBJModel {
  constructor() {
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.normalMatrix = new Matrix4();
    this.vertices = [];
    this.normals  = [];
    this.mats     = [];
    this.loaded = false;
    this.uploaded = false;
    this.vBuf = null;
    this.nBuf = null;
    this.ranges = []; 
  }

  parse(text) {
    let positions = [], norms = [];
    let lines = text.split('\n');
    let curMat = 'Bark';
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('usemtl ')) {
        curMat = line.split(/\s+/)[1];
      } else if (line.startsWith('v ')) {
        let p = line.split(/\s+/);
        positions.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
      } else if (line.startsWith('vn ')) {
        let p = line.split(/\s+/);
        norms.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
      } else if (line.startsWith('f ')) {
        let parts = line.split(/\s+/).slice(1);
        let face = parts.map(tok => {
          let idx = tok.split('/');
          return { v: parseInt(idx[0]) - 1, n: idx[2] ? parseInt(idx[2]) - 1 : -1 };
        });
        for (let i = 1; i < face.length - 1; i++) {
          this.pushVert(positions, norms, face[0]);
          this.pushVert(positions, norms, face[i]);
          this.pushVert(positions, norms, face[i + 1]);
          this.mats.push(curMat);
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
      this.normals.push(0, 1, 0);
    }
  }

  upload() {
    let order = this.mats.map((m, i) => i).sort((a, b) =>
      this.mats[a] < this.mats[b] ? -1 : this.mats[a] > this.mats[b] ? 1 : 0);

    let v = new Float32Array(this.vertices.length);
    let n = new Float32Array(this.normals.length);
    this.ranges = [];
    let cursor = 0, runMat = null, runStart = 0;

    for (let k = 0; k < order.length; k++) {
      let t = order[k];                
      for (let j = 0; j < 9; j++) {
        v[cursor * 9 + j] = this.vertices[t * 9 + j];
        n[cursor * 9 + j] = this.normals[t * 9 + j];
      }
      let m = this.mats[t];
      if (m !== runMat) {
        if (runMat !== null) this.ranges.push({ mat: runMat, start: runStart * 3, count: (cursor - runStart) * 3 });
        runMat = m; runStart = cursor;
      }
      cursor++;
    }
    if (runMat !== null) this.ranges.push({ mat: runMat, start: runStart * 3, count: (cursor - runStart) * 3 });

    this.vBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuf);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

    this.nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, n, gl.STATIC_DRAW);

    this.uploaded = true;
  }

  render() {
    if (!this.loaded) return;
    if (!this.uploaded) this.upload();   // one-time GPU upload

    gl.uniform1i(u_whichTexture, g_normalViz ? -3 : this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    this.normalMatrix.setInverseOf(this.matrix);
    this.normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuf);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    const TRUNK = [0.40, 0.26, 0.13, 1.0];
    const LEAF  = [0.20, 0.50, 0.20, 1.0];
    for (let r of this.ranges) {
      let c = (r.mat === 'Tree') ? LEAF : TRUNK;
      gl.uniform4f(u_FragColor, c[0], c[1], c[2], c[3]);
      gl.drawArrays(gl.TRIANGLES, r.start, r.count);
    }
  }
}