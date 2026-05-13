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
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;

  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else {
      gl_FragColor = vec4(1, .2, .2, 1);
    }
  }`;
  

let g_trees = [];
let u_Sampler2;
let g_lastTextureNum   = -999; 
let g_worldVertexBuffer = null;
let g_worldUVBuffer     = null;
let g_worldVertexCount  = 0;
let g_worldSideVertexBuffer = null;
let g_worldSideUVBuffer = null;
let g_worldSideVertexCount = 0;
let g_worldTopVertexBuffer = null;
let g_worldTopUVBuffer = null;
let g_worldTopVertexCount = 0;
let g_blockCubes = [];
let BLOCK_GRID_SIZE = 226;
let BLOCK_OFFSET = BLOCK_GRID_SIZE / 2;
let g_collision;
let userRadius = 0.25;
let FLOOR_Y = -0.75;
let userHeight = 1.15;
let g_treeCells = new Set();
let g_treeCellToCubes = {};
let g_sky;
let g_world;
let g_testCube;
let g_farCube;
let g_camera;
let g_keys = {};
let canvas; 
let gl; 
let a_Position;
let u_FragColor;
let a_UV;

let g_paused = true;
let u_whichTexture;
let u_ModelMatrix; 
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1;
let g_textures = [];

let g_blocks = [];
let g_blockSet = new Set();
let BLOCK_BASE_Y = -0.75;
let MIN_BLOCK_HEIGHT = -10;
let MAX_BLOCK_HEIGHT = 30;
let g_goldenTreeKeys = new Set();
let g_gameWon = false;

function setupWebGL(){
  canvas = document.getElementById('World');

  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (u_Sampler2 === null) {
    console.log('Failed to get the storage location of u_Sampler2');
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

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (u_Sampler1 === null) {
    console.log('Failed to get the storage location of u_Sampler1');
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
  loadTexture('sky.png', 0);
  loadTexture('old_grass_side.png', 1);
  loadTexture('old_grass_top.png', 2);
  return true;
}

function loadTexture(imagePath, textureNum) {
  var image = new Image();

  image.onload = function() {
    var texture = gl.createTexture();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    gl.activeTexture(gl.TEXTURE0 + textureNum);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (textureNum == 0) {
      gl.uniform1i(u_Sampler0, 0);
    } else if (textureNum == 1) {
      gl.uniform1i(u_Sampler1, 1);
    } else if (textureNum == 2) {
      gl.uniform1i(u_Sampler2, 2);
    }

    g_textures[textureNum] = texture;
  };

  image.src = imagePath;
}

let g_globalAngle = 0;
let g_globalAngleY = 0;
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseSensitivity = 0.20;

function addActionsForHtmIUI() {
  let resetButton = document.getElementById("resetButton");

  if (resetButton) {
    resetButton.onclick = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      resetGame();
    };

    resetButton.onmousedown = function(ev) {
      ev.stopPropagation();
    };
  }
  let pauseScreen = document.getElementById("pauseScreen");

  if (pauseScreen) {
    pauseScreen.style.display = "flex";
  }

  canvas.onmousedown = function(ev) {
    ev.preventDefault();

    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }

    if (g_paused) return;

    if (ev.button === 0) {
      deleteBlockInFront();
    }

    if (ev.button === 2) {
      addBlockInFront();
    }
  };

  canvas.oncontextmenu = function(ev) {
    ev.preventDefault();
  };

  document.onpointerlockchange = function() {
    let pauseScreen = document.getElementById("pauseScreen");
    let winScreen = document.getElementById("winScreen");

    if (g_gameWon) {
      g_paused = true;
      if (pauseScreen) pauseScreen.style.display = "none";
      if (winScreen) winScreen.style.display = "flex";
      return;
    }

    if (document.pointerLockElement === canvas) {
      g_paused = false;
      if (pauseScreen) pauseScreen.style.display = "none";
      sendTextToHTML("Camera locked — press ESC to pause", "mouseStatus");
    } else {
      g_paused = true;
      if (pauseScreen) pauseScreen.style.display = "flex";
      sendTextToHTML("Paused — click canvas to resume", "mouseStatus");
    }
  };

  document.onmousemove = function(ev) {
    if (g_paused) return;
    if (document.pointerLockElement !== canvas) return;

    let dx = ev.movementX || 0;
    let dy = ev.movementY || 0;

    g_camera.rotateMouse(dx * g_mouseSensitivity, dy * g_mouseSensitivity);
  };

  document.onkeydown = function(ev) {
    if (g_paused) return;

    if (ev.code === "Space") {
      ev.preventDefault();

      if (!ev.repeat) {
        g_collision.jump();
      }

      return;
    }

    g_keys[ev.key.toLowerCase()] = true;
  };

  document.onkeyup = function(ev) {
    if (ev.code === "Space") {
      ev.preventDefault();
      return;
    }

    g_keys[ev.key.toLowerCase()] = false;
  };
}

function processKeyboard() {
  let speed = g_camera.speed;
  let eye = g_camera.eye.elements;
  let at = g_camera.at.elements;

  let forwardX = at[0] - eye[0];
  let forwardZ = at[2] - eye[2];

  let len = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
  if (len > 0) {
    forwardX /= len;
    forwardZ /= len;
  }

  let rightX = -forwardZ;
  let rightZ = forwardX;  

  let dx = 0;
  let dz = 0;

  if (g_keys['w']) {
    dx += forwardX * speed;
    dz += forwardZ * speed;
  }

  if (g_keys['s']) {
    dx -= forwardX * speed;
    dz -= forwardZ * speed;
  }

  if (g_keys['a']) {
    dx -= rightX * speed;
    dz -= rightZ * speed;
  }

  if (g_keys['d']) {
    dx += rightX * speed;
    dz += rightZ * speed;
  }

  g_collision.move(dx, dz);

  if (g_keys['q']) g_camera.panLeft();
  if (g_keys['e']) g_camera.panRight();
}


function uploadCameraMatrices() {
  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
}

function addBlockAt(x, y, z, type) {
  if (!validBlockCell(x, y, z)) return;
  let key = blockKey(x, y, z);
  if (g_blockSet.has(key)) return;

  g_blockSet.add(key);
  g_blocks.push({x: x, y: y, z: z, type: type || "grass"});
}

function getHighestBlockY(x, z) {
  for (let y = MAX_BLOCK_HEIGHT; y >= MIN_BLOCK_HEIGHT; y--) {
    if (blockExists(x, y, z)) {
      return y;
    }
  }

  return MIN_BLOCK_HEIGHT - 1;
}

function treeExists(x, y, z) {
  return g_treeCells.has(blockKey(x, y, z));
}

function addTreeColliderCell(x, y, z, cubeIndices) {
  if (!validBlockCell(x, y, z)) return;

  let key = blockKey(x, y, z);
  g_treeCells.add(key);
  g_treeCellToCubes[key] = cubeIndices;
}

function removeTreeAt(x, y, z) {
  let key = blockKey(x, y, z);

  if (!g_treeCells.has(key)) return false;

  let cubeIndices = g_treeCellToCubes[key];

  for (let i = 0; i < cubeIndices.length; i++) {
    g_trees[cubeIndices[i]] = null;
  }

  for (let cellKey in g_treeCellToCubes) {
    if (g_treeCellToCubes[cellKey] === cubeIndices) {
      g_treeCells.delete(cellKey);
      delete g_treeCellToCubes[cellKey];
    }
  }

  return true;
}

function addTreeCube(x, y, z, sx, sy, sz, color) {
  let cube = new Cube();
  cube.textureNum = -2;
  cube.color = color;

  cube.matrix.translate(x, y, z);
  cube.matrix.scale(sx, sy, sz);
  cube.matrix.translate(-0.5, 0, -0.5);

  g_trees.push(cube);
}

function makeTree(gridX, gridZ) {
  let topY = getHighestBlockY(gridX, gridZ);
  if (topY < 0) return;

  let worldX = gridX - BLOCK_OFFSET + 0.5;
  let worldZ = gridZ - BLOCK_OFFSET + 0.5;
  let groundY = BLOCK_BASE_Y + topY + 1;

  let startIndex = g_trees.length;

  addTreeCube(worldX, groundY, worldZ, 0.35, 2.0, 0.35, [0.45, 0.25, 0.08, 1.0]);

  addTreeCube(worldX, groundY + 2.0, worldZ, 1.8, 1.2, 1.8, [0.05, 0.45, 0.08, 1.0]);
  addTreeCube(worldX, groundY + 2.8, worldZ, 1.3, 1.0, 1.3, [0.04, 0.35, 0.06, 1.0]);
  addTreeCube(worldX, groundY + 2.2, worldZ + 0.45, 1.4, 1.0, 1.4, [0.06, 0.5, 0.08, 1.0]);

  let cubeIndices = [
    startIndex,
    startIndex + 1,
    startIndex + 2,
    startIndex + 3
  ];

  addTreeColliderCell(gridX, topY + 1, gridZ, cubeIndices);
  addTreeColliderCell(gridX, topY + 2, gridZ, cubeIndices);
  addTreeColliderCell(gridX, topY + 3, gridZ, cubeIndices);
}

function makeGoldenTree(gridX, gridZ) {
  let topY = getHighestBlockY(gridX, gridZ);
  if (topY < 0) return;

  let worldX = gridX - BLOCK_OFFSET + 0.5;
  let worldZ = gridZ - BLOCK_OFFSET + 0.5;
  let groundY = BLOCK_BASE_Y + topY + 1;

  let startIndex = g_trees.length;

  addTreeCube(worldX, groundY, worldZ, 0.4, 2.2, 0.4, [0.85, 0.55, 0.05, 1.0]);

  addTreeCube(worldX, groundY + 2.0, worldZ, 1.9, 1.2, 1.9, [1.0, 0.85, 0.05, 1.0]);
  addTreeCube(worldX, groundY + 2.8, worldZ, 1.4, 1.0, 1.4, [1.0, 0.65, 0.02, 1.0]);
  addTreeCube(worldX, groundY + 2.2, worldZ + 0.45, 1.5, 1.0, 1.5, [1.0, 0.9, 0.1, 1.0]);

  let cubeIndices = [
    startIndex,
    startIndex + 1,
    startIndex + 2,
    startIndex + 3
  ];

  let keys = [
    blockKey(gridX, topY + 1, gridZ),
    blockKey(gridX, topY + 2, gridZ),
    blockKey(gridX, topY + 3, gridZ)
  ];

  addTreeColliderCell(gridX, topY + 1, gridZ, cubeIndices);
  addTreeColliderCell(gridX, topY + 2, gridZ, cubeIndices);
  addTreeColliderCell(gridX, topY + 3, gridZ, cubeIndices);

  for (let i = 0; i < keys.length; i++) {
    g_goldenTreeKeys.add(keys[i]);
  }
}


function initTrees(count, minDistance) {
  g_trees = [];
  g_treeCells = new Set();
  g_treeCellToCubes = {};

  let placed = [];
  let attempts = 0;
  let maxAttempts = count * 80;

  while (placed.length < count && attempts < maxAttempts) {
    attempts++;

    let x = Math.floor(Math.random() * BLOCK_GRID_SIZE);
    let z = Math.floor(Math.random() * BLOCK_GRID_SIZE);

    let worldX = x - BLOCK_OFFSET;
    let worldZ = z - BLOCK_OFFSET;

    if (Math.abs(worldX) < 8 && Math.abs(worldZ) < 8) continue;

    let topY = getHighestBlockY(x, z);
    if (topY < 0) continue;

    let tooClose = false;

    for (let i = 0; i < placed.length; i++) {
      let dx = x - placed[i].x;
      let dz = z - placed[i].z;

      if (dx * dx + dz * dz < minDistance * minDistance) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    makeTree(x, z);
    placed.push({x: x, z: z});
  }
}

function initGoldenTree() {
  g_goldenTreeKeys = new Set();
  g_gameWon = false;

  let attempts = 0;

  while (attempts < 500) {
    attempts++;

    let x = Math.floor(Math.random() * BLOCK_GRID_SIZE);
    let z = Math.floor(Math.random() * BLOCK_GRID_SIZE);

    let worldX = x - BLOCK_OFFSET;
    let worldZ = z - BLOCK_OFFSET;

    if (Math.abs(worldX) < 18 && Math.abs(worldZ) < 18) continue;

    let topY = getHighestBlockY(x, z);
    if (topY < 0) continue;
    if (topY + 3 >= MAX_BLOCK_HEIGHT) continue;
    if (treeExists(x, topY + 1, z)) continue;

    makeGoldenTree(x, z);
    sendTextToHTML("Find the golden tree and break it to win.", "gameStatus");
    return;
  }

  makeGoldenTree(Math.floor(BLOCK_OFFSET + 20), Math.floor(BLOCK_OFFSET + 20));
}

function showWinScreen() {
  g_gameWon = true;
  g_paused = true;
  g_keys = {};

  let winScreen = document.getElementById("winScreen");
  let pauseScreen = document.getElementById("pauseScreen");

  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }

  if (pauseScreen) {
    pauseScreen.style.display = "none";
  }

  if (winScreen) {
    winScreen.style.display = "flex";
  }

  sendTextToHTML("You broke the golden tree. You win!", "gameStatus");
  sendTextToHTML("You win! Click Play Again to reset.", "mouseStatus");
}

function resetGame() {
  let winScreen = document.getElementById("winScreen");
  let pauseScreen = document.getElementById("pauseScreen");

  if (winScreen) {
    winScreen.style.display = "none";
  }

  if (pauseScreen) {
    pauseScreen.style.display = "flex";
  }

  g_keys = {};
  g_gameWon = false;
  g_goldenTreeKeys = new Set();

  let terrain = new TerrainGenerator(BLOCK_GRID_SIZE);
  terrain.generate();

  initTrees(100, 10);
  initGoldenTree();

  SceneObjects();
  buildWorldMesh();

  g_camera.eye = new Vector3([-2.5, 0.4, -2.5]);
  g_camera.at = new Vector3([-2.5, 0.4, -1.5]);
  g_camera.updateView();

  g_collision = new collision(g_camera, g_map);

  g_paused = true;

  sendTextToHTML("Find the golden tree and break it to win.", "gameStatus");
  sendTextToHTML("Click canvas to resume", "mouseStatus");
}

function drawTrees() {
  for (let i = 0; i < g_trees.length; i++) {
    if (g_trees[i] == null) continue;
    g_trees[i].renderFast();
  }
}


function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  initCubeBuffers();
  g_camera = new Camera();
  let terrain = new TerrainGenerator(BLOCK_GRID_SIZE);
  terrain.generate();
  initTrees(500, 10);
  initGoldenTree();
  SceneObjects();

  buildWorldMesh();
  g_camera.eye = new Vector3([-2.5, 0.4, -2.5]);
  g_camera.at = new Vector3([-2.5, 0.4, -1.5]);
  g_camera.updateView();

  g_collision = new collision(g_camera, g_map);
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

  if (!g_paused && !g_gameWon) {
    processKeyboard();
  }

  renderAllshapes();
  requestAnimationFrame(tick); 
}

var g_map = [
  [1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,1],
  [1,0,0,1,0,0,0,1],
  [1,0,0,0,0,1,0,1],
  [1,0,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1],
];

function blockKey(x, y, z) {
  return x + "," + y + "," + z;
}

function validBlockCell(x, y, z) {
  return x >= 0 && x < BLOCK_GRID_SIZE &&
         z >= 0 && z < BLOCK_GRID_SIZE &&
         y >= MIN_BLOCK_HEIGHT && y <= MAX_BLOCK_HEIGHT;
}

function blockExists(x, y, z) {
  return g_blockSet.has(blockKey(x, y, z));
}

function addBlockAt(x, y, z) {
  if (!validBlockCell(x, y, z)) return;

  let key = blockKey(x, y, z);
  if (g_blockSet.has(key)) return;

  g_blockSet.add(key);
  g_blocks.push({x: x, y: y, z: z});
}

function removeBlockAt(x, y, z) {
  let key = blockKey(x, y, z);
  if (!g_blockSet.has(key)) return;

  g_blockSet.delete(key);

  for (let i = 0; i < g_blocks.length; i++) {
    if (g_blocks[i].x == x && g_blocks[i].y == y && g_blocks[i].z == z) {
      g_blocks.splice(i, 1);
      return;
    }
  }
}

function addQuad(verts, uvs, bl, br, tr, tl) {
  verts.push(
    bl[0], bl[1], bl[2],
    tr[0], tr[1], tr[2],
    br[0], br[1], br[2],

    bl[0], bl[1], bl[2],
    tl[0], tl[1], tl[2],
    tr[0], tr[1], tr[2]
  );

  uvs.push(
    0,0, 1,1, 1,0,
    0,0, 0,1, 1,1
  );
}

function buildWorldMesh() {
  let sideVerts = [];
  let sideUVs = [];
  let topVerts = [];
  let topUVs = [];

  for (let i = 0; i < g_blocks.length; i++) {
    let b = g_blocks[i];

    let x0 = b.x - BLOCK_OFFSET;
    let y0 = BLOCK_BASE_Y + b.y;
    let z0 = b.z - BLOCK_OFFSET;

    let x1 = x0 + 1;
    let y1 = y0 + 1;
    let z1 = z0 + 1;

    if (!blockExists(b.x, b.y, b.z - 1)) {
      addQuad(
        sideVerts,
        sideUVs,
        [x0,y0,z0],
        [x1,y0,z0],
        [x1,y1,z0],
        [x0,y1,z0]
      );
    }

    if (!blockExists(b.x, b.y, b.z + 1)) {
      addQuad(
        sideVerts,
        sideUVs,
        [x1,y0,z1],
        [x0,y0,z1],
        [x0,y1,z1],
        [x1,y1,z1]
      );
    }

    if (!blockExists(b.x - 1, b.y, b.z)) {
      addQuad(
        sideVerts,
        sideUVs,
        [x0,y0,z1],
        [x0,y0,z0],
        [x0,y1,z0],
        [x0,y1,z1]
      );
    }

    if (!blockExists(b.x + 1, b.y, b.z)) {
      addQuad(
        sideVerts,
        sideUVs,
        [x1,y0,z0],
        [x1,y0,z1],
        [x1,y1,z1],
        [x1,y1,z0]
      );
    }

    if (!blockExists(b.x, b.y + 1, b.z)) {
      addQuad(
        topVerts,
        topUVs,
        [x0,y1,z0],
        [x1,y1,z0],
        [x1,y1,z1],
        [x0,y1,z1]
      );
    }

    if (!blockExists(b.x, b.y - 1, b.z)) {
      addQuad(
        sideVerts,
        sideUVs,
        [x0,y0,z1],
        [x1,y0,z1],
        [x1,y0,z0],
        [x0,y0,z0]
      );
    }
  }

  g_worldSideVertexCount = sideVerts.length / 3;
  g_worldTopVertexCount = topVerts.length / 3;

  if (g_worldSideVertexBuffer === null) g_worldSideVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldSideVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sideVerts), gl.STATIC_DRAW);

  if (g_worldSideUVBuffer === null) g_worldSideUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldSideUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sideUVs), gl.STATIC_DRAW);

  if (g_worldTopVertexBuffer === null) g_worldTopVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldTopVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(topVerts), gl.STATIC_DRAW);

  if (g_worldTopUVBuffer === null) g_worldTopUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldTopUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(topUVs), gl.STATIC_DRAW);
}

function drawWorldMesh() {
  drawMeshPart(g_worldSideVertexBuffer, g_worldSideUVBuffer, g_worldSideVertexCount, 1);
  drawMeshPart(g_worldTopVertexBuffer, g_worldTopUVBuffer, g_worldTopVertexCount, 2);
}

function drawMeshPart(vertexBuffer, uvBuffer, vertexCount, textureNum) {
  if (vertexCount === 0) return;

  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform4f(u_FragColor, 1, 1, 1, 1);

  let identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function isExposed(x, y, z) {
  return !blockExists(x+1, y, z) || !blockExists(x-1, y, z) ||
         !blockExists(x, y+1, z) || !blockExists(x, y-1, z) ||
         !blockExists(x, y, z+1) || !blockExists(x, y, z-1);
}

function drawMap() {
  for (let i = 0; i < g_blocks.length; i++) {
    let b = g_blocks[i];

    var wall = new Cube();
    wall.color = [1.0, 1.0, 1.0, 1.0];
    wall.textureNum = 1;
    wall.matrix.translate(b.x - BLOCK_OFFSET, BLOCK_BASE_Y + b.y, b.z - BLOCK_OFFSET);
    wall.render();
  }
}

function worldToBlockCell(x, y, z) {
  return [
    Math.floor(x + BLOCK_OFFSET),
    Math.floor(y - BLOCK_BASE_Y - 0.5),
    Math.floor(z + BLOCK_OFFSET)
  ];
}

function getBlockTarget() {
  let eye = g_camera.eye.elements;
  let at = g_camera.at.elements;

  let dx = at[0] - eye[0];
  let dy = at[1] - eye[1];
  let dz = at[2] - eye[2];

  let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len == 0) return null;

  dx /= len;
  dy /= len;
  dz /= len;

  let lastEmpty = null;

  for (let t = 0; t < 8; t += 0.05) {
    let wx = eye[0] + dx * t;
    let wy = eye[1] + dy * t;
    let wz = eye[2] + dz * t;

    let cell = worldToBlockCell(wx, wy, wz);
    let x = cell[0];
    let y = cell[1];
    let z = cell[2];

    if (!validBlockCell(x, y, z)) continue;

    if (treeExists(x, y, z)) {
    return {
      hit: [x, y, z],
      place: lastEmpty,
      type: "tree"
    };
  }

  if (blockExists(x, y, z)) {
    return {
      hit: [x, y, z],
      place: lastEmpty,
      type: "block"
    };
  }

    lastEmpty = [x, y, z];
  }

  return null;
}

function deleteBlockInFront() {
  let target = getBlockTarget();
  if (target == null || target.hit == null) return;

  if (target.type === "tree") {
    let key = blockKey(target.hit[0], target.hit[1], target.hit[2]);
    let wasGoldenTree = g_goldenTreeKeys.has(key);

    removeTreeAt(target.hit[0], target.hit[1], target.hit[2]);

    if (wasGoldenTree && !g_gameWon) {
      showWinScreen();
    }

    return;
  }

  removeBlockAt(target.hit[0], target.hit[1], target.hit[2]);
  buildWorldMesh();
}

function addBlockInFront() {
  let target = getBlockTarget();

  if (target != null && target.place != null) {
    addBlockAt(target.place[0], target.place[1], target.place[2]);
    buildWorldMesh();
    return;
  }

  let eye = g_camera.eye.elements;
  let at = g_camera.at.elements;

  let dx = at[0] - eye[0];
  let dy = at[1] - eye[1];
  let dz = at[2] - eye[2];

  let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len == 0) return;

  dx /= len;
  dy /= len;
  dz /= len;

  if (dy >= 0) return;

  let t = (BLOCK_BASE_Y - eye[1]) / dy;
  if (t < 0 || t > 8) return;

  let wx = eye[0] + dx * t;
  let wz = eye[2] + dz * t;

  let cell = worldToBlockCell(wx, BLOCK_BASE_Y, wz);
  addBlockAt(cell[0], 0, cell[2]);
  buildWorldMesh();
}

function SceneObjects() {
    g_sky = new SkyBox(0);

    g_world = new Cube();
    g_world.color = [0.2, 0.6, 0.2, 1.0];
    g_world.textureNum = -2;
    g_world.matrix.translate(0, BLOCK_BASE_Y + MIN_BLOCK_HEIGHT - 0.05, 0);
    g_world.matrix.scale(BLOCK_GRID_SIZE, 0.01, BLOCK_GRID_SIZE);
    g_world.matrix.translate(-0.5, 0, -0.5);

  }

  function makeBlockCube(block) {
    var wall = new Cube();
    wall.color = [1.0, 1.0, 1.0, 1.0];
    wall.textureNum = 1;
    wall.matrix.translate(
    block.x - BLOCK_OFFSET,
    BLOCK_BASE_Y + block.y,
    block.z - BLOCK_OFFSET
  );
  return wall;
}

function renderAllshapes(){
  var startTime = performance.now();

  uploadCameraMatrices();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  g_sky.render();

  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  g_world.renderFast();

  drawWorldMesh();
  drawTrees();


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