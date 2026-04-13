let snake_body = [{x:0,y:0}], snake_dir = {x:.05,y:0}, snake_food, snake_active = false, snake_score = 0;

// generate randome position on grid to spawm
function snakeRandomPos() {
  return {x:(Math.floor(Math.random()*20)-10)*.05, y:(Math.floor(Math.random()*20)-10)*.05};
}

// draw square using two trangles 
function drawSquare(x, y, s, rgba) {
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  drawTriangle([x,y, x+s,y, x,y+s]);
  drawTriangle([x+s,y+s, x+s,y, x,y+s]);
}

//reset and start new game
function startSnake() {
  snake_body = [{x:0,y:0}]; snake_dir = {x:.05,y:0};
  snake_food = snakeRandomPos(); snake_active = true; snake_score = 0;
  gameLoop();
}

// main game loop 
function gameLoop() {
  if (!snake_active) return;
  let head = {x: snake_body[0].x + snake_dir.x, y: snake_body[0].y + snake_dir.y};

  if (head.x>1||head.x<-1||head.y>1||head.y<-1||
      snake_body.some(s => Math.abs(s.x-head.x)<.01 && Math.abs(s.y-head.y)<.01)) {
    snake_active = false;
    sendTextToHTML("Game Over, Lasanga Eaten: "+snake_score, "numdot");
    return;
  }

  // adds new body to front of head 
  snake_body.unshift(head);
  // checks if food eaten
  if (Math.abs(head.x-snake_food.x)<.05 && Math.abs(head.y-snake_food.y)<.05) {
    snake_score++; snake_food = snakeRandomPos();
  } else { snake_body.pop(); }

  // render snake, food and score 
  gl.clear(gl.COLOR_BUFFER_BIT);
  snake_body.forEach((s, i) => {
    let color = i % 3 === 0 ? [0.4, 0.2, 0.0, 1.0] : [0.8, 0.4, 0.0, 1.0];
    drawSquare(s.x, s.y, .04, color);
        });
  drawSquare(snake_food.x, snake_food.y, .04, [1.0, 0.8, 0.0, 1.0]);
  sendTextToHTML("Lasanga Eaten: "+snake_score, "numdot");
  setTimeout(gameLoop, 150);
}

// arrow keys, prevents page scrolling while game active
document.addEventListener('keydown', e => {
  let dirs = {ArrowUp:{x:0,y:.05}, ArrowDown:{x:0,y:-.05}, ArrowLeft:{x:-.05,y:0}, ArrowRight:{x:.05,y:0}};
  if (dirs[e.key]){ 
    e.preventDefault();
    snake_dir = dirs[e.key];}
});