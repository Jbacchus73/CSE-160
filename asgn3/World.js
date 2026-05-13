// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;


// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0; 
  uniform int u_whichTexture;
  void main() { 
    if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor;                  // Use color

  } else if (u_whichTexture == -1) {             // Use UV debug color
    gl_FragColor = vec4(v_UV, 1.0, 1.0);

  } else if (u_whichTexture == 0) {              // Use texture0
    gl_FragColor = texture2D(u_Sampler0, v_UV);

  } else {                                      // Error, put Redish
    gl_FragColor = vec4(1, .2, .2, 1);
  }
  }`;

let canvas; 
let gl; 
let a_Position;
let u_FragColor;
let a_UV;

let u_whichTexture;
let u_ModelMatrix; 
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('World');

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

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
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

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
  console.log('Failed to get the storage location of u_whichTexture');
  return;
} 


  var identityM = new Matrix4(); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);


} 

function initTextures() {
 
  // Get the storage location of u_Sampler
  var u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }

  var image = new Image();   // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }

  // Register the event handler to be called on loading an image
  image.onload = function() { loadTexture(image); };

  // Tell the browser to load an image
  image.src = '2544.jpg';

  return true;
}

function loadTexture(image) {

  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image's y axis

  // Enable texture unit 0
  gl.activeTexture(gl.TEXTURE0);

  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler0, 0);

  //gl.clear(gl.COLOR_BUFFER_BIT);    // Clear <canvas>

  //gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);  // Draw the rectangle
  console.log('finished loadTexture');
}

let g_globalAngle = 0;
let g_globalAngleY = 0;
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_mouseSensitivity = 0.25;
let g_camera;

function addActionsForHtmIUI() {
  // Camera Controls — middle-mouse drag to look around
  canvas.onmousedown = function(ev) {
    if (ev.button === 2) {
      g_mouseDragging = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
      ev.preventDefault();
    }
  };
 
  canvas.onmouseup = function(ev) {
    if (ev.button === 2) g_mouseDragging = false;
  };
 
  canvas.onmouseleave = function(ev) {
    g_mouseDragging = false;
  };
 
  canvas.onmousemove = function(ev) {
    if (!g_mouseDragging) return;
 
    let dx = ev.clientX - g_lastMouseX;
    let dy = ev.clientY - g_lastMouseY;

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    ev.preventDefault();
  };
 
  canvas.onauxclick = function(ev) { ev.preventDefault(); };
  canvas.oncontextmenu = function(ev) { ev.preventDefault(); };
 
  document.onkeydown = function(ev) { g_keys[ev.key.toLowerCase()] = true; };
  document.onkeyup = function(ev) { g_keys[ev.key.toLowerCase()] = false; };
}

function processKeyboard() {
  if (g_keys['w']) g_camera.moveForward();
  if (g_keys['s']) g_camera.moveBackwards();
  if (g_keys['a']) g_camera.moveLeft();
  if (g_keys['d']) g_camera.moveRight();
  if (g_keys['q']) g_camera.panLeft();
  if (g_keys['e']) g_camera.panRight();
}

function uploadCameraMatrices() {
  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
}

function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  g_camera = new Camera();
  addActionsForHtmIUI();
  initTextures();

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
  renderAllshapes();
  requestAnimationFrame(tick); 
}

function renderAllshapes(){
  var startTime = performance.now();

  uploadCameraMatrices();

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  var World = new Cube(); 
  World.color = [1.0,0.0,0.0,1.0]; 
  World.textureNum =0;
  World.matrix.translate(0, -.75, 0); 
  World.matrix.scale(10, 0, 10); 
  World.matrix.translate(-0.5, 0, -0.5); 
  World.render();

  var testCube = new Cube();
  testCube.color = [1.0, 0.3, 0.3, 1.0];
  testCube.textureNum = 0;
  testCube.matrix.translate(-0.5, -0.5, -0.5);  // center at origin
  gl.uniform1i(u_whichTexture, 0);
  testCube.render();

  // Optional second cube for depth reference
  var farCube = new Cube();
  farCube.color = [0.3, 0.6, 1.0, 1.0];
  farCube.textureNum = 0;
  farCube.matrix.setTranslate(0, 0, -3);          // 3 units further away
  farCube.matrix.translate(-0.5, -0.5, -0.5);
  farCube.render();

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