// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal,0)));
    v_VertPos = u_ModelMatrix * a_Position;
  }`;


// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos; 
  uniform vec3 u_cameraPos;
  uniform vec3 u_lightColor;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;
  uniform bool u_spotOn;
  uniform vec3 u_spotPos;
  uniform vec3 u_spotDir;

  void main() {

    if (u_whichTexture == -4) {
      gl_FragColor = u_FragColor;            // emissive (sun) - no shading
      return;
    } else if (u_whichTexture == -3) {
      gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
      return;
    } else if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else {
      gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    vec3 baseColor = vec3(gl_FragColor);
    vec3 N = normalize(v_Normal);
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    vec3 ambient = baseColor * 0.3;
    vec3 total = ambient;

    // --- Point light ---
    if (u_lightOn) {
      vec3 L = normalize(u_lightPos - vec3(v_VertPos));
      float nDotL = max(dot(N, L), 0.0);
      vec3 R = reflect(-L, N);
      float spec = pow(max(dot(E, R), 0.0), 10.0);
      total += baseColor * nDotL * 0.7 * u_lightColor + spec * u_lightColor;
    }

    // --- Spotlight (sun) ---
    if (u_spotOn) {
      vec3 L = normalize(u_spotPos - vec3(v_VertPos));
      vec3 D = normalize(u_spotDir);

      float spotCos = dot(-L, D);
      float spotAmount = smoothstep(0.82, 0.95, spotCos);

      float nDotL = max(dot(N, L), 0.0);
      vec3 R = reflect(-L, N);
      float spec = pow(max(dot(E, R), 0.0), 25.0);

      vec3 sun = vec3(1.0, 0.82, 0.35);

      total += spotAmount * ((baseColor * nDotL * 1.4) + spec * 1.8) * sun;
    }

    gl_FragColor = vec4(total, 1.0);
  }`

let g_treePositions = [];
let g_lightAnimOn = true;
let u_spotOn;
let g_spotOn = true;
let u_spotPos;
let u_spotDir;
let g_sunPos = [0, 5, 0];
let u_lightColor;
let g_lightColor = [1.0, 1.0, 1.0];
let u_NormalMatrix;
let u_cameraPos;
let canvas; 
let gl; 
let a_Position;
let u_FragColor;

let u_ModelMatrix; 
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
 
let g_showEnvironment = true;
let g_animationOn = false;
let g_headBob = 0;

let g_normalViz = false;

let g_keys = {};
let g_cameraX = 0;
let g_cameraY = 0.4;
let g_cameraZ = 3.0;
let g_lookX = 0;
let g_lookY = 0;
let g_lookZ = 0;
let a_UV;
let a_Normal;
let u_whichTexture;
let u_lightPos; 
let u_lightOn;
let g_lightOn = true;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('BlockyAnimal');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl");
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

  u_spotOn  = gl.getUniformLocation(gl.program, 'u_spotOn');
  u_spotPos = gl.getUniformLocation(gl.program, 'u_spotPos');
  u_spotDir = gl.getUniformLocation(gl.program, 'u_spotDir');
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');

  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  if (!u_lightColor) {
    console.log('Failed to get the storage location of u_lightColor');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
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

   a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
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

let g_flArmAngle = 0;  
let g_frArmAngle = 0;   
let g_blLegAngle = 0;   
let g_brLegAngle = 0;   

let g_flElbowAngle = 0;
let g_frElbowAngle = 0;
let g_blKneeAngle = 0;
let g_brKneeAngle = 0;

let g_flHandAngle = 0;
let g_frHandAngle = 0;


let g_globalAngle = 0;
let g_globalAngleY = 0;
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_cameraYaw = -90;
let g_cameraPitch = 0;
let g_mouseSensitivity = 0.25;

let g_pokeAnimation = false;
let g_pokeStartTime = 0;
let g_pokeHeadAngle = 0;
let g_pokeArmAngle = 0;
let g_pokeBodyAngle = 0;
let g_lightPos = [0,1,-2];

function addActionsForHtmIUI(){

  document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = this.value; renderAllshapes(); });

  document.getElementById('normalOnButton').onclick = function() { g_normalViz = true; };
  document.getElementById('normalOffButton').onclick = function() { g_normalViz = false; };

  document.getElementById('envToggle').onclick = function() { g_showEnvironment = !g_showEnvironment; };

  document.getElementById('animationYellowOnButton').onclick = function() { g_animationOn = true; };

  document.getElementById('animationYellowOffButton').onclick = function() { g_animationOn = false; };

  document.getElementById("lightSlideX").addEventListener("mousemove", function(ev) { if (ev.buttons == 1) { g_lightAnimOn = false; g_lightPos[0] = this.value / 100; } });
  document.getElementById("lightSlideY").addEventListener("mousemove", function(ev) { if (ev.buttons == 1) { g_lightAnimOn = false; g_lightPos[1] = this.value / 100; } });
  document.getElementById("lightSlideZ").addEventListener("mousemove", function(ev) { if (ev.buttons == 1) { g_lightAnimOn = false; g_lightPos[2] = this.value / 100; } });
  document.getElementById('lightAnimOnButton').onclick = function() { g_lightAnimOn = true; };
  document.getElementById('lightAnimOffButton').onclick = function() { g_lightAnimOn = false; };

  document.getElementById('lightOnButton').onclick = function() { g_lightOn = true; };
  document.getElementById('lightOffButton').onclick = function() { g_lightOn = false; };

  document.getElementById('lightColorPicker').addEventListener('input', function() {
    let hex = this.value;                       // e.g. "#ff8800"
    g_lightColor[0] = parseInt(hex.substr(1,2), 16) / 255;
    g_lightColor[1] = parseInt(hex.substr(3,2), 16) / 255;
    g_lightColor[2] = parseInt(hex.substr(5,2), 16) / 255;
  });

  document.getElementById('spotOnButton').onclick  = function() { g_spotOn = true; };
  document.getElementById('spotOffButton').onclick = function() { g_spotOn = false; };


  // Camera Controls 

  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) {
      g_pokeAnimation = true;
      g_pokeStartTime = g_seconds;
      ev.preventDefault();
      return;
  }
  if (ev.button === 0) {               
    g_mouseDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    ev.preventDefault();
  }
};

  canvas.onmouseup = function(ev) {
    if (ev.button === 0) g_mouseDragging = false;
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

let g_tree = new OBJModel();

function loadTree() {
  fetch('Lowpoly_tree_sample.obj')
    .then(r => r.text())
    .then(text => { g_tree.parse(text); });
}

function generateTreePositions(count) {
  g_treePositions = [];

  let minDist = 2.8;
  let attempts = 0;
  let maxAttempts = count * 80;

  while (g_treePositions.length < count && attempts < maxAttempts) {
    attempts++;

    let x = -4.2 + Math.random() * 8.4;
    let z = -4.2 + Math.random() * 8.4;

    if (Math.abs(x) < 1.3 && Math.abs(z) < 1.3) {
      continue;
    }

    let tooClose = false;

    for (let i = 0; i < g_treePositions.length; i++) {
      let dx = x - g_treePositions[i].x;
      let dz = z - g_treePositions[i].z;

      if (dx * dx + dz * dz < minDist * minDist) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) {
      continue;
    }

    g_treePositions.push({
      x: x,
      y: -0.25,
      z: z,
      scale: 0.08 + Math.random() * 0.05,
      rot: Math.random() * 360
    });
  }
}


function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  initCubeBuffers();
  addActionsForHtmIUI();
  updateLookDirection();
  generateTreePositions(6);
  loadTree(); 

  // Specify the color for clearing <canvas>
  gl.clearColor(0.53, 0.81, 0.92, 1.0);

  requestAnimationFrame(tick); 
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick(){
  g_seconds = performance.now()/1000.0 - g_startTime;

  cameraHelper(); 
  updateAnimationAngles();
  renderAllshapes();
  requestAnimationFrame(tick); 
}

function getSkyColor() {
  let h = g_sunPos[1] / 8.0;                          // -1 (below) .. +1 (overhead)
  let t = Math.max(0, Math.min(1, (h + 0.3) / 1.3));  // remap so sunset sits near horizon

  let night  = [0.04, 0.05, 0.12];
  let sunset = [0.85, 0.45, 0.25];
  let day    = [0.53, 0.81, 0.92];

  let c = [0, 0, 0];
  if (t < 0.5) {
    let k = t / 0.5;
    for (let i = 0; i < 3; i++) c[i] = night[i] + (sunset[i] - night[i]) * k;
  } else {
    let k = (t - 0.5) / 0.5;
    for (let i = 0; i < 3; i++) c[i] = sunset[i] + (day[i] - sunset[i]) * k;
  }
  return c;
}

function updateAnimationAngles(){
  if (g_pokeAnimation) {
    let t = g_seconds - g_pokeStartTime;

    g_pokeHeadAngle = -8 * Math.sin(t * 10) * Math.exp(-2.8 * t);
    g_pokeArmAngle = 12 * Math.sin(t * 8) * Math.exp(-2.6 * t);
    g_pokeBodyAngle = 3 * Math.sin(t * 9) * Math.exp(-2.8 * t);

    if (t > 2.0) {
      g_pokeAnimation = false;
      g_pokeHeadAngle = 0;
      g_pokeArmAngle = 0;
      g_pokeBodyAngle = 0;
    }
  }

  if (g_animationOn) {
    let walk = Math.sin(g_seconds * 1.4);

    g_headBob = 1.5 * Math.sin(g_seconds * 1.4);

    g_flArmAngle = 8 * walk;
    g_frArmAngle = -8 * walk;
    g_blLegAngle = -3 * walk;
    g_brLegAngle = 3 * walk;
    g_flElbowAngle = -3 * walk;
    g_frElbowAngle = 3 * walk;
    g_blKneeAngle = -1.25 * walk;
    g_brKneeAngle = 1.25 * walk;
  }
  else {
    g_headBob = 0;
  }
  
  if (g_lightAnimOn) {
    g_lightPos[0] = 2 * Math.cos(g_seconds);
    g_lightPos[2] = -2 + 2 * Math.sin(g_seconds);
  }

  let R = 8.0;
  g_sunPos[0] = R * Math.cos(g_seconds * 0.1);
  g_sunPos[1] = R * Math.sin(g_seconds * 0.1);
  g_sunPos[2] = 0;
}

let rocks = [];
for (let i = 0; i < 100; i++) {
  rocks.push({
    x: -4.6 + Math.random() * 9.2,
    z: -4.6 + Math.random() * 9.2,
    sx: 0.08 + Math.random() * 0.14,
    sy: 0.04 + Math.random() * 0.08,
    sz: 0.08 + Math.random() * 0.14,
    r: Math.random() * 360,
    shade: 0.25 + Math.random() * 0.25
  });
}

let g_rockCube = new Cube();   // global, once

function renderAllshapes(){
  var startTime = performance.now();
  camera();

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  let sky = getSkyColor();
  gl.clearColor(sky[0], sky[1], sky[2], 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_cameraPos, g_cameraX, g_cameraY, g_cameraZ); 
  gl.uniform1i(u_lightOn, g_lightOn);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(u_spotOn, g_spotOn);
  gl.uniform3f(u_spotPos, g_sunPos[0], g_sunPos[1], g_sunPos[2]);
  gl.uniform3f(u_spotDir, 0 - g_sunPos[0], 0 - g_sunPos[1], 0 - g_sunPos[2]);

  function drawPart(color, tx, ty, tz, sx, sy, sz, rotations) {
    var c = new Cube();
    c.color = color;
    c.matrix.setTranslate(tx, ty, tz);

    if (rotations) {
      for (let i = 0; i < rotations.length; i++) {
        c.matrix.rotate(rotations[i][0], rotations[i][1], rotations[i][2], rotations[i][3]);
      }
    }

    c.matrix.scale(sx, sy, sz);
    c.matrix.translate(-0.5, -0.5, -0.5);
    c.render();
    return c;
  } 

  if (g_showEnvironment) {
    var ground = new Cube();
    ground.color = [0.18, 0.42, 0.12, 1.0];
    ground.matrix.setTranslate(0, -0.27, 0);
    ground.matrix.scale(10.0, 0.08, 10.0);
    ground.matrix.translate(-0.5, -0.5, -0.5);
    ground.render();

    
    for (let i = 0; i < rocks.length; i++) {
      let shade = rocks[i].shade;
      g_rockCube.color = [shade, shade, shade * 0.95, 1.0];
      g_rockCube.matrix.setTranslate(rocks[i].x, -0.21, rocks[i].z);
      g_rockCube.matrix.rotate(rocks[i].r, 0, 1, 0);
      g_rockCube.matrix.rotate(15, 0, 0, 1);
      g_rockCube.matrix.scale(rocks[i].sx, rocks[i].sy, rocks[i].sz);
      g_rockCube.matrix.translate(-0.5, -0.5, -0.5);
      g_rockCube.render();
    }
  }

  if (g_tree.loaded && g_showEnvironment) {
  for (let i = 0; i < g_treePositions.length; i++) {
    let t = g_treePositions[i];

    g_tree.matrix.setTranslate(t.x, t.y, t.z);
    g_tree.matrix.rotate(t.rot, 0, 1, 0);
    g_tree.matrix.scale(t.scale, t.scale, t.scale);
    g_tree.render();
  }
}

  var skyDome = new Sphere();
  skyDome.color = [sky[0], sky[1], sky[2], 1.0];
  skyDome.textureNum = -4;                 // emissive — no lighting, won't interfere
  skyDome.matrix.setTranslate(g_cameraX, g_cameraY, g_cameraZ);  // follow camera
  skyDome.matrix.scale(30, 30, 30);
  skyDome.render();

  var light = new Cube();
  light.color = [2, 2, 0, 1];
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-.3, -.3, -.3);
  light.matrix.translate(-.5, -.5, -.5);
  light.render();

  var sun = new Sphere();
  sun.color = [1.0, 0.9, 0.4, 1.0];
  sun.textureNum = -4;               
  sun.matrix.setTranslate(g_sunPos[0], g_sunPos[1], g_sunPos[2]);
  sun.matrix.scale(0.5, 0.5, 0.5);
  sun.render();

  var ball = new Sphere();
  ball.color = [0.8, 0.3, 0.3, 1.0];
  ball.matrix.setTranslate(1.2, 0.3, 0);
  ball.matrix.scale(0.4, 0.4, 0.4);
  ball.render();

  const FUR = [0.55, 0.42, 0.30, 1.0];
  const BELLY = [0.72, 0.64, 0.55, 1.0];
  const FACE = [0.85, 0.73, 0.58, 1.0];
  const CHIN = [0.78, 0.66, 0.52, 1.0];
  const DARK = [0.18, 0.12, 0.08, 1.0];
  const BLACK = [0.03, 0.02, 0.015, 1.0];
  const WHITE = [1.0, 1.0, 1.0, 1.0];
  const SNOUT = [0.30, 0.22, 0.16, 1.0];
  const MOUTH = [0.05, 0.03, 0.02, 1.0];
  const NOSTRIL = [0.04, 0.025, 0.015, 1.0];
  const CLAW = [0.95, 0.92, 0.85, 1.0];

  let bodyRot = g_pokeBodyAngle + g_headBob;
  let headRot = g_pokeHeadAngle + g_headBob;

  drawPart(FUR, 0, 0, 0, 0.4, 0.35, 0.6, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, 0.18, 0, 0.34, 0.04, 0.54, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, 0.21, 0, 0.28, 0.03, 0.48, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, -0.18, 0, 0.34, 0.04, 0.54, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, -0.21, 0, 0.28, 0.03, 0.48, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, -0.2, 0, 0, 0.04, 0.3, 0.54, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0.2, 0, 0, 0.04, 0.3, 0.54, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, 0, 0.29, 0.34, 0.3, 0.04, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, 0, -0.29, 0.34, 0.3, 0.04, [[bodyRot, 0, 0, 1]]);

  drawPart(FUR, 0, -0.03, 0.28, 0.28, 0.28, 0.2, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0, -0.01, -0.3, 0.13, 0.1, 0.2, [[-30, 1, 0, 0], [g_pokeBodyAngle, 0, 0, 1]]);
  drawPart(BELLY, 0, -0.21, 0, 0.32, 0.04, 0.5, [[bodyRot, 0, 0, 1]]);

  drawPart(FUR, -0.16, 0.08, 0.15, .14, .14, .14, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0.16, 0.08, 0.15, .14, .14, .14, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, -0.16, 0.08, -0.15, .14, .14, .14, [[bodyRot, 0, 0, 1]]);
  drawPart(FUR, 0.16, 0.08, -0.15, .14, .14, .14, [[bodyRot, 0, 0, 1]]);

  drawPart(FUR, 0, -0.02, 0.5, 0.42, 0.38, 0.3, [[headRot, 1, 0, 0]]);
  drawPart(FUR, 0, 0.18, 0.5, 0.36, 0.04, 0.26, [[headRot, 1, 0, 0]]);
  drawPart(FUR, 0, 0.21, 0.5, 0.28, 0.03, 0.2, [[headRot, 1, 0, 0]]);
  drawPart(FUR, 0, -0.22, 0.5, 0.36, 0.04, 0.26, [[headRot, 1, 0, 0]]);
  drawPart(FUR, 0, -0.25, 0.5, 0.28, 0.03, 0.2, [[headRot, 1, 0, 0]]);
  drawPart(FUR, -0.21, -0.02, 0.5, 0.04, 0.32, 0.26, [[headRot, 1, 0, 0]]);
  drawPart(FUR, 0.21, -0.02, 0.5, 0.04, 0.32, 0.26, [[headRot, 1, 0, 0]]);

  drawPart(FACE, 0, -0.02, 0.651, 0.38, 0.32, 0.01, [[headRot, 1, 0, 0]]);
  drawPart(DARK, 0, 0.045, 0.66, 0.34, 0.085, 0.012, [[headRot, 1, 0, 0]]);
  drawPart(CHIN, 0, -0.148, 0.665, 0.22, 0.08, 0.012, [[headRot, 1, 0, 0]]);

  drawPart(DARK, -0.105, -0.05, 0.665, 0.055, 0.25, 0.012, [[-22, 0, 0, 1], [headRot, 1, 0, 0]]);
  drawPart(DARK, 0.105, -0.05, 0.665, 0.055, 0.25, 0.012, [[22, 0, 0, 1], [headRot, 1, 0, 0]]);

  drawPart(BLACK, -0.085, 0.045, 0.674, 0.055, 0.055, 0.01, [[headRot, 1, 0, 0]]);
  drawPart(BLACK, 0.085, 0.045, 0.674, 0.055, 0.055, 0.01, [[headRot, 1, 0, 0]]);

  drawPart(WHITE, -0.073, 0.057, 0.681, 0.014, 0.016, 0.006, [[headRot, 1, 0, 0]]);
  drawPart(WHITE, 0.097, 0.057, 0.681, 0.014, 0.016, 0.006, [[headRot, 1, 0, 0]]);

  drawPart(SNOUT, 0, -0.08, 0.69, 0.17, 0.11, 0.08, [[12, 1, 0, 0], [headRot, 1, 0, 0]]);
  drawPart(MOUTH, 0, -0.105, 0.735, 0.13, 0.035, 0.01, [[headRot, 1, 0, 0]]);
  drawPart(NOSTRIL, -0.03, -0.04, 0.738, 0.025, 0.04, 0.008, [[headRot, 1, 0, 0]]);
  drawPart(NOSTRIL, 0.03, -0.04, 0.738, 0.025, 0.04, 0.008, [[headRot, 1, 0, 0]]);

  var flUpper = new Cube();
  flUpper.color = FUR;
  flUpper.matrix.setTranslate(-0.15, 0.1, 0.15);
  flUpper.matrix.rotate(-35, 0, 0, 1);
  flUpper.matrix.rotate(g_flArmAngle - g_pokeArmAngle, 1, 0, 0);
  var flElbowMat = new Matrix4(flUpper.matrix);
  flUpper.matrix.scale(0.11, 0.35, 0.175);
  flUpper.matrix.translate(-0.5, -1.0, -0.5);
  flUpper.render();

  var flFore = new Cube();
  flFore.color = FUR;
  flFore.matrix = new Matrix4(flElbowMat);
  flFore.matrix.translate(-0.03, -0.25, 0);
  flFore.matrix.rotate(-75 + g_flElbowAngle + g_pokeArmAngle * 0.4, 1, 0, 0);
  flFore.matrix.translate(0.03, 0, 0);
  var flWristMat = new Matrix4(flFore.matrix);
  flFore.matrix.scale(0.1, 0.35, 0.15);
  flFore.matrix.translate(-0.5, -1.0, -0.5);
  flFore.render();

  var flHand = new Cube();
  flHand.color = FUR;
  flHand.matrix = new Matrix4(flWristMat);
  flHand.matrix.translate(0, -0.35, 0);
  flHand.matrix.rotate(g_flHandAngle, 1, 0, 0);
  var flHandMat = new Matrix4(flHand.matrix);
  flHand.matrix.scale(0.13, 0.08, 0.08);
  flHand.matrix.translate(-0.5, -1.0, -0.3);
  flHand.render();

  var frUpper = new Cube();
  frUpper.color = FUR;
  frUpper.matrix.setTranslate(0.15, 0.1, 0.15);
  frUpper.matrix.rotate(35, 0, 0, 1);
  frUpper.matrix.rotate(g_frArmAngle - g_pokeArmAngle, 1, 0, 0);
  var frElbowMat = new Matrix4(frUpper.matrix);
  frUpper.matrix.scale(0.11, 0.35, 0.175);
  frUpper.matrix.translate(-0.5, -1.0, -0.5);
  frUpper.render();

  var frFore = new Cube();
  frFore.color = FUR;
  frFore.matrix = new Matrix4(frElbowMat);
  frFore.matrix.translate(0.03, -0.25, 0);
  frFore.matrix.rotate(-75 + g_frElbowAngle + g_pokeArmAngle * 0.4, 1, 0, 0);
  frFore.matrix.translate(-0.03, 0, 0);
  var frWristMat = new Matrix4(frFore.matrix);
  frFore.matrix.scale(0.1, 0.35, 0.15);
  frFore.matrix.translate(-0.5, -1.0, -0.5);
  frFore.render();

  var frHand = new Cube();
  frHand.color = FUR;
  frHand.matrix = new Matrix4(frWristMat);
  frHand.matrix.translate(0, -0.35, 0);
  frHand.matrix.rotate(g_frHandAngle, 1, 0, 0);
  var frHandMat = new Matrix4(frHand.matrix);
  frHand.matrix.scale(0.13, 0.08, 0.08);
  frHand.matrix.translate(-0.5, -1.0, -0.3);
  frHand.render();

  var blUpper = new Cube();
  blUpper.color = FUR;
  blUpper.matrix.setTranslate(-0.15, 0.1, -0.18);
  blUpper.matrix.rotate(-35, 0, 0, 1);
  blUpper.matrix.rotate(g_blLegAngle + g_pokeArmAngle * 0.5, 1, 0, 0);
  var blKneeMat = new Matrix4(blUpper.matrix);
  blUpper.matrix.scale(0.11, 0.35, 0.175);
  blUpper.matrix.translate(-0.5, -1.0, -0.5);
  blUpper.render();

  var blShin = new Cube();
  blShin.color = FUR;
  blShin.matrix = new Matrix4(blKneeMat);
  blShin.matrix.translate(0.03, -0.25, 0);
  blShin.matrix.rotate(-80 + g_blKneeAngle, 1, 0, 0);
  blShin.matrix.translate(-0.03, 0, 0);
  var blAnkleMat = new Matrix4(blShin.matrix);
  blShin.matrix.scale(0.1, 0.15, 0.07);
  blShin.matrix.translate(-0.5, -1.25, -1.35);
  blShin.render();

  var brUpper = new Cube();
  brUpper.color = FUR;
  brUpper.matrix.setTranslate(0.15, 0.1, -0.18);
  brUpper.matrix.rotate(35, 0, 0, 1);
  brUpper.matrix.rotate(g_brLegAngle + g_pokeArmAngle * 0.5, 1, 0, 0);
  var brKneeMat = new Matrix4(brUpper.matrix);
  brUpper.matrix.scale(0.11, 0.35, 0.175);
  brUpper.matrix.translate(-0.5, -1.0, -0.5);
  brUpper.render();

  var brShin = new Cube();
  brShin.color = FUR;
  brShin.matrix = new Matrix4(brKneeMat);
  brShin.matrix.translate(0.03, -0.25, 0);
  brShin.matrix.rotate(-80 + g_brKneeAngle, 1, 0, 0);
  brShin.matrix.translate(-0.03, 0, 0);
  var brAnkleMat = new Matrix4(brShin.matrix);
  brShin.matrix.scale(0.1, 0.15, 0.07);
  brShin.matrix.translate(-0.5, -1.25, -1.35);
  brShin.render();

  function drawClaws(parentMat, armLength, zOffset, xShift){
    for (let i = 0; i < 3; i++) {
      var claw = new Cone();
      claw.color = CLAW;
      claw.matrix = new Matrix4(parentMat);
      claw.matrix.translate(-0.035 + i * 0.035 + xShift, -armLength, zOffset);
      claw.matrix.rotate(180, 1, 0, 0);
      claw.matrix.rotate(15, 1, 0, 0);
      claw.matrix.scale(0.03, 0.15, 0.03);
      claw.render();
    }
  }

  drawClaws(flHandMat, 0.08, 0.02, 0);
  drawClaws(frHandMat, 0.08, 0.02, 0);
  drawClaws(blAnkleMat, 0.18, -0.06, 0.02); 
  drawClaws(brAnkleMat, 0.18, -0.06, -0.02);

  var duration = performance.now() - startTime;
  sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(1000 / duration), "numdot");
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