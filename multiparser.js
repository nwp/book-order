// Example middleware for handling multipart forms. It should be
// "used" by an app sometime before the bodyDecoder.
//
// var Express = require('express');
// var MultiParser = require('./multiparser');
//
// var app = Express.createServer();
// app.use(MultiParser());
// app.use(Express.bodyDecoder());

var Formidable = require('formidable');

exports = module.exports = function bodyParser(opt) {
  return function bodyParser(req, res, next) {
    var parser = exports.parse[mime(req)];
    if (parser && !req.body) {
      parser(opt, req, res, next);
    }
    else {
      next();
    }
  };
};

// Grab the general mime type from a request.
function mime(req) {
  var str = req.headers['content-type'] || '';
  return str.split(';')[0];
}

function parseMultipart(opt, req, res, next) {
  var form = new Formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if (err)
      next(err);
    else {
      req.body = extend(fields, files);
      next();
    }
  });
}

function extend(target) {
  var key, obj;

  for (var i = 1, l = arguments.length; i < l; i++) {
    if ((obj = arguments[i])) {
      for (key in obj)
        target[key] = obj[key];
    }
  }

  return target;
}

exports.parse = {
  'multipart/form-data': parseMultipart
};
