Story = require('../models/story.js')
https  = require('https')

describe Story, ->

  describe "setTypeFromSubject", ->
    it "defaults to 'feature'", ->
      story = new Story
        subject: 'A Feature'
      story.setTypeFromSubject()
      expect(story.get('type')).toEqual('feature');

    it "sets 'bug' if inferred", ->
      story = new Story
        subject: 'This is a Bug'
      story.setTypeFromSubject()
      expect(story.get('type')).toEqual('bug');

  describe "setLabelsFromSubject", ->
    it "extracts individual labels in [foo] [bar] format", ->
      story = new Story
        subject: 'A Feature [foo] [bar]'
      story.setLabelsFromSubject()
      expect(story.get('labels')).toEqual(['foo', 'bar', 'new'])

    it "extracts individual labels in [foo, bar] format", ->
      story = new Story
        subject: 'A Feature [foo, bar]'
      story.setLabelsFromSubject()
      expect(story.get('labels')).toEqual(['foo', 'bar', 'new'])

    it "extracts individual labels in [foo, bar] [baz] format", ->
      story = new Story
        subject: 'A Feature [foo, bar] [baz]'
      story.setLabelsFromSubject()
      expect(story.get('labels')).toEqual(['foo', 'bar', 'baz', 'new'])

    it "does not change labels if already set", ->
      story = new Story
        labels: ['foo']
        subject: 'A Feature [bar]'
      story.setLabelsFromSubject()
      expect(story.get('labels')).toEqual(['foo'])

    it "removes specified labels from the subject", ->
      story = new Story
        subject: 'A Feature [foo]'
      story.setLabelsFromSubject()
      expect(story.get('subject')).toEqual('A Feature')

  describe "fromAddress", ->
    it "returns the name without the email address", ->
      story = new Story
        from: 'John Doe <john.doe@foo.com>'
      expect(story.fromAddress()).toEqual 'john.doe@foo.com'

  describe "ccAddress", ->
    it "returns the name without the email address", ->
      story = new Story
        cc: 'John Doe <john.doe@foo.com>'
      expect(story.ccAddress()).toEqual 'john.doe@foo.com'

      story = new Story
        cc: 'john.doe@foo.com'
      expect(story.ccAddress()).toEqual 'john.doe@foo.com'

  describe "toXml", ->
    story = null
    beforeEach ->
      story = new Story
        projectId: '123'
        token:     'abc'
        fromName:  'John Doe'
        ccName:  'John Doe'
        subject:   'Test'
        body:      'test body'

    it "returns the story xml", ->
      xml = story.toXml()
      expect(xml).toEqual(
        '<story><name>Test</name>' +
        '<story_type>feature</story_type>' +
        '<requested_by>John Doe</requested_by>' +
        '<owned_by>John Doe</owned_by>' +
        '<labels>new</labels><description>test body</description></story>'
      )

    it "escapes the name field value", ->
      story.set
        subject: 'Foo <Bar>'
      xml = story.toXml()
      expect(xml).toMatch(/<name>Foo &lt;Bar&gt;<\/name>/);

    it "escapes the requested_by field value", ->
      story.set
        fromName: 'John & Jane Doe'
      xml = story.toXml()
      expect(xml).toMatch(/<requested_by>John &amp; Jane Doe<\/requested_by>/);

    it "escapes the description field value", ->
      story.set
        body: 'Foo <Bar>'
      xml = story.toXml()
      expect(xml).toMatch(/<description>Foo &lt;Bar&gt;<\/description>/);

  describe "getUserNameFromXML", ->
    story = null
    xml = '<?xml version="1.0" encoding="UTF-8"?>
           <memberships type="array">
             <membership>
               <id>1</id>
               <person>
                 <email>john@example.com</email>
                 <name>John Smith</name>
                 <initials>JS</initials>
               </person>
               <role>Owner</role>
               <project>
                 <id>123</id>
                 <name>Foo</name>
               </project>
             </membership>
             <membership>
               <id>2</id>
               <person>
                 <email>jane@example.com</email>
                 <name>Jane Williams</name>
                 <initials>JW</initials>
               </person>
               <role>Owner</role>
               <project>
                 <id>123</id>
                 <name>Foo</name>
               </project>
             </membership>
           </memberships>'
    beforeEach ->
      story = new Story()
    
    it "returns the user name based on specified email", ->
      name = story.getUserNameFromXML(xml, 'jane@example.com')
      expect(name).toEqual('Jane Williams')

  describe "save", ->
    story = null
    beforeEach ->
      story = new Story
        projectId: '123'
        token:     'abc'
        from:      'John Doe <john.doe@foo.com>'
        cc:        'John Doe <john.doe@foo.com>'
        subject:   'Test'
        body:      'test body'

    describe "POST", ->
      onSpy = writeSpy = endSpy = null

      beforeEach ->
        onSpy    = jasmine.createSpy('on')
        writeSpy = jasmine.createSpy('write')
        endSpy   = jasmine.createSpy('end')
        spyOn(https, 'request').andReturn({on: onSpy, write: writeSpy, end: endSpy})
        spyOn(story, 'getUserNamesFromEmails').andCallFake (fromEmail,ccEmail, cb) ->
          cb('John Doe','John Doe')
        story.save()

      it "sends a POST to the PT api", ->
        params = https.request.mostRecentCall.args[0]
        expect(https.request).toHaveBeenCalled()
        params = https.request.mostRecentCall.args[0]
        expect(params.path).toEqual('/services/v3/projects/123/stories')
        expect(params.headers['X-TrackerToken']).toEqual('abc')
        expect(onSpy).toHaveBeenCalled()
        expect(onSpy.mostRecentCall.args[0]).toEqual('error')
        expect(writeSpy).toHaveBeenCalledWith(story.toXml())
        expect(endSpy).toHaveBeenCalled()
