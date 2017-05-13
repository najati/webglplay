console.log("wtf is this");


var SCREEN_WIDTH = 640;
var SCREEN_HEIGHT = 480;

// multiply all points in a list by a matrix
function transform(input, transformation) {
  var output = [];

  for(point of input) {
    var trf = vec4.create();
    vec4.transformMat4(trf, point, transformation);
    output.push(trf);
  }

  return output;
}

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

// divide all points by their w coordinate
function normalize(input) {
  var output = [];
  if (input.length < 1) return output;

  var last = input[0];
  for(point of input) {
    output.push(vec4.normalize(vec4.create(), point));
  }

  return output;
}

// create a matrix for a camera transform
function camera() {
  var out = mat4.create()
  mat4.lookAt(out, vec3.fromValues(45, 25, 95), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
  return out;
}

// create a matrix for a perspective transform
function perspective() {
  var out = mat4.create()
  mat4.perspective(out, glMatrix.toRadian(70.0), 4.0 / 3.0, 0.1, 2000.0);
  return out;
}

// create a matrix for a viewport transform
function viewport() {
  var out = mat4.create();
  mat4.fromTranslation(out, vec3.fromValues(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, 1));
  mat4.scale(out, out, vec3.fromValues(SCREEN_WIDTH/2, -SCREEN_HEIGHT/2, 1));
  return out;
}

// create a matrix for a moving a box
function moveBox(x, y, z, scale) {
  var transform = mat4.create();
  mat4.identity(transform)
  mat4.translate(transform, transform, vec3.fromValues(x, y, z));
  mat4.scale(transform, transform, vec3.fromValues(scale, scale, scale));
  return transform;
}

// treat the list of points as a line strip and create an image
function drawLines(points) {
  if (points.size() < 1) return;

  var first = points.at(0);
  for(second in points) {
    if (first != second) {
      draw(first.x, first.y, second.x, second.y);
      first = second;
    }
  }
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

// this is the 3D pipeline
function generateBoxLines(modelTransform) {
  // generate a list of points in model space
  var points = cubeVertices(10);

  // transform them into world space with a model transform
  var worldPoints = transform(points, modelTransform);

  // transform them into camera space with a camera transform
  var cameraPoints = transform(worldPoints, camera());

  // transform them into the viewing frustum (perspective space)
  // with a perspective transform
  var perspectivePoints = transform(cameraPoints, perspective());

  // normalize them by dividing by w
  var normalizedPerspectivePoints = normalize(perspectivePoints);

  // transform them into screen space points with a viewport transform
  var viewportPoints = transform(normalizedPerspectivePoints, viewport());

  return viewportPoints;
}

// int main(int argc ,char *argv[]) {
//   try {
//     InitializeMagick(*argv);

//     vector<Magick::Image> animationFrames;

//     int frameCount = 60;
//     for (int i = 0; i < frameCount; i++) {
//       Image frame(Geometry(SCREEN_WIDTH, SCREEN_HEIGHT), Color("black"));
//       frame.strokeWidth(1);
//       frame.animationDelay(5);

//       // create and draw a stationary red box
//       frame.strokeColor("red");
//       drawLines(frame, generateBoxLines(moveBox(0, 5, 0, 1)));

//       // create and draw a larger green box sliding along the x axis
//       frame.strokeColor("green");
//       auto greenBoxX = 3.f * (abs(i - frameCount / 2) - frameCount/4);
//       drawLines(frame, generateBoxLines(moveBox(greenBoxX, 10, -30, 2)));

//       // create and draw a larger blue box sliding along the z axis
//       frame.strokeColor("blue");
//       auto blueBoxX = 3.f * (abs(i - frameCount / 2) - frameCount/4);
//       drawLines(frame, generateBoxLines(moveBox(30, 10, blueBoxX, 2)));

//       animationFrames.push_back(frame);
//     }

//     Magick::writeImages(animationFrames.begin(), animationFrames.end(), "out.gif");
//     return 0;
//   } catch( exception & error_ ) {
//     cout << "Caught exception: " << error_.what() << endl;
//     return 1;
//   }
// }

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

var frame = 0.0;
var frameCount = 60;
var shaderProgram;
var vertex_buffer;
var canvas;
var gl;

function draw(vertices, color) {
  var vpt = mat4.create();
  var vpt = mat4.scale(vpt, vpt, vec3.fromValues(1/320.0, -1/240.0, 0.0));
  mat4.translate(vpt, vpt, vec3.fromValues(-320.0, -240.0, 0.0));
  vertices = transform(vertices, vpt);

  vertices = toFlatArray(vertices);

  vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.useProgram(shaderProgram);

  /*======= Associating shaders to buffer objects ======*/
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);

  var colorLoc = gl.getUniformLocation(shaderProgram, "color");
  gl.uniform3f(colorLoc, color[0], color[1], color[2]);

  /*============ Drawing the triangle =============*/
  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/4);
}

function setupGLStuff() {
  canvas = document.getElementById('my_Canvas');
  gl = canvas.getContext('experimental-webgl');

  var vertCode =
    'precision mediump float;' +
    'attribute vec4 coordinates;' +
    'uniform vec3 color;' +
    'void main(void) {' +
       ' gl_Position = coordinates;' +
    '}';
  var vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertCode);
  gl.compileShader(vertShader);
  
  var fragCode =
    'precision mediump float;' +
    'uniform vec3 color;' +
    'void main(void) {' +
       'gl_FragColor = vec4(color, 1.0);' +
    '}';
  var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragCode);
  gl.compileShader(fragShader);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
}

function glCompileCheck(shader) {
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  console.log('Shader compiled successfully: ' + compiled);
  var compilationLog = gl.getShaderInfoLog(shader);
  console.log('Shader compiler log: ' + compilationLog);
}

function drawCallback() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0,canvas.width,canvas.height);

  var vertices = generateBoxLines(moveBox(0, 5, 0, 1));
  draw(vertices, [1.0, 0.0, 0.0]);

  var greenBoxX = 3.0 * (Math.abs(frame - frameCount/2.0) - frameCount/4.0);
  var vertices = generateBoxLines(moveBox(greenBoxX, 10, -30, 2));
  draw(vertices, [0.0, 1.0, 0.0]);

  var blueBoxX = 3.0 * (Math.abs(frame - frameCount/2.0) - frameCount/4.0);
  vertices = generateBoxLines(moveBox(30, 10, blueBoxX, 2));
  draw(vertices, [0.0, 0.0, 1.0]);

  window.requestAnimationFrame(drawCallback);

  frame+=0.5;
  if (frame == 60) frame = 0;
}

ready(function () {
  setupGLStuff();

  window.requestAnimationFrame(drawCallback);
});