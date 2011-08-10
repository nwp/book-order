var sys         = require('sys'),
    fs          = require('fs'),
    http        = require('http'),
    express     = require('express'),
    multiparser = require('./multiparser'),
    mailer      = require('nodemailer'),
    _           = require('underscore')._,
    Story       = require('./models/story'),
    Attachment  = require('./models/attachment');

mailer.SMTP = {
  host:    process.env.SMTP_HOST,
  port:    process.env.SMTP_PORT || "25",
  ssl:     process.env.SMTP_USE_SSL ? true : false,
};

if(process.env.SMTP_AUTH_USERNAME) {
  mailer.SMTP.use_authentication = true;
  mailer.SMTP.user = process.env.SMTP_AUTH_USERNAME;
  mailer.SMTP.pass = process.env.SMTP_AUTH_PASSWORD;
};

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
  try {
    var attachments = [];
    for(var i=0; i<parseInt(request.body['attachment-count']); i++) {
      attachments.push(request.body['attachment-' + (i+1)]);
    }
    var story = new Story({
      projectId:   request.params.project,
      token:       request.params.token,
      from:        request.body.from,
      subject:     request.body.subject,
      body:        request.body['stripped-text'],
      attachments: attachments
    });
    story.save();
  }
  catch (exception) {
    console.log(sys.inspect(exception));
    if(process.env.BUG_NOTIFICATION_TO) {
      var notificationBody;
      try {
        notificationBody = "Sorry, there was an error processing mail.\n\n" +
                           "subject: " + request.body.subject + "\n" +
                           "body:\n" + request.body['stripped-text'] + "\n\n" +
                           new String(exception);
      } catch(e) {
        notificationBody = "Sorry, there was an error processing mail.\n\n" + new String(e) + "\n\n" + new String(exception);
      }
      mailer.send_mail({
        subject:     'PT-Beanstalk Failure',
        sender:      process.env.BUG_NOTIFICATION_FROM,
        to:          process.env.BUG_NOTIFICATION_TO,
        body:        notificationBody,
        attachments: _.map(attachments, function(att) {
          return {
            filename: att.filename,
            contents: fs.readFileSync(att.path)
          };
        })
      }, function(err, result){
        if(err){ console.log(err); }
      });
    }
  }
  response.send(200);
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log('Listening on ' + port);
});
