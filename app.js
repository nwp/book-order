var sys          = require('sys'),
    fs           = require('fs'),
    http         = require('http'),
    express      = require('express'),
    multiparser  = require('./multiparser'),
    _            = require('underscore')._,
    markdown     = require('node-markdown').Markdown,
    Story        = require('./models/story'),
    Attachment   = require('./models/attachment'),
    Notification = require('./models/notification');

var app = express.createServer(express.logger());
app.use(multiparser());
app.use(express.bodyParser());

var README = markdown(fs.readFileSync('./README.md', 'utf8'), true);

app.get('/', function(request, response) {
  response.send('<html><head><title>Book Order</title></head><body>' + README + '</body></html>');
});

app.post('/:gateway/projects/:project/stories/new/:token', function(request, response) {
  try {
    var attachments = [];
    
    switch(request.params.gateway){
    case 'sendgrid':
      for(var i=1; i<=parseInt(request.body.attachments); i++)
        attachments.push( request.body['attachment' + i]);
      break;
    case 'mailgun':
      for(var i=1; i<=parseInt(request.body['attachment-count']); i++)
        attachments.push(request.body['attachment-' + i]);
      break;
    }
        
    var story = new Story({
      projectId:   request.params.project,
      token:       request.params.token,
      from:        request.body.from,
      subject:     request.body.subject,
      body:        ( request.body['stripped-text'] || request.body['text'] ),
      attachments: attachments
    });

    story.bind('error', function(err) {
      console.log(err);
      if(process.env.BUG_NOTIFICATION_TO) {
        var notificationBody;
        try {
          notificationBody = "Sorry, there was an error processing mail.\n\n" +
                              "from: " + request.body.from + "\n" +
                              "subject: " + request.body.subject + "\n" +
                              "body:\n" + ( request.body['stripped-text'] || request.body['text'] ) + "\n\n" +
                              new String(err);
        } catch(e) {
          notificationBody = "Sorry, there was an error processing mail.\n\n" + new String(e) + "\n\n" + new String(err);
        }
        var notification = new Notification({
          body:        notificationBody,
          attachments: attachments
        });
        notification.send();
      }
    });
        
    if(process.env.STORY_NOTIFICATION_FROM) {
      story.bind('done', function(url) {
        var notification = new Notification({
          subject:     'PT Story Created',
          body:        "Your story has been created in Pivotal Tracker. You can see it here:\n\n" + url,
          from:        process.env.STORY_NOTIFICATION_FROM,
          to:          story.get('from')
        });
        notification.send();
      });
      
      if(process.env.ERROR_NOTIFICATION_TO_SENDER) {
        story.bind('uncreated', function(message) {
          var notification = new Notification({
            subject:     'PT Story Not Created',
            body:        message,
            from:        process.env.STORY_NOTIFICATION_FROM,
            to:          story.get('from')
          });
          notification.send();
        });
      }
    }

    story.save();
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
