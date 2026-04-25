// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`;


// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() { 
    gl_FragColor = u_FragColor;
  }`;



let canvas; 
let gl; 
let a_Position;
let u_FragColor;

let u_ModelMatrix; 
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;

let g_keys = {};
let g_cameraX = 0;
let g_cameraY = 0.4;
let g_cameraZ = 3.0;
let g_lookX = 0;
let g_lookY = 0;
let g_lookZ = 0;
let g_cameraSpeed = 0.08;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('BlockyAnimal');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST); 

}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }
  
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }


  var identityM = new Matrix4(); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);


} 


let g_globalAngle = 0;
let g_yellowAngle = 0; 
let g_magentaAngle = 0;
let g_clawAngle = 0;
let g_yellowAnimation = false;
let g_globalAngleY = 0;
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_maxPitch = 80;
let g_cameraYaw = -90;
let g_cameraPitch = 0;
let g_mouseSensitivity = 0.25;

let grassBlades = [];

for (let i = 0; i < 500; i++) {
  grassBlades.push({
    x: -2.4 + Math.random() * 4.8,
    z: -2.4 + Math.random() * 4.8,
    h: 0.04 + Math.random() * 0.08,
    r: Math.random() * 40 - 20,
    shade: 0.55 + Math.random() * 0.25
  });
}


function addActionsForHtmIUI(){
  //Color Slider Events

  document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation=false;};
  document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation=true;};
  document.getElementById('magentaSlide').addEventListener('input', function() { g_magentaAngle = this.value; renderAllshapes(); });
  document.getElementById('yellowSlide').addEventListener('input', function() { g_yellowAngle = this.value; renderAllshapes(); });
  document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = this.value; renderAllshapes(); });

  // Camera Controls 

  canvas.onmousedown = function(ev) {
  if (ev.button === 1) {               
    g_mouseDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    ev.preventDefault();
  }
};

canvas.onmouseup = function(ev) {
  if (ev.button === 1) g_mouseDragging = false;
};

canvas.onmouseleave = function(ev) {
  g_mouseDragging = false;
};

canvas.onmousemove = function(ev) {
  if (!g_mouseDragging) return;

  let dx = ev.clientX - g_lastMouseX;
  let dy = ev.clientY - g_lastMouseY;

  g_cameraYaw += dx * g_mouseSensitivity;
  g_cameraPitch -= dy * g_mouseSensitivity;

  if (g_cameraPitch > 89) {
    g_cameraPitch = 89;
  }

  if (g_cameraPitch < -89) {
    g_cameraPitch = -89;
  }

  updateLookDirection();

  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;

  ev.preventDefault();
};

canvas.onauxclick = function(ev) {
  ev.preventDefault();
};

canvas.oncontextmenu = function(ev) {
  ev.preventDefault();
};

document.onkeydown = function(ev) {
  g_keys[ev.key.toLowerCase()] = true;
};

document.onkeyup = function(ev) {
  g_keys[ev.key.toLowerCase()] = false;
};

}

function camera(){
  var viewMat = new Matrix4();

  viewMat.setLookAt(g_cameraX, g_cameraY, g_cameraZ, g_lookX, g_lookY, g_lookZ, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var projMat = new Matrix4();

  projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);
}

function cameraHelper(){
  let moveSpeed = 0.04;

  let forwardX = g_lookX - g_cameraX;
  let forwardY = g_lookY - g_cameraY;
  let forwardZ = g_lookZ - g_cameraZ;

  let len = Math.sqrt(
    forwardX * forwardX +
    forwardY * forwardY +
    forwardZ * forwardZ
  );

  if (len > 0) {
    forwardX /= len;
    forwardY /= len;
    forwardZ /= len;
  }

  let rightX = -forwardZ;
  let rightZ = forwardX;

  if (g_keys['w']) {
    g_cameraX += forwardX * moveSpeed;
    g_cameraY += forwardY * moveSpeed;
    g_cameraZ += forwardZ * moveSpeed;
  }

  if (g_keys['s']) {
    g_cameraX -= forwardX * moveSpeed;
    g_cameraY -= forwardY * moveSpeed;
    g_cameraZ -= forwardZ * moveSpeed;
  }

  if (g_keys['a']) {
    g_cameraX -= rightX * moveSpeed;
    g_cameraZ -= rightZ * moveSpeed;
  }

  if (g_keys['d']) {
    g_cameraX += rightX * moveSpeed;
    g_cameraZ += rightZ * moveSpeed;
  }

  if (g_keys['q']) {
    g_cameraY += moveSpeed;
  }

  if (g_keys['e']) {
    g_cameraY -= moveSpeed;
  }

  updateLookDirection();
}

function updateLookDirection() {
  let yawRad = g_cameraYaw * Math.PI / 180;
  let pitchRad = g_cameraPitch * Math.PI / 180;

  let dirX = Math.cos(pitchRad) * Math.cos(yawRad);
  let dirY = Math.sin(pitchRad);
  let dirZ = Math.cos(pitchRad) * Math.sin(yawRad);

  g_lookX = g_cameraX + dirX;
  g_lookY = g_cameraY + dirY;
  g_lookZ = g_cameraZ + dirZ;
}


function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  addActionsForHtmIUI();
  updateLookDirection();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.53, 0.81, 0.92, 1.0);

  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(tick); 
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick(){
  g_seconds = performance.now()/1000.0 - g_startTime;

  cameraHelper(); 
  renderAllshapes();
  requestAnimationFrame(tick); 
}

function updateAnimationAngles(){

}

function renderAllshapes(){
  var startTime = performance.now();
  camera();

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var ground = new Cube();
  ground.color = [0.18, 0.42, 0.12, 1.0];
  ground.matrix.setTranslate(0, -0.27, 0);
  ground.matrix.scale(5.0, 0.08, 5.0);
  ground.matrix.translate(-0.5, -0.5, -0.5);
  ground.render();

  for (let i = 0; i < grassBlades.length; i++) {
  var blade = new Cube();

  let shade = grassBlades[i].shade;
  blade.color = [0.45, shade, 0.28, 1.0];

  blade.matrix.setTranslate(
    grassBlades[i].x,
    -0.22,
    grassBlades[i].z
  );

  blade.matrix.rotate(grassBlades[i].r, 0, 0, 1);
  blade.matrix.scale(0.012, grassBlades[i].h, 0.012);
  blade.matrix.translate(-0.5, -0.5, -0.5);
  blade.render();
}

  const FUR = [0.55, 0.42, 0.30, 1.0];

  var body = new Cube();
  body.color = FUR;
  body.matrix.setTranslate(0, 0, 0);
  body.matrix.scale(0.4, 0.35, 0.6);
  body.matrix.translate(-0.5, -0.5, -0.5);
  body.render();

  var bodyTop = new Cube();
  bodyTop.color = FUR;
  bodyTop.matrix.setTranslate(0, 0.18, 0);
  bodyTop.matrix.scale(0.34, 0.04, 0.54);
  bodyTop.matrix.translate(-0.5, -0.5, -0.5);
  bodyTop.render();

  var bodyCrown = new Cube();
  bodyCrown.color = FUR;
  bodyCrown.matrix.setTranslate(0, 0.21, 0);
  bodyCrown.matrix.scale(0.28, 0.03, 0.48);
  bodyCrown.matrix.translate(-0.5, -0.5, -0.5);
  bodyCrown.render();

  var bodyBottom = new Cube();
  bodyBottom.color = FUR;
  bodyBottom.matrix.setTranslate(0, -0.18, 0);
  bodyBottom.matrix.scale(0.34, 0.04, 0.54);
  bodyBottom.matrix.translate(-0.5, -0.5, -0.5);
  bodyBottom.render();

  var bodyKeel = new Cube();
  bodyKeel.color = FUR;
  bodyKeel.matrix.setTranslate(0, -0.21, 0);
  bodyKeel.matrix.scale(0.28, 0.03, 0.48);
  bodyKeel.matrix.translate(-0.5, -0.5, -0.5);
  bodyKeel.render();

  var bodyLeft = new Cube();
  bodyLeft.color = FUR;
  bodyLeft.matrix.setTranslate(-0.2, 0, 0);
  bodyLeft.matrix.scale(0.04, 0.3, 0.54);
  bodyLeft.matrix.translate(-0.5, -0.5, -0.5);
  bodyLeft.render();

  var bodyRight = new Cube();
  bodyRight.color = FUR;
  bodyRight.matrix.setTranslate(0.2, 0, 0);
  bodyRight.matrix.scale(0.04, 0.3, 0.54);
  bodyRight.matrix.translate(-0.5, -0.5, -0.5);
  bodyRight.render();

  var bodyFront = new Cube();
  bodyFront.color = FUR;
  bodyFront.matrix.setTranslate(0, 0, 0.29);
  bodyFront.matrix.scale(0.34, 0.3, 0.04);
  bodyFront.matrix.translate(-0.5, -0.5, -0.5);
  bodyFront.render();

  var bodyBack = new Cube();
  bodyBack.color = FUR;
  bodyBack.matrix.setTranslate(0, 0, -0.29);
  bodyBack.matrix.scale(0.34, 0.3, 0.04);
  bodyBack.matrix.translate(-0.5, -0.5, -0.5);
  bodyBack.render();

  var neck = new Cube(); 
  neck.color = FUR; 
  neck.matrix.setTranslate(0, -0.03, 0.28); 
  neck.matrix.scale(0.28, 0.28, 0.2); 
  neck.matrix.translate(-0.5,-0.5,-0.5);
  neck.render(); 

  var tail = new Cube(); 
  tail.color = FUR; 
  tail.matrix.setTranslate(0, -0.01, -0.3); 
  tail.matrix.rotate(-30,1,0,0); 
  tail.matrix.scale(0.13, 0.1, 0.2); 
  tail.matrix.translate(-0.5,-0.5,-0.5);
  tail.render(); 

  var belly = new Cube(); 
  belly.color = [0.72, 0.64, 0.55, 1.0];
  belly.matrix.setTranslate(0, -0.21, 0);
  belly.matrix.scale(0.32, 0.04, 0.5);
  belly.matrix.translate(-0.5,-0.5,-0.5);
  belly.render(); 
    
  var flShoulder = new Cube(); 
  flShoulder.color = FUR; 
  flShoulder.matrix.setTranslate(-0.16, 0.08, 0.15);
  flShoulder.matrix.scale(.14,.14,.14); 
  flShoulder.matrix.translate(-0.5,-0.5,-0.5);
  flShoulder.render(); 

  var frShoulder = new Cube(); 
  frShoulder.color = FUR; 
  frShoulder.matrix.setTranslate(0.16, 0.08, 0.15);
  frShoulder.matrix.scale(.14,.14,.14); 
  frShoulder.matrix.translate(-0.5,-0.5,-0.5);
  frShoulder.render();

  var blHip = new Cube(); 
  blHip.color = FUR; 
  blHip.matrix.setTranslate(-0.16, 0.08, -0.15);
  blHip.matrix.scale(.14,.14,.14); 
  blHip.matrix.translate(-0.5,-0.5,-0.5);
  blHip.render();

  var brHip = new Cube(); 
  brHip.color = FUR; 
  brHip.matrix.setTranslate(0.16, 0.08, -0.15);
  brHip.matrix.scale(.14,.14,.14); 
  brHip.matrix.translate(-0.5,-0.5,-0.5);
  brHip.render();

  var head = new Cube(); 
  head.color = FUR; 
  head.matrix.setTranslate(0, -0.02, 0.5);
  head.matrix.scale(0.42, 0.38, 0.3);
  head.matrix.translate(-0.5, -0.5, -0.5);
  head.render();

  var headTop = new Cube(); 
  headTop.color = FUR; 
  headTop.matrix.setTranslate(0, 0.18, 0.5);
  headTop.matrix.scale(0.36, 0.04, 0.26);
  headTop.matrix.translate(-0.5, -0.5, -0.5);
  headTop.render();

  var headCrown = new Cube();
  headCrown.color = FUR;
  headCrown.matrix.setTranslate(0, 0.21, 0.5);
  headCrown.matrix.scale(0.28, 0.03, 0.2);
  headCrown.matrix.translate(-0.5, -0.5, -0.5);
  headCrown.render();

  var headBottom = new Cube();
  headBottom.color = FUR;
  headBottom.matrix.setTranslate(0, -0.22, 0.5);
  headBottom.matrix.scale(0.36, 0.04, 0.26);
  headBottom.matrix.translate(-0.5, -0.5, -0.5);
  headBottom.render();

  var headChin = new Cube();
  headChin.color = FUR;
  headChin.matrix.setTranslate(0, -0.25, 0.5);
  headChin.matrix.scale(0.28, 0.03, 0.2);
  headChin.matrix.translate(-0.5, -0.5, -0.5);
  headChin.render();

  var headLeft = new Cube();
  headLeft.color = FUR;
  headLeft.matrix.setTranslate(-0.21, -0.02, 0.5);
  headLeft.matrix.scale(0.04, 0.32, 0.26);
  headLeft.matrix.translate(-0.5, -0.5, -0.5);
  headLeft.render();

  var headRight = new Cube();
  headRight.color = FUR;
  headRight.matrix.setTranslate(0.21, -0.02, 0.5);
  headRight.matrix.scale(0.04, 0.32, 0.26);
  headRight.matrix.translate(-0.5, -0.5, -0.5);
  headRight.render();

  var face = new Cube();
  face.color = [0.85, 0.73, 0.58, 1.0];
  face.matrix.setTranslate(0, -0.02, 0.651);
  face.matrix.scale(0.38, 0.32, 0.01);  
  face.matrix.translate(-0.5, -0.5, -0.5);
  face.render();

  var eyeBand = new Cube(); 
  eyeBand.color = [0.18, 0.12, 0.08, 1.0];
  eyeBand.matrix.setTranslate(0, 0.045, 0.66);
  eyeBand.matrix.scale(0.34, 0.085, 0.012);
  eyeBand.matrix.translate(-0.5, -0.5, -0.5);
  eyeBand.render();

  var chinPatch = new Cube();
  chinPatch.color = [0.78, 0.66, 0.52, 1.0];
  chinPatch.matrix.setTranslate(0, -0.148, 0.665);
  chinPatch.matrix.scale(0.22, 0.08, 0.012);
  chinPatch.matrix.translate(-0.5, -0.5, -0.5);
  chinPatch.render();

  var lStreak = new Cube(); 
  lStreak.color = [0.18, 0.12, 0.08, 1.0];
  lStreak.matrix.setTranslate(-0.105, -0.05, 0.665);
  lStreak.matrix.rotate(-22, 0, 0, 1);
  lStreak.matrix.scale(0.055, 0.25, 0.012);
  lStreak.matrix.translate(-0.5, -0.5, -0.5);
  lStreak.render();

  var rStreak = new Cube();
  rStreak.color = [0.18, 0.12, 0.08, 1.0];
  rStreak.matrix.setTranslate(0.105, -0.05, 0.665);
  rStreak.matrix.rotate(22, 0, 0, 1);
  rStreak.matrix.scale(0.055, 0.25, 0.012);
  rStreak.matrix.translate(-0.5, -0.5, -0.5);
  rStreak.render();

  var lEye = new Cube();
  lEye.color = [0.03, 0.02, 0.015, 1.0];
  lEye.matrix.setTranslate(-0.085, 0.045, 0.674);
  lEye.matrix.scale(0.055, 0.055, 0.01);
  lEye.matrix.translate(-0.5, -0.5, -0.5);
  lEye.render();

  var rEye = new Cube();
  rEye.color = [0.03, 0.02, 0.015, 1.0];
  rEye.matrix.setTranslate(0.085, 0.045, 0.674);
  rEye.matrix.scale(0.055, 0.055, 0.01);
  rEye.matrix.translate(-0.5, -0.5, -0.5);
  rEye.render();

  var lShine = new Cube(); 
  lShine.color = [1.0, 1.0, 1.0, 1.0];
  lShine.matrix.setTranslate(-0.073, 0.057, 0.681);
  lShine.matrix.scale(0.014, 0.016, 0.006);
  lShine.matrix.translate(-0.5, -0.5, -0.5);
  lShine.render();

  var rShine = new Cube();
  rShine.color = [1.0, 1.0, 1.0, 1.0];
  rShine.matrix.setTranslate(0.097, 0.057, 0.681);
  rShine.matrix.scale(0.014, 0.016, 0.006);
  rShine.matrix.translate(-0.5, -0.5, -0.5);
  rShine.render();

  var snout = new Cube();
  snout.color = [0.30, 0.22, 0.16, 1.0];
  snout.matrix.setTranslate(0, -0.08, 0.69);
  snout.matrix.rotate(12, 1, 0, 0);
  snout.matrix.scale(0.17, 0.11, 0.08);
  snout.matrix.translate(-0.5, -0.5, -0.5);
  snout.render();

  var mouth = new Cube(); 
  mouth.color = [0.05, 0.03, 0.02, 1.0];
  mouth.matrix.setTranslate(0, -0.105, 0.735);
  mouth.matrix.scale(0.13, 0.035, 0.01);
  mouth.matrix.translate(-0.5, -0.5, -0.5);
  mouth.render();

  var lNostril = new Cube();
  lNostril.color = [0.04, 0.025, 0.015, 1.0];
  lNostril.matrix.setTranslate(-0.03, -0.04, 0.738);
  lNostril.matrix.scale(0.025, 0.04, 0.008);
  lNostril.matrix.translate(-0.5, -0.5, -0.5);
  lNostril.render();

  var rNostril = new Cube();
  rNostril.color = [0.04, 0.025, 0.015, 1.0];
  rNostril.matrix.setTranslate(0.03, -0.04, 0.738);
  rNostril.matrix.scale(0.025, 0.04, 0.008);
  rNostril.matrix.translate(-0.5, -0.5, -0.5);
  rNostril.render();

  var flUpper = new Cube(); 
  flUpper.color = FUR; 
  flUpper.matrix.setTranslate(-0.15, 0.1, 0.15);
  flUpper.matrix.rotate(-35, 0, 0, 1);
  var flElbowMat = new Matrix4(flUpper.matrix);
  flUpper.matrix.scale(0.11, 0.35, 0.175);
  flUpper.matrix.translate(-0.5, -1.0, -0.5);
  flUpper.render();

  var flFore = new Cube();
  flFore.color = FUR;
  flFore.matrix = flElbowMat;
  flFore.matrix.translate(-0.03, -0.25, 0);
  flFore.matrix.rotate(-75, 1, 0, 0);
  flFore.matrix.translate(0.03, 0, 0);
  var flHandMat = new Matrix4(flFore.matrix);
  flFore.matrix.scale(0.1, 0.35, 0.15);
  flFore.matrix.translate(-0.5, -1.0, -0.5);
  flFore.render();

  var frUpper = new Cube();
  frUpper.color = FUR;
  frUpper.matrix.setTranslate(0.15, 0.1, 0.15);
  frUpper.matrix.rotate(35, 0, 0, 1);
  var frElbowMat = new Matrix4(frUpper.matrix);
  frUpper.matrix.scale(0.11, 0.35, 0.175);
  frUpper.matrix.translate(-0.5, -1.0, -0.5);
  frUpper.render();

  var frFore = new Cube();
  frFore.color = FUR;
  frFore.matrix = frElbowMat;
  frFore.matrix.translate(0.03, -0.25, 0);
  frFore.matrix.rotate(-75, 1, 0, 0);
  frFore.matrix.translate(-0.03, 0, 0);
  var frHandMat = new Matrix4(frFore.matrix);
  frFore.matrix.scale(0.1, 0.35, 0.15);
  frFore.matrix.translate(-0.5, -1.0, -0.5);
  frFore.render();

  var blUppper = new Cube();
  blUppper.color = FUR;
  blUppper.matrix.setTranslate(-0.15, 0.1, -0.18);
  blUppper.matrix.rotate(-35, 0, 0, 1);
  var blElbowMat = new Matrix4(blUppper.matrix);
  blUppper.matrix.scale(0.11, 0.35, 0.175);
  blUppper.matrix.translate(-0.5, -1.0, -0.5);
  blUppper.render();

  var blFore = new Cube();
  blFore.color = FUR;
  blFore.matrix = blElbowMat;
  blFore.matrix.translate(0.03, -0.25, 0);
  blFore.matrix.rotate(-60, 1, 0, 0);
  blFore.matrix.translate(-0.03, 0, 0);
  var blHandMat = new Matrix4(blFore.matrix);
  blFore.matrix.scale(0.1, 0.15, 0.15);
  blFore.matrix.translate(-0.5, -1.0, -0.5);
  blFore.render();

  var brUpper = new Cube();
  brUpper.color = FUR;
  brUpper.matrix.setTranslate(0.15, 0.1, -0.18);
  brUpper.matrix.rotate(35, 0, 0, 1);
  var brElbowMat = new Matrix4(brUpper.matrix);
  brUpper.matrix.scale(0.11, 0.35, 0.175);
  brUpper.matrix.translate(-0.5, -1.0, -0.5);
  brUpper.render();

  var brFore = new Cube();
  brFore.color = FUR;
  brFore.matrix = brElbowMat;
  brFore.matrix.translate(0.03, -0.25, 0);
  brFore.matrix.rotate(-60, 1, 0, 0);
  brFore.matrix.translate(-0.03, 0, 0);
  var brHandMat = new Matrix4(brFore.matrix);
  brFore.matrix.scale(0.1, 0.15, 0.15);
  brFore.matrix.translate(-0.5, -1.0, -0.5);
  brFore.render()

  const CLAW = [0.95, 0.92, 0.85, 1.0];

  function drawClaws(parentMat, armLength){
    for (let i = 0; i < 3; i++) {
      var claw = new Cone();
      claw.color = CLAW;
      claw.matrix = new Matrix4(parentMat);
      claw.matrix.translate(-0.035 + i * 0.035, -armLength, 0.02);
      claw.matrix.rotate(180, 1, 0, 0);
      claw.matrix.rotate(15 + g_clawAngle, 1, 0, 0);   // ← 3rd-level joint
      claw.matrix.scale(0.03, 0.15, 0.03);
      claw.render();
    }
  }

  drawClaws(flHandMat, 0.35);
  drawClaws(frHandMat, 0.35);
  drawClaws(blHandMat, 0.15);
  drawClaws(brHandMat, 0.15);
  


  var duration = performance.now() - startTime;
  sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "numdot");
}



// Set the text of a HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}