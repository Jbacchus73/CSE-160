// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
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

  var identityM = new Matrix4(); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);


} 


let g_globalAngle = 0;
let g_yellowAngle = 0; 
let g_magentaAngle = 0;
let g_yellowAnimation = false;
let g_globalAngleY = 0;
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;


function addActionsForHtmIUI(){
  //Color Slider Events

  document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation=false;};
  document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation=true;};
  document.getElementById('magentaSlide').addEventListener('input', function() { g_magentaAngle = this.value; renderAllshapes(); });
  document.getElementById('yellowSlide').addEventListener('input', function() { g_yellowAngle = this.value; renderAllshapes(); });
  document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = this.value; renderAllshapes(); });

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

canvas.onmousemove = function(ev) {
  if (!g_mouseDragging) return;
  g_globalAngle  -= (ev.clientX - g_lastMouseX) * 0.5;
  g_globalAngleY -= (ev.clientY - g_lastMouseY) * 0.5;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
};

}


function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  addActionsForHtmIUI();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.53, 0.81, 0.92, 1.0);

  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(tick); 
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/100.0 - g_startTime;

function tick(){
  g_seconds = performance.now()/1000.0 - g_startTime;

  renderAllshapes();
  requestAnimationFrame(tick); 
}

function renderAllshapes(){
  var startTime = performance.now();

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const FUR = [0.55, 0.42, 0.30, 1.0];      // warm grey-brown

   // ===== BODY — long rectangular box =====
  var body = new Cube();
  body.color = FUR;
  body.matrix.setTranslate(0, 0, 0) ;
  body.matrix.scale(0.4, 0.35, 0.6);
  body.matrix.translate(-0.5, -0.5, -0.5);
  body.render();

  var neck = new Cube();
  neck.color = FUR;
  neck.matrix.setTranslate(0, -0.03, 0.28);
  neck.matrix.scale(0.28, 0.28, 0.1);
  neck.matrix.translate(-0.5, -0.5, -0.5);
  neck.render();

  const FUR_LIGHT = [0.72, 0.64, 0.55, 1.0];   // warm cream belly

  // ===== BELLY — lighter underside (peeks out below) =====
  var belly = new Cube();
  belly.color = FUR_LIGHT;
  belly.matrix.setTranslate(0, -0.18, 0);      // was -0.1, drop it down
  belly.matrix.scale(0.30, 0.01, 0.5);
  belly.matrix.translate(-0.5, -0.5, -0.5);
  belly.render()

  // ===== MINI TAIL — tiny stub at rear =====
  var tail = new Cube();
  tail.color = FUR;
  tail.matrix.setTranslate(0, -0.01, -0.3);
  tail.matrix.rotate(-30, 1, 0, 0);  
  tail.matrix.scale(0.13, 0.1, 0.2);
  tail.matrix.translate(-0.5, -0.5, -0.5);
  tail.render();

  var head = new Cube();
  head.color = FUR;
  head.matrix.setTranslate(0, -0.05, 0.47);
  head.matrix.scale(0.34, 0.32, 0.28);
  head.matrix.translate(-0.5, -0.5, -0.5);
  head.render();

  const FACE_PALE  = [0.85, 0.73, 0.58, 1.0];   // pale cream face (most of head)
  const EYE_BAND   = [0.18, 0.12, 0.08, 1.0];   // dark band
  const EYE_WHITE  = [0.05, 0.03, 0.02, 1.0];   // white eyes
  const MUZZLE = [0.30, 0.22, 0.16, 1.0];   // lighter muzzle (protruding)
  const NOSE       = [0.12, 0.08, 0.06, 1.0];   // dark nose
  const MOUTH      = [0.18, 0.12, 0.08, 1.0];   // dark mouth

  // Head front face at z = 0.35 + 0.14 = 0.49

  // ===== PALE FACE MASK (covers most of head front) =====
  var face = new Cube();
  face.color = FACE_PALE;
  face.matrix.setTranslate(0, -0.05, 0.611); 
  face.matrix.scale(0.32, 0.28, 0.01);
  face.matrix.translate(-0.5, -0.5, -0.5);
  face.render();

  // ===== DARK EYE BAND (on top of pale mask) =====
  var band = new Cube();
  band.color = EYE_BAND;
  band.matrix.setTranslate(0, 0.0, 0.617);
  band.matrix.scale(0.3, 0.08, 0.008);
  band.matrix.translate(-0.5, -0.5, -0.5);
  band.render();

  // ===== LEFT EYE =====
  var lEye = new Cube();
  lEye.color = EYE_WHITE;
  lEye.matrix.setTranslate(-0.07, 0.0, 0.625);
  lEye.matrix.scale(0.05, 0.05, 0.005);
  lEye.matrix.translate(-0.5, -0.5, -0.5);
  lEye.render();

  // ===== RIGHT EYE =====
  var rEye = new Cube();
  rEye.color = EYE_WHITE;
  rEye.matrix.setTranslate(0.07, 0.0, 0.625);
  rEye.matrix.scale(0.05, 0.05, 0.005);
  rEye.matrix.translate(-0.5, -0.5, -0.5);
  rEye.render();

  // ===== MUZZLE — PROTRUDING 3D BLOCK =====
  var muzzle = new Cube();
  muzzle.color = MUZZLE;
  muzzle.matrix.setTranslate(0, -0.11, 0.645);   // sits in front of face by 0.035
  muzzle.matrix.rotate(15, 1, 0, 0);
  muzzle.matrix.scale(0.14, 0.1, 0.09);          // now 0.06 DEEP → actual 3D block
  muzzle.matrix.translate(-0.5, -0.5, -0.5);
  muzzle.render();

  // ===== NOSE (on front face of muzzle) =====
  // ===== TWO NOSTRILS (replace the single nose cube) =====
  const NOSTRIL = [0.05, 0.03, 0.02, 1.0];   // near-black nostril

  // Left nostril
  var lNostril = new Cube();
  lNostril.color = NOSTRIL;
  lNostril.matrix.setTranslate(-0.018, -0.08, 0.681);
  lNostril.matrix.scale(0.025, 0.035, 0.0015);
  lNostril.matrix.translate(-0.5, -0.5, -0.5);
  lNostril.render();

  // Right nostril
  var rNostril = new Cube();
  rNostril.color = NOSTRIL;
  rNostril.matrix.setTranslate(0.018, -0.08, 0.681);
  rNostril.matrix.scale(0.025, 0.035, 0.0015);
  rNostril.matrix.translate(-0.5, -0.5, -0.5);
  rNostril.render();

  // ===== MOUTH (on bottom-front of muzzle) =====
  var mouth = new Cube();
  mouth.color = NOSTRIL;
  mouth.matrix.setTranslate(0, -0.13, 0.681);
  mouth.matrix.scale(0.12, 0.03, 0.008);
  mouth.matrix.translate(-0.5, -0.5, -0.5);
  mouth.render();

  const EYE_STREAK = [0.18, 0.12, 0.08, 1.0];   // same color as eye band

  // ===== LEFT EYE STREAK (tear stripe going down-outward) =====
  var lStreak = new Cube();
  lStreak.color = EYE_STREAK;
  lStreak.matrix.setTranslate(-0.09, -0.075, 0.617);
  lStreak.matrix.rotate(-20, 0, 0, 1);             // angle down-outward
  lStreak.matrix.scale(0.04, 0.23, 0.008);
  lStreak.matrix.translate(-0.5, -0.5, -0.5);
  lStreak.render();

  // ===== RIGHT EYE STREAK =====
  var rStreak = new Cube();
  rStreak.color = EYE_STREAK;
  rStreak.matrix.setTranslate(0.09, -0.075, 0.617);
  rStreak.matrix.rotate(20, 0, 0, 1);
  rStreak.matrix.scale(0.04, 0.23, 0.008);
  rStreak.matrix.translate(-0.5, -0.5, -0.5);
  rStreak.render();

  const LIMB = [0.42, 0.32, 0.22, 1.0];   // slightly darker than body

  // ===== FRONT-LEFT UPPER ARM (perpendicular, sticking straight out) =====
  var flUpper = new Cube();
  flUpper.color = LIMB;
  flUpper.matrix.setTranslate(-0.2, -0.15, 0.15);
  flUpper.matrix.rotate(-75, 0, 0, 1);              // rotate around Z-axis → horizontal
  var flElbowMat = new Matrix4(flUpper.matrix);
  flUpper.matrix.scale(0.11, 0.3, 0.11);
  flUpper.matrix.translate(-0.5, -1.0, -0.5);
  flUpper.render();

  // ===== FRONT-RIGHT UPPER ARM =====
  var frUpper = new Cube();
  frUpper.color = LIMB;
  frUpper.matrix.setTranslate(0.2, -0.15, 0.15);
  frUpper.matrix.rotate(75, 0, 0, 1);             // opposite direction for right side
  var frElbowMat = new Matrix4(frUpper.matrix);
  frUpper.matrix.scale(0.11, 0.3, 0.11);
  frUpper.matrix.translate(-0.5, -1.0, -0.5);
  frUpper.render();

  var frFore = new Cube();
  frFore.color = LIMB;
  frFore.matrix = frElbowMat;
  frFore.matrix.translate(0, -0.25, 0);
  frFore.matrix.rotate(-75, 1, 0, 0);
  frFore.matrix.translate(-0.03, 0, 0);             // opposite shift for mirrored arm
  frFore.matrix.scale(0.1, 0.3, 0.15);
  frFore.matrix.translate(-0.5, -1.0, -0.5);
  frFore.render();

  var flFore = new Cube();
  flFore.color = LIMB;
  flFore.matrix = flElbowMat;
  flFore.matrix.translate(0, -0.25, 0);             // move to end of upper arm (elbow)
  flFore.matrix.rotate(-75, 1, 0, 0);               // 90° forward bend
  flFore.matrix.translate(0.03, 0, 0);              // shift slightly toward front (in upper arm's frame)
  flFore.matrix.scale(0.1, 0.3, 0.15);
  flFore.matrix.translate(-0.5, -1.0, -0.5);
  flFore.render();
  
  // FPS
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