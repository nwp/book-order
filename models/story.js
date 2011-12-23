var Backbone   = require('backbone'),
    Attachment = require('./attachment'),
    _          = require('underscore')._,
    http       = require('http'),
    https      = require('https'),
    fs         = require('fs');

var ALWAYS_ADD_LABELS = ['new'];
var DEFAULT_TYPE      = 'feature'

// borrowed from Prototype.js
function escapeHTML(html) {
  return new String(html).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var Story = module.exports = Backbone.Model.extend({

  // attributes:
  // id -- set by save()
  // projectId
  // token
  // from
  // fromName - set automatically from api
  // subject
  // body
  // type - inferred from subject
  // labels - auto extracted from subject if empty
  // attachments
  
  initialize: function(attributes) {
    this.setTypeFromSubject();
    this.setLabelsFromSubject();
    _.bindAll(this, 'saveCallback', 'createAttachments', 'createAttachmentFromFile', 'getUserNameFromXML');
  },

  setTypeFromSubject: function() {
    if(new String(this.get('subject')).match(/bug/i)) {
      this.set({type: 'bug'});
    } else {
      this.set({type: DEFAULT_TYPE});
    }
  },

  setLabelsFromSubject: function() {
    if(this.get('labels')) return;
    var labels = [];
    var re = /\[[^\]]+\]/g;
    var match;
    while(match = re.exec(this.get('subject'))) {
      labels = labels.concat(match[0].replace(/\[|\]/g, '').split(/\s*,\s*/));
    }
    labels = labels.concat(ALWAYS_ADD_LABELS);
    var subject = new String(this.get('subject')).replace(re, '').replace(/^\s+|\s+$/, '');
    this.set({labels: labels, subject: subject});
  },
  
  fromAddress: function() {
    return new String(this.get('from')).match(/<([^>]+)>/)[1];
  },
  
  toXml: function() {
    return '<story><name>'  + escapeHTML(this.get('subject'))           + '</name>' +
           '<story_type>'   + escapeHTML(this.get('type'))              + '</story_type>' +
           '<requested_by>' + escapeHTML(this.get('fromName'))          + '</requested_by>' +
           '<labels>'       + escapeHTML(this.get('labels').join(', ')) + '</labels>' +
           '<description>'  + escapeHTML(this.get('body'))              + '</description></story>';
  },

  getUserNameFromEmail: function(email, cb) {
    var req = https.request({
      host:    'www.pivotaltracker.com',
      port:    443,
      method:  'GET',
      path:    '/services/v3/projects/' + this.get('projectId') + '/memberships',
      headers: {'X-TrackerToken': this.get('token')}
    }, _.bind(function(res) {
      res.setEncoding('utf8');
      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', _.bind(function() {
        if(body.match(/<memberships/)) {
          cb(this.getUserNameFromXML(body, email));
        } else {
          console.log(body);
          this.trigger('error', body);
        }
      }, this));
    }, this));
    req.on('error', _.bind(this.trigger, this, 'error'));
    req.end();
  },

  getUsersFromXML: function(xml) {
    var re = /<email>([^<]+)<\/email>\s*<name>([^<]+)<\/name>/mg;
    var match;
    var emails = {};
    while(match = re.exec(xml)) {
      emails[match[1].toLowerCase()] = match[2];
    }
    return emails;
  },

  getUserNameFromXML: function(xml, email) {
    return this.getUsersFromXML(xml)[email];
  },

  save: function() {
    this.getUserNameFromEmail(this.fromAddress(), _.bind(function(name) {
      this.set({fromName: name});
      var storyXml = this.toXml();
      
      var req = https.request({
        host:   'www.pivotaltracker.com',
        port:   443,
        method: 'POST',
        path:   '/services/v3/projects/' + this.get('projectId') + '/stories',
        headers: {
          'X-TrackerToken': this.get('token'),
          'Content-Type':   'application/xml',
          'Content-Length': storyXml.length
        }
      }, this.saveCallback);
      
      req.on('error', _.bind(this.trigger, this, 'error'));

      req.write(storyXml);
      req.end();
    }, this));
  },

  saveCallback: function(res) {
    res.setEncoding('utf8');
    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', _.bind(function() {
      try {
        if (res.statusCode == "200") {
          var storyId = body.match(/<id.*?>(\d+)<\/id>/m)[1];
          var storyUrl = body.match(/<url>([^<]+)<\/url>/m)[1];
          this.set({id: storyId});
          if(this.get('attachments').length > 0) {
            this.createAttachments(_.bind(this.trigger, this, 'done', storyUrl));
          } else {
            this.trigger('done', storyUrl)
          }
        }else {
          this.handlePivotalError(res,body);
        }
      } catch(e) {
        console.log('PT Response Body: ' + body);
        this.trigger('error', new String(e) + "\n\n" + body);
      }
    }, this));
  },

  handlePivotalError: function(response,resBody) {
    var message = "Unfortunately, Book Order could not create new story for you due to following errors:\n\n- ";
    switch(response.statusCode.toString()){
    case '422':
      var mapper = JSON.parse(fs.readFileSync('./pt_message_mapper.json','utf8'));
      var message_patterns = Object.keys(mapper);
      var pivotalMessage = resBody.match(/<error>.*?<\/error>/g)[0].match(/<error>(.*)<\/error>/)[1];
      
      message_patterns.forEach(function(pattern){
        if ( pivotalMessage.match(new RegExp(pattern)) )
          pivotalMessage = mapper[pattern];
      });
      
      message += pivotalMessage;
      break;
    case '500': case '501': case '502': case '503': case '504': case '505':
      message += "Pivotal Tracker server error.";
      break;
    default:
      message = "We are sorry, something went wrong and Book Order could not create new story for you.";
    } 
    this.trigger('uncreated',message);    
    this.trigger('error','Response status: ' + response.statusCode.toString() + '\n\n' + resBody);
  },
  
  createAttachments: function(cb) {
    var count = this.get('attachments').length;
    _.each(this.get('attachments'), function(file) {
      fs.readFile(file.path, null, _.bind(function(err, data) {
        if(err) this.trigger('error', err);
        this.createAttachmentFromFile(file, data, _.bind(function() {
          count--;
          if(count == 0) cb();
        }, this));
      }, this));
    }, this)
  },

  createAttachmentFromFile: function(file, data, cb) {
    var attachment = new Attachment({
      projectId: this.get('projectId'),
      storyId:   this.get('id'),
      token:     this.get('token'),
      file:      file,
      data:      data
    });
    attachment.bind('error', _.bind(this.trigger, this, 'error'));
    attachment.bind('done', cb);
    attachment.save();
  }
});
