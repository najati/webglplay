console.log("wtf is this");

CSG.prototype.setColor = function(r, g, b) {
  this.toPolygons().map(function(polygon) {
    polygon.shared = [r, g, b];
  });
};

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

var frame = 0.0;
var frameCount = 30;

var shaderProgram;
var canvas;
var gl;

var cameraSwing = 0;
var cameraHeight = 0;

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
  var swing = cameraSwing * Math.PI * 2;
  var cameraArm = 10;
  var cameraTall = 10;

  return mat4.lookAt(mat4.create(), vec3.fromValues(Math.cos(swing) * cameraArm, cameraHeight * cameraTall, Math.sin(swing) * cameraArm), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
}

// create a matrix for a perspective transform
function perspective() {
  return mat4.perspective(mat4.create(), glMatrix.toRadian(70.0), canvas.width/canvas.height, 0.1, 2000.0);
}

// create a matrix for a model transform
function moveBox(x, y, z, scale) {
  var transform = mat4.create();
  mat4.identity(transform)
  mat4.translate(transform, transform, vec3.fromValues(x, y, z));
  mat4.scale(transform, transform, vec3.fromValues(scale, scale, scale));
  return transform;
}


document.addEventListener("mousemove", function(event) {
    cameraSwing = event.clientX/document.querySelector('body').clientWidth;
    cameraHeight = 1 - event.clientY/document.querySelector('body').clientHeight;
});


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

function fancyShape() {
  var verts =  [];

  var a = CSG.cube();
  var b = CSG.sphere({ radius: 1.35, stacks: 12 });
  var c = CSG.cylinder({ radius: 0.7, start: [-1, 0, 0], end: [1, 0, 0] });
  var d = CSG.cylinder({ radius: 0.7, start: [0, -1, 0], end: [0, 1, 0] });
  var e = CSG.cylinder({ radius: 0.7, start: [0, 0, -1], end: [0, 0, 1] });
  a.setColor(1, 0, 0);
  b.setColor(1, 0, 0);
  c.setColor(1, 0, 0);
  d.setColor(1, 0, 0);
  e.setColor(1, 0, 0);

  var shape = a.intersect(b).subtract(c.union(d).union(e));
  console.log(shape);

  for (poly of shape.toPolygons()) {
    for (vert of poly.vertices) {
      verts.push(vec4.fromValues(vert.pos.x, vert.pos.y, vert.pos.z, 1));
    }
    verts.push(vec4.fromValues(poly.vertices[0].pos.x, poly.vertices[0].pos.y, poly.vertices[0].pos.z, 1));
  }

  return verts;
}

var vertices = cubeVertices(1);
vertices = toFlatArray(vertices);
vertices = new Float32Array(vertices);

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
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0, canvas.width, canvas.height);

  draw(vertices, moveBox(0, 0.5, 0, 1), [1.0, 0.0, 0.0]);

  var greenBoxX = 0.3 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(greenBoxX, 1, -3, 2), [0.0, 1.0, 0.0]);

  var blueBoxX = 0.3 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(3, 1, blueBoxX, 2), [0.0, 0.0, 1.0]);

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