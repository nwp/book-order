
var sys  = require('sys');
var fs = require('fs');
var http = require('http');
var express = require('express');
var multiparser = require('./multiparser')

var app = express.createServer(express.logger());
app.use(multiparser());
app.use(express.bodyParser());

app.get('/', function(request, response) {
  response.send('<html><head><title>Welcome to the PT-Beanstalk Proxy</title></head><body><h1>Welcome to the Pivotal Tracker-Beanstalk Web Hook Proxy!</h1><p>Beanstalk does not offer a build-in Pivotal Tracker integration and Pivotal Tracker doesn\'t natively understand and parse Beanstalk JSON payloads. This proxy, therefore, bridges this gap by examining the standard Beanstalk JSON payload, generating the appropriate Pivotal Tracker XML, and posting it to the generic Pivotal Tracker commit hook URL (http://www.pivotaltracker.com/services/v3/source_commits).</p></body></html>');
});

//http://pivotallabs.com/users/dan/blog/articles/1135-pivotal-tracker-api-new-version-v3-to-be-released-on-jan-23
app.post('/commits/new/:token', function(request, response) {
  var token = request.params.token;
  console.log('Pivotal Tracker API Token: ' + token);
  console.log('Payload: ' + request.body.payload);
  var payload = JSON.parse(request.body.payload);
  for (i = 0; i < payload.commits.length; i++) {
    try {
        var item = payload.commits[i];
      var message = item.message;
      var url = item.url;
      var id = item.id;
      var author = item.author.name;
      var xml = '<source_commit><message>' + message + '</message><author>' + author + '</author><commit_id>' + id + '</commit_id><url>' + url + '</url></source_commit>';
      console.log('Posting the following to Pivotal Tracker: ' + xml);
      
      var req = http.request({ host: 'www.pivotaltracker.com', port: 80, method: 'POST', path: '/services/v3/source_commits', headers: {'X-TrackerToken' : token, 'Content-Type' : 'application/xml', 'Content-Length' : xml.length} }, function(res) {
        console.log('PT Response status: ' + res.statusCode);
        console.log('PT Response headers: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
          console.log('PT Response body: ' + chunk);
        });
      });
      
      req.on('error', function(e) {
        console.log('An error was encountered: ' + e.message);
      });
      
      req.write(xml);
      req.end();
    }
  catch (exception) {
    console.log(sys.inspect(exception));
  }
  }
  response.send(200);
});

app.post('/projects/:project/stories/new/:token', function(request, response) {
  var project = request.params.project;
  var token = request.params.token;
  var sender = request.body.sender;
  var from = request.body.from;
  var subject = request.body.subject;
  var recip = request.body.recipient
  var body = request.body['body-plain'];
  var attCount = request.body['attachment-count'];
  
  console.log('Sender: ' + sender);
  console.log('From: ' + from);
  console.log('Recipient: ' + recip);
  console.log('Subject: ' + subject);
  console.log('Body: ' + body);
  console.log('Attachments: ' + attCount);
  try {
    var storyXml = '<story><story_type>feature</story_type><name>' + subject + '</name><requested_by>' + from.replace(/\s*<.*>/, '') + '</requested_by><labels>new</labels><description>' + body + '</description></story>';
    console.log('Posting the following to Pivotal Tracker: ' + storyXml);
    
    var req = http.request({ host: 'www.pivotaltracker.com', port: 80, method: 'POST', path: '/services/v3/projects/' + project + '/stories', headers: {'X-TrackerToken' : token, 'Content-Type' : 'application/xml', 'Content-Length' : storyXml.length} }, function(res) {
      console.log('PT Response status: ' + res.statusCode);
      console.log('PT Response headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      var respBody = '';
      res.on('data', function(chunk) {
        respBody += chunk;
      });
      res.on('end', function() {
        console.log('PT Response body: ' + respBody);
        var storyId = respBody.match(/<id.*?>(\d+)<\/id>/m)[1];
        console.log('PT Story ID: ' + storyId);

        // one api post per attachment
        for(var i=0; i<parseInt(attCount); i++) {
          var file = request.body['attachment-' + (i+1)];

          (function(file) {
            fs.readFile(file.path, null, function(err, data) {
              if(err) throw err;

              var boundary = Math.random();

              var headData = "--" + boundary + "\r\n" +
                             "Content-Disposition: form-data; name=\"Filedata\"; filename=\"" + file.filename + "\"\r\n" +
                             "Content-Type: " + file.mime + "\r\n\r\n";
              var tailData = "\r\n--" + boundary + "--";

              var attReq = http.request({
                host: 'www.pivotaltracker.com',
                port: 80,
                method: 'POST',
                path: '/services/v3/projects/' + project + '/stories/' + storyId + '/attachments',
                headers: {
                  'X-TrackerToken': token,
                  'Content-Type': 'multipart/form-data; boundary=' + boundary,
                  'Content-Length': headData.length + data.length + tailData.length
                }
              }, function(res) {
                res.setEncoding('utf8');
                var respBody = '';
                res.on('data', function(chunk) { respBody += chunk; });
                res.on('end', function() {
                  console.log('PT Attachment Response body: ' + respBody);
                });
              });

              attReq.on('error', function(e) {
                console.log('An error was encountered: ' + e.message);
              });

              attReq.write(new Buffer(headData));
              attReq.write(data);
              attReq.write(new Buffer(tailData));
              attReq.end();
            });
          })(file);
        }
      });
    });
    
    req.on('error', function(e) {
      console.log('An error was encountered: ' + e.message);
    });

    req.write(storyXml);
    req.end();
  }
  catch (exception) {
    console.log(sys.inspect(exception));
  }
  response.send(200);
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('Listening on ' + port);
});
