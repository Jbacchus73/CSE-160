class Camera {
  constructor() {
    this.fov      = 60;
    this.eye = new Vector3([-2.5, 0.4, -2.5]);
    this.at  = new Vector3([-2.5, 0.4, -1.5]);
    this.up       = new Vector3([0, 1.0, 0.0]);
  
    this.speed    = 0.1;   
    this.panAngle = 3;  
 
    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
 
    this.updateView();
    this.updateProjection();
  }
 
  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }
 
  updateProjection() {
    this.projectionMatrix.setPerspective(
      this.fov,
      canvas.width / canvas.height,
      0.1, 5000
    );
  }
 
  _forwardVector() {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    return f;
  }
 
  _cross(a, b) {
    let r = new Vector3();
    let ax = a.elements[0], ay = a.elements[1], az = a.elements[2];
    let bx = b.elements[0], by = b.elements[1], bz = b.elements[2];
    r.elements[0] = ay * bz - az * by;
    r.elements[1] = az * bx - ax * bz;
    r.elements[2] = ax * by - ay * bx;
    return r;
  }
 
  _shift(v) {
    this.eye.elements[0] += v.elements[0];
    this.eye.elements[1] += v.elements[1];
    this.eye.elements[2] += v.elements[2];
    this.at.elements[0]  += v.elements[0];
    this.at.elements[1]  += v.elements[1];
    this.at.elements[2]  += v.elements[2];
  }
 
  // ---- movement methods (per the spec) ----
  moveForward() {
    let f = this._forwardVector();
    f.normalize();
    f.mul(this.speed);
    this._shift(f);
    this.updateView();
  }
 
  moveBackwards() {
    let b = new Vector3();
    b.set(this.eye);
    b.sub(this.at);
    b.normalize();
    b.mul(this.speed);
    this._shift(b);
    this.updateView();
  }
 
  moveLeft() {
    let f = this._forwardVector();
    let s = this._cross(this.up, f);   // s = up × f
    s.normalize();
    s.mul(this.speed);
    this._shift(s);
    this.updateView();
  }
 
  moveRight() {
    let f = this._forwardVector();
    let s = this._cross(f, this.up);   // s = f × up
    s.normalize();
    s.mul(this.speed);
    this._shift(s);
    this.updateView();
  }
 
  panLeft() {
    let f = this._forwardVector();
    let rotMat = new Matrix4();
    rotMat.setRotate(this.panAngle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let f_prime = rotMat.multiplyVector3(f);
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    this.updateView();
  }
 
  panRight() {
    let f = this._forwardVector();
    let rotMat = new Matrix4();
    rotMat.setRotate(-this.panAngle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let f_prime = rotMat.multiplyVector3(f);
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    this.updateView();
  }
 
  rotateMouse(dx, dy) {
    let f = this._forwardVector();
 
    let yawMat = new Matrix4();
    yawMat.setRotate(-dx, 0, 1, 0);
    f = yawMat.multiplyVector3(f);
 
    let right = this._cross(f, this.up);
    right.normalize();
    let pitchMat = new Matrix4();
    pitchMat.setRotate(-dy, right.elements[0], right.elements[1], right.elements[2]);
    f = pitchMat.multiplyVector3(f);
 
    this.at.elements[0] = this.eye.elements[0] + f.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f.elements[2];
    this.updateView();
  }
}