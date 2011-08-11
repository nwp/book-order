var Backbone = require('backbone'),
    http       = require('http');

var Attachment = module.exports = Backbone.Model.extend({

  // attributes:
  // projectId or story
  // storyId or story
  // token
  // file - file object returned from MailGun
  // data - data object returned from fs.readFile

  projectId: function() {
    return this.get('projectId') || this.get('story').get('projectId');
  },

  storyId: function() {
    return this.get('storyId') || this.get('story').get('id');
  },

  // will only *create* an attachment -- does not yet update
  save: function() {

    // TODO: this multipart code should be abstracted
    var boundary = Math.random();
    var headData = "--" + boundary + "\r\n" +
                   "Content-Disposition: form-data; name=\"Filedata\"; filename=\"" + this.get('file').filename + "\"\r\n" +
                   "Content-Type: " + this.get('file').mime + "\r\n\r\n";
    var tailData = "\r\n--" + boundary + "--";

    var req = http.request({
      host:   'www.pivotaltracker.com',
      port:   80,
      method: 'POST',
      path:   '/services/v3/projects/' + this.projectId() + '/stories/' + this.storyId() + '/attachments',
      headers: {
        'X-TrackerToken': this.get('token'),
        'Content-Type':   'multipart/form-data; boundary=' + boundary,
        'Content-Length': headData.length + this.get('data').length + tailData.length
      }
    }, _.bind(function(res) {
      res.setEncoding('utf8');
      var body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', _.bind(function() {
        // TODO not sure what to check for here
        if(!body.match(/<status>Pending<\/status>/)) {
          this.trigger('error', 'Attachment not saved:' + body);
        }
      }, this));
    }, this));

    req.on('error', _.bind(this.trigger, this, 'error'));

    req.write(headData);
    req.write(this.get('data'));
    req.write(tailData);
    req.end();
  }

});
