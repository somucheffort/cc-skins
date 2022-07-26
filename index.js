var express = require('express');
var request = require('request');
var mkdirp = require('mkdirp');
var fs = require('fs');
var Canvas = require('canvas');
var app = express();

// instance-y vars
var size = 256;
var minSize = 8;
var maxSize = 2048;

var skinURL = "http://skinsystem.ely.by/skins/";


var renderFace = function(buffer, httpContext) {
  httpContext.res.type('png');
  httpContext.res.end(buffer, 'binary');
}

var drawFace = function(image, httpContext) {
  var faceSize = size;
  if (httpContext.req.query.size != undefined && httpContext.req.query.size.match(/^\d+$/)) {
    if (parseInt(httpContext.req.query.size) < minSize) {
      faceSize = minSize;
    } else if (parseInt(httpContext.req.query.size) > maxSize) {
      faceSize = maxSize;
    } else {
      faceSize = parseInt(httpContext.req.query.size);
    }
  }

  var canvas = new Canvas.Canvas(faceSize, faceSize);
  var context = canvas.getContext('2d');
  
  context.patternQuality = 'nearest';
  context.antialias = 'none';
  context.drawImage(image, 8, 8, 8, 8, 0, 0, faceSize, faceSize);
  if (!(httpContext.req.query.hat != undefined && httpContext.req.query.hat.match(/^(?:0|false)$/i))) {
    // if 'hat' is undefined, or 'hat' is anything other than false, draw the hat
    context.drawImage(image, 40, 8, 8, 8, 0, 0, faceSize, faceSize);
  }
  canvas.toBuffer(function(err, buffer) {
    renderFace(buffer, httpContext);
  });
}

var loadTexture = function(cacheName, httpContext) {
  fs.readFile('./cache/' + cacheName, function(err, data) {
    if (err) {
      // file does not exist, fetch it
      var r = request(skinURL + httpContext.req.query.u + ".png").pipe(fs.createWriteStream('./cache/' + cacheName));
      r.on('close', function() {
        loadTexture(cacheName, httpContext);
      });
    } else {
      // file does exist, continue processing
      var texture = new Canvas.Image;
      texture.src = data;
      drawFace(texture, httpContext);
    }
  });
}

var render = function(httpContext) {
  console.log
  console.log(skinURL + httpContext.req.query.u + ".png")
  request.get({
    url: skinURL + httpContext.req.query.u + ".png",
    followRedirect: true
  }, function(err, res, body) {
    console.log(res.statusCode)
    if (res.statusCode == 200) {
      var lastModified = new Date(res.headers['last-modified']);
      var cacheName = httpContext.req.query.u + "." + lastModified.getTime() + ".png";
      loadTexture(cacheName, httpContext);
    } else {
      fs.readFile('./assets/images/default.png', function(err, data) {
        var texture = new Canvas.Image;
        texture.src = data;
        drawFace(texture, httpContext);
      });
    }
  });
}

// legacy url structure support
app.get("/avatar", function(req, res) {
  render({req: req, res: res});
});

app.get("/", function(req, res) {
  res.sendStatus(418)
});

app.listen();
