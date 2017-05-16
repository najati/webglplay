console.log("wtf is this");

var vertCode = `
  precision mediump float;

  attribute vec4 coordinates;

  uniform vec3 color;
  uniform mat4 model;
  uniform mat4 projection;

  void main(void) {
   gl_Position = projection * model * coordinates;
  }
`;

var fragCode = `
  precision mediump float;
  
  uniform vec3 color;

  void main(void) {
    gl_FragColor = vec4(color, 1.0);
  }
`;

var SCREEN_WIDTH = 640;
var SCREEN_HEIGHT = 480;

var frame = 0.0;
var frameCount = 30;

var shaderProgram;
var canvas;
var gl;


function toFlatArray(input) {
  var output = [];

  for(point of input) {
    output.push(point[0]);
    output.push(point[1]);
    output.push(point[2]);
    output.push(point[3]);
  }

  return output;
}




// create a matrix for a camera transform
function camera() {
  return mat4.lookAt(mat4.create(), vec3.fromValues(45, 25, 95), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
}

// create a matrix for a perspective transform
function perspective() {
  return mat4.perspective(mat4.create(), glMatrix.toRadian(70.0), 4.0 / 3.0, 0.1, 2000.0);
}

// create a matrix for a model transform
function moveBox(x, y, z, scale) {
  var transform = mat4.create();
  mat4.identity(transform)
  mat4.translate(transform, transform, vec3.fromValues(x, y, z));
  mat4.scale(transform, transform, vec3.fromValues(scale, scale, scale));
  return transform;
}




// a list of points that describes a cube centered around 0,0,0 as a line strip
function cubeVertices(size) {
  var s2 = size/2.0;
  return [
    vec4.fromValues(-s2, -s2, -s2, 1),
    vec4.fromValues(-s2, s2, -s2, 1),
    vec4.fromValues(-s2, -s2, -s2, 1),
    vec4.fromValues(-s2, -s2, s2, 1),
    vec4.fromValues(-s2, s2, s2, 1),
    vec4.fromValues(-s2, -s2, s2, 1),
    vec4.fromValues(s2, -s2, s2, 1),
    vec4.fromValues(s2, s2, s2, 1),
    vec4.fromValues(s2, -s2, s2, 1),
    vec4.fromValues(s2, -s2, -s2, 1),
    vec4.fromValues(s2, s2, -s2, 1),
    vec4.fromValues(-s2, s2, -s2, 1),
    vec4.fromValues(-s2, s2, s2, 1),
    vec4.fromValues(s2, s2, s2, 1),
    vec4.fromValues(s2, s2, -s2, 1),
    vec4.fromValues(s2, -s2, -s2, 1),
    vec4.fromValues(-s2, -s2, -s2, 1)
  ];
}

function draw(vertices, modelTransform, color) {
  var vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.useProgram(shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);

  var modelLoc = gl.getUniformLocation(shaderProgram, "model");
  gl.uniformMatrix4fv(modelLoc, gl.FALSE, modelTransform);

  var projection = mat4.multiply(mat4.create(), perspective(), camera());
  var projectionLoc = gl.getUniformLocation(shaderProgram, "projection");
  gl.uniformMatrix4fv(projectionLoc, gl.FALSE, projection);

  var colorLoc = gl.getUniformLocation(shaderProgram, "color");
  gl.uniform3f(colorLoc, color[0], color[1], color[2]);

  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/4);
}


function drawFrame() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0,canvas.width,canvas.height);

  var vertices = cubeVertices(10);
  vertices = toFlatArray(vertices);
  vertices = new Float32Array(vertices);

  draw(vertices, moveBox(0, 5, 0, 1), [1.0, 0.0, 0.0]);

  var greenBoxX = 3.0 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(greenBoxX, 10, -30, 2), [0.0, 1.0, 0.0]);

  var blueBoxX = 3.0 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(30, 10, blueBoxX, 2), [0.0, 0.0, 1.0]);

  window.requestAnimationFrame(drawFrame);

  frame+=0.5;
  if (frame >= frameCount*2) frame = 0;
}




function setupGLStuff() {
  canvas = document.getElementById('my_Canvas');
  gl = canvas.getContext('experimental-webgl');

  var vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertCode);
  gl.compileShader(vertShader);
  
  var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragCode);
  gl.compileShader(fragShader);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
}

function glCompileCheck(gl, shader) {
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  console.log('Shader compiled successfully: ' + compiled);
  var compilationLog = gl.getShaderInfoLog(shader);
  console.log('Shader compiler log: ' + compilationLog);
}


function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading')
        fn();
    });
  }
}

ready(function () {
  setupGLStuff();

  window.requestAnimationFrame(drawFrame);
});