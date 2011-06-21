//http://pivotallabs.com/users/dan/blog/articles/1135-pivotal-tracker-api-new-version-v3-to-be-released-on-jan-23

var sys  = require('sys');
var http = require('http');
var express = require('express');

var app = express.createServer(express.logger());
app.use(express.bodyParser());

app.get('/', function(request, response) {
  response.send('<html><head><title>Welcome to the PT-Beanstalk Proxy</title></head><body><h1>Welcome to the Pivotal Tracker-Beanstalk Web Hook Proxy!</h1><p>Beanstalk does not offer a build-in Pivotal Tracker integration and Pivotal Tracker doesn\'t natively understand and parse Beanstalk JSON payloads. This proxy, therefore, bridges this gap by examining the standard Beanstalk JSON payload, generating the appropriate Pivotal Tracker XML, and posting it to the generic Pivotal Tracker commit hook URL (http://www.pivotaltracker.com/services/v3/source_commits).</p></body></html>');
});

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

app.post('/stories/new' function(request, response) {
  console.log('Sender: ' + request.body.sender);
  console.log('Recipient: ' + request.body.recipient);
  console.log('Subject: ' + request.body.subject);
  console.log('Body: ' + request.body['body-plain']);
  console.log('Attachments: ' + request.body['attachment-count']);
  resopnse.send(200);
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('Listening on ' + port);
});
