Story = require('../models/story.js')
http  = require('http')

describe Story, ->

  describe "fromName", ->
    it "returns the name without the email address", ->
      story = new Story
        from: 'John Doe <john.doe@foo.com>'
      expect(story.fromName()).toEqual 'John Doe'

  describe "toXml", ->
    story = null
    beforeEach ->
      story = new Story
        projectId: '123'
        token:     'abc'
        from:      'John Doe <john.doe@foo.com>'
        subject:   'Test'
        body:      'test body'

    it "returns the story xml", ->
      xml = story.toXml()
      expect(xml).toEqual(
        '<story><story_type>feature</story_type><name>Test</name>' +
        '<requested_by>John Doe</requested_by>' +
        '<labels>new</labels><description>test body</description></story>'
      )

    it "escapes the name field value", ->
      story.set
        subject: 'Foo <Bar>'
      xml = story.toXml()
      expect(xml).toMatch(/<name>Foo &lt;Bar&gt;<\/name>/);

    it "escapes the requested_by field value", ->
      story.set
        from: 'John & Jane Doe <jj@foo.com>'
      xml = story.toXml()
      expect(xml).toMatch(/<requested_by>John &amp; Jane Doe<\/requested_by>/);

    it "escapes the description field value", ->
      story.set
        body: 'Foo <Bar>'
      xml = story.toXml()
      expect(xml).toMatch(/<description>Foo &lt;Bar&gt;<\/description>/);

  describe "save", ->
    story = null
    beforeEach ->
      story = new Story
        projectId: '123'
        token:     'abc'
        from:      'John Doe <john.doe@foo.com>'
        subject:   'Test'
        body:      'test body'

    describe "POST", ->
      onSpy = writeSpy = endSpy = null

      beforeEach ->
        onSpy    = jasmine.createSpy('on')
        writeSpy = jasmine.createSpy('write')
        endSpy   = jasmine.createSpy('end')
        spyOn(http, 'request').andReturn({on: onSpy, write: writeSpy, end: endSpy})
        story.save()

      it "sends a POST to the PT api", ->
        expect(http.request).toHaveBeenCalled()
        params = http.request.mostRecentCall.args[0]
        expect(params.path).toEqual('/services/v3/projects/123/stories')
        expect(params.headers['X-TrackerToken']).toEqual('abc')
        expect(onSpy).toHaveBeenCalled()
        expect(onSpy.mostRecentCall.args[0]).toEqual('error')
        expect(writeSpy).toHaveBeenCalledWith(story.toXml())
        expect(endSpy).toHaveBeenCalled()
