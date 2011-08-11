var Backbone = require('backbone'),
    mailer   = require('nodemailer');
    _        = require('underscore')._,
    fs       = require('fs');


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

var Notification = module.exports = Backbone.Model.extend({

  // attributes:
  // subject
  // body
  // attachments
  // from (optional)
  // to (optional)

  subject: function() {
    return this.get('subject') || 'Book Order Proxy Failure';
  },

  from: function() {
    return this.get('from') || process.env.BUG_NOTIFICATION_FROM;
  },

  to: function() {
    return this.get('to') || process.env.BUG_NOTIFICATION_TO;
  },

  send: function() {
    mailer.send_mail({
      subject:     this.subject(),
      sender:      this.from(),
      to:          this.to(),
      body:        this.get('body'),
      attachments: _.map(this.get('attachments'), function(att) {
        return {
          filename: att.filename,
          contents: fs.readFileSync(att.path)
        };
      })
    }, function(err, result){
      if(err){ console.log(err); }
    });
  }
});
