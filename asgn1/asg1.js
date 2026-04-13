// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
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
let u_Size; 

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('asg1');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

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

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

}
const POINT = 0; 
const TRIANGLE = 1; 
const CIRCLE = 2; 

let g_selectedColor= [1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
let g_selectedType=POINT; 
let g_selectedSeg = 10;
let g_strokeStarts = [];

function addActionsForHtmIUI(){
  //Button Events 
  document.getElementById('green').onclick = function() { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
  document.getElementById('red').onclick = function() { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
  document.getElementById('clearButton').onclick = function() {g_shapesList=[]; renderAllshapes();}; 

  document.getElementById('pointButton').onclick = function() {g_selectedType=POINT};
  document.getElementById('triButton').onclick = function() {g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick = function() {g_selectedType=CIRCLE};

  document.getElementById('segSlide').addEventListener('mouseup', function() { g_selectedSeg = this.value; });


  //Color Slider Events
  document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100; });
  document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100; });
  document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100; });  

  //Size Slider Events
  document.getElementById('sizeSlice').addEventListener('mouseup', function() { g_selectedSize = this.value;});

  // Undo Button
  document.getElementById('undoButton').onclick = function(){
  if (g_strokeStarts.length > 0) {
    let start = g_strokeStarts.pop();
    g_shapesList.length = start;
  }


  renderAllshapes();
};

// play game 
 document.getElementById('snakeButton').onclick = startSnake;

}


function main() {

  // setup canvas and gl variables
  setupWebGL(); 
  // setup glsl programs and connect glsl variables 
  connectVariablesToGLSL();
  addActionsForHtmIUI();


  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev){ 
    g_strokeStarts.push(g_shapesList.length); 
    click(ev); 
  }; 
  canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = []; 


function click(ev) {
  let [x,y] = convertCoordinatesEventToGL(ev); 

  let point; 
  if (g_selectedType == POINT){
    point = new Point(); 
  }
  else if(g_selectedType == TRIANGLE){
    point = new Triangle();
  }
  else {
    point = new Circle(); 
    point.segments = g_selectedSeg;
  }

  point.position = [x,y]; 
  point.color = g_selectedColor.slice(); 
  point.size = g_selectedSize;
  g_shapesList.push(point); 

  
  renderAllshapes();
  

}

function convertCoordinatesEventToGL(ev){
  var rect = canvas.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) - rect.width/2)/(rect.width/2);
  var y = (rect.height/2 - (ev.clientY - rect.top))/(rect.height/2);
  return([x,y]);
}

function renderAllshapes(){

  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration), "numdot");

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