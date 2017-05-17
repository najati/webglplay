console.log("wtf is this");

CSG.prototype.setColor = function(r, g, b) {
  this.toPolygons().map(function(polygon) {
    polygon.shared = [r, g, b];
  });
};

var vertCode = `
  precision mediump float;

  attribute vec4 coordinates;
  attribute vec4 vertexNormal;
  attribute vec3 color;
  
  uniform mat4 model;
  uniform mat4 projection;
  uniform mat4 normal;
  
  varying vec3 vertexColor;
  varying vec3 lighting;

  void main(void) {
    gl_Position = projection * model * coordinates;
    vertexColor = color;

    vec3 ambientLight = vec3(0.5, 0.5, 0.5);
    vec3 directionalLightColor = vec3(1, 1, 1);
    vec3 directionalVector = normalize(vec3(-1, 8, 1));

    vec4 transformedNormal = vertexNormal;

    float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    lighting = ambientLight + (directionalLightColor * directional);
  }
`;

var fragCode = `
  precision mediump float;

  varying vec3 vertexColor;
  varying vec3 lighting;

  void main(void) {
    gl_FragColor = vec4(vertexColor * lighting, 1.0);
  }
`;

var frame = 0.0;
var frameCount = 30;

var shaderProgram;
var canvas;
var gl;

var cameraSwing = 0;
var cameraHeight = 0;

// create a matrix for a camera transform
function camera() {
  var swing = cameraSwing * Math.PI * 2;
  var cameraArm = 10;
  var cameraTall = 20;

  return mat4.lookAt(mat4.create(), vec3.fromValues(Math.cos(swing) * cameraArm, cameraHeight * cameraTall - cameraTall/2, Math.sin(swing) * cameraArm), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
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


// a list of points that describes a cube centered around 0,0,0 as a line strip
function cubeVertices(size) {
  var s2 = size/2.0;
  return [
    -s2, -s2, -s2, 1,
    -s2, s2, -s2, 1,
    -s2, -s2, -s2, 1,
    -s2, -s2, s2, 1,
    -s2, s2, s2, 1,
    -s2, -s2, s2, 1,
    s2, -s2, s2, 1,
    s2, s2, s2, 1,
    s2, -s2, s2, 1,
    s2, -s2, -s2, 1,
    s2, s2, -s2, 1,
    -s2, s2, -s2, 1,
    -s2, s2, s2, 1,
    s2, s2, s2, 1,
    s2, s2, -s2, 1,
    s2, -s2, -s2, 1,
    -s2, -s2, -s2, 1
  ];
}

function fancyShape() {
  var verts = [];

  var a = CSG.cube();
  var b = CSG.sphere({ radius: 1.35, stacks: 12 });
  var c = CSG.cylinder({ radius: 0.7, start: [-1, 0, 0], end: [1, 0, 0] });
  var d = CSG.cylinder({ radius: 0.7, start: [0, -1, 0], end: [0, 1, 0] });
  var e = CSG.cylinder({ radius: 0.7, start: [0, 0, -1], end: [0, 0, 1] });
  a.setColor(1, 0, 0);
  b.setColor(0, 0, 1);
  d.setColor(0, 1, 0);
  c.setColor(0, 1, 0);
  e.setColor(0, 1, 0);

  var shape = a.intersect(b).subtract(c.union(d).union(e));

  for (poly of shape.toPolygons()) {
    for (var vert = 1; vert < poly.vertices.length - 1; vert++) {
      verts.push(
        poly.vertices[0].pos.x, poly.vertices[0].pos.y, poly.vertices[0].pos.z, 1, 
        poly.vertices[0].normal.x, poly.vertices[0].normal.y, poly.vertices[0].normal.z, 1, 
        poly.shared[0], poly.shared[1], poly.shared[2]
      );
      verts.push(
        poly.vertices[vert].pos.x, poly.vertices[vert].pos.y, poly.vertices[vert].pos.z, 1, 
        poly.vertices[vert].normal.x, poly.vertices[vert].normal.y, poly.vertices[vert].normal.z, 1,
        poly.shared[0], poly.shared[1], poly.shared[2]
      );
      verts.push(
        poly.vertices[vert+1].pos.x, poly.vertices[vert+1].pos.y, poly.vertices[vert+1].pos.z, 1, 
        poly.vertices[vert+1].normal.x, poly.vertices[vert+1].normal.y, poly.vertices[vert+1].normal.z, 1, 
        poly.shared[0], poly.shared[1], poly.shared[2]
      );
    }
  }

  return verts;
}

var vertices = fancyShape();
// var vertices = cubeVertices(1);
vertices = new Float32Array(vertices);

function draw(vertices, modelTransform) {
  var vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.useProgram(shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  var vertexNormal = gl.getAttribLocation(shaderProgram, "vertexNormal");
  var color = gl.getAttribLocation(shaderProgram, "color");
  gl.vertexAttribPointer(coord, 4, gl.FLOAT, false, 44, 0);
  gl.vertexAttribPointer(vertexNormal, 4, gl.FLOAT, false, 44, 16);
  gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 44, 32);

  gl.enableVertexAttribArray(coord);

  var modelLoc = gl.getUniformLocation(shaderProgram, "model");
  gl.uniformMatrix4fv(modelLoc, gl.FALSE, modelTransform);

  var normalMatrix = mat4.invert(mat4.create(), modelTransform);
  normalMatrix = mat4.transpose(mat4.create(), normalMatrix);
  var normal = gl.getUniformLocation(shaderProgram, "normal");
  gl.uniformMatrix4fv(normal, gl.FALSE, modelTransform);

  var projection = mat4.multiply(mat4.create(), perspective(), camera());
  var projectionLoc = gl.getUniformLocation(shaderProgram, "projection");
  gl.uniformMatrix4fv(projectionLoc, gl.FALSE, projection);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length/11);

  // var colorLoc = gl.getUniformLocation(shaderProgram, "color");
  // gl.uniform3f(colorLoc, 0, 0, 0);
  // gl.drawArrays(gl.LINE_LOOP, 0, vertices.length/4);
}


function drawFrame() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.clearColor(0.9, 0.9, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0, canvas.width, canvas.height);

  draw(vertices, moveBox(0, 0.5, 0, 1));

  var greenBoxX = 0.3 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(greenBoxX, 1, -4, 2));

  var blueBoxX = 0.3 * (Math.abs(frame - frameCount) - frameCount/2.0);
  draw(vertices, moveBox(4, 1, blueBoxX, 2));

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

  var attribute;
  attribute = gl.getAttribLocation(shaderProgram, 'coordinates');
  gl.enableVertexAttribArray(attribute);
  attribute = gl.getAttribLocation(shaderProgram, 'vertexNormal');
  gl.enableVertexAttribArray(attribute);
  attribute = gl.getAttribLocation(shaderProgram, 'color');
  gl.enableVertexAttribArray(attribute);
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

  document.addEventListener("mousemove", function(event) {
    cameraSwing = event.clientX/document.querySelector('body').clientWidth;
    cameraHeight = 1 - event.clientY/document.querySelector('body').clientHeight;
  });

  window.requestAnimationFrame(drawFrame);
});