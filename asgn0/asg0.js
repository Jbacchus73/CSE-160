// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // Draw a blue rectangle
  ctx.fillStyle = 'black'; // Set color to blue
  ctx.fillRect(0, 0, 400, 400);        // Fill a rectangle with the color

  let v1 = new Vector3([2.25, 2.25, 0]);
}

function drawVector(v,color){
  let canvas = document.getElementById('example');
  let ctx = canvas.getContext('2d');

  let centerX = 200; 
  let centerY = 200; 

  ctx.strokeStyle = color; 
  ctx.beginPath(); 
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + v.elements[0] * 20, centerY - v.elements[1]*20);
  ctx.stroke(); 
}

function handleDrawEvent(){
  let canvas = document.getElementById('example');
  let ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 400, 400);

  let x1 = document.getElementById('xinput1').value;
  let y1 = document.getElementById('yinput1').value;
  let v1 = new Vector3([x1,y1,0]);

  let x2 = document.getElementById('xinput2').value;
  let y2 = document.getElementById('yinput2').value;
  let v2 = new Vector3([x2,y2,0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

}

function handleDrawOperationEvent(){
  let canvas = document.getElementById('example');
  let ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 400, 400);

  let x1 = document.getElementById('xinput1').value;
  let y1 = document.getElementById('yinput1').value;
  let v1 = new Vector3([x1,y1,0]);

  let x2 = document.getElementById('xinput2').value;
  let y2 = document.getElementById('yinput2').value;
  let v2 = new Vector3([x2,y2,0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  let operation = document.getElementById('operation').value;
  let scalar = document.getElementById('scalar').value; 

  if(operation == "add"){
    let v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3,"green");
  }
  else if(operation == "sub"){
    let v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3,"green");
  }
  else if(operation == "div"){
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.div(scalar);
    v4.div(scalar);
    drawVector(v3,"green");
    drawVector(v4,"green");
  }
  else if(operation == "mul"){
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.mul(scalar);
    v4.mul(scalar);
    drawVector(v3,"green");
    drawVector(v4,"green");
  }
  else if(operation == "magnitude"){
    console.log("Magnitude v1: " + v1.magnitude()); 
    console.log("Magnitude v2: " + v2.magnitude()); 
  }
  else if(operation == "normalize"){
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.normalize(); 
    v4.normalize(); 
    drawVector(v3,"green");
    drawVector(v4,"green");
  }
  else if(operation == "angle"){
    console.log("Angle: " + angleBetween(v1, v2));
  }
  else if(operation == "area"){
    console.log("Area of the triangle: " + areaTriangle(v1, v2));
  }

}

function angleBetween(v1, v2){
  let dotProduct = Vector3.dot(v1,v2);

  let mag1 = v1.magnitude(); 
  let mag2 = v2.magnitude(); 

  let cosAlpha = dotProduct / (mag1 * mag2);
  let alpha = Math.acos(cosAlpha); 
  let degrees = alpha * (180 / Math.PI);

  return degrees;

}

function areaTriangle(v1, v2){
  let crossVector = Vector3.cross(v1,v2); 
  let area = (crossVector.magnitude() / 2);
  return area;
}
