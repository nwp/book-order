var sys         = require('sys'),
    fs          = require('fs'),
    http        = require('http'),
    express     = require('express'),
    multiparser = require('./multiparser'),
    mailer      = require('nodemailer'),
    _           = require('underscore')._,
    markdown    = require('node-markdown').Markdown,
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

var README = markdown(fs.readFileSync('./README.md', 'utf8'), true);

app.get('/', function(request, response) {
  response.send('<html><head><title>Book Order</title></head><body>' + README + '</body></html>');
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
