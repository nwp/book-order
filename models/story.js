var Backbone   = require('backbone'),
    Attachment = require('./attachment'),
    _          = require('underscore')._,
    http       = require('http'),
    fs         = require('fs');

// borrowed from Prototype.js
function escapeHTML(html) {
  return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var Story = module.exports = Backbone.Model.extend({

  // attributes:
  // id -- set by save()
  // projectId
  // token
  // from
  // subject
  // body
  // attachments
  
  initialize: function() {
    _.bindAll(this, 'saveCallback', 'createAttachments', 'createAttachmentFromFile');
  },
  
  fromName: function() {
    return this.get('from').replace(/\s*<.*>/, '');
  },
  
  toXml: function() {
    return '<story><story_type>feature</story_type><name>' + escapeHTML(this.get('subject')) + '</name>' +
           '<requested_by>' + escapeHTML(this.fromName()) + '</requested_by>' +
           '<labels>new</labels><description>' + escapeHTML(this.get('body')) + '</description></story>';
  },

  save: function() {
    var storyXml = this.toXml();
    
    var req = http.request({
      host:   'www.pivotaltracker.com',
      port:   80,
      method: 'POST',
      path:   '/services/v3/projects/' + this.get('projectId') + '/stories',
      headers: {
        'X-TrackerToken': this.get('token'),
        'Content-Type':   'application/xml',
        'Content-Length': storyXml.length
      }
    }, this.saveCallback);
    
    req.on('error', function(e) {
      throw(e.message)
    });

    req.write(storyXml);
    req.end();
  },

  saveCallback: function(res) {
    res.setEncoding('utf8');
    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', _.bind(function() {
      var storyId = body.match(/<id.*?>(\d+)<\/id>/m)[1];
      this.set({id: storyId});
      this.createAttachments();
    }, this));
  },

  createAttachments: function() {
    _.each(this.get('attachments'), function(file) {
      fs.readFile(file.path, null, _.bind(function(err, data) {
        if(err) throw err;
        this.createAttachmentFromFile(file, data);
      }, this));
    }, this)
  },

  createAttachmentFromFile: function(file, data) {
    var attachment = new Attachment({
      projectId: this.get('projectId'),
      storyId:   this.get('id'),
      token:     this.get('token'),
      file:      file,
      data:      data
    });
    attachment.save();
  }
});
