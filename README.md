# Book Order

*Email to Pivotal Tracker Gateway*

This project accepts email

* posted by [SendGrid](http://sendgrid.com)
* routed via [Mailgun](http://mailgun.org)

and creates a new Story in Pivotal Tracker via the API.

## Features

* Creates new stories in Pivotal Tracker with subject as the title and the email body as the story description.
* You can put labels in the subject line in this format: `[foo] [bar]`
* If the subject contains the word "bug" (case insensitive), then the story type will be Bug (otherwise, it's a Feature).
* Support for attachments.

## Installation

    npm install
    ...
    git push heroku

## Configuration

For SendGrid you need to configure hostname and url address on the [Parse API settings page](http://sendgrid.com/developer/reply).

For MailGun you need to create a new Route.

This is destination url you need to use:

    http://APPURL/EMAIL_GATEWAY/projects/PROJECTID/stories/new/TOKEN

* Replace EMAIL_GATEWAY with one of these possible values: sendgrid, mailgun.
* Replace APPURL with the url of your ap on Heroku or elsewhere.
* Replace PROJECTID with the numeric project id from Pivotal Tracker (the id number in the URL when viewing the project).
* Replace TOKEN with your user API token from Pivotal Tracker.

## Setup

If you want notifications, be sure to set the following environment variables:

    STORY_NOTIFICATION_FROM
    ERROR_NOTIFICATION_TO_SENDER (set it if you want user to be informed about not created stories)
    BUG_NOTIFICATION_TO
    BUG_NOTIFICATION_FROM
    SMTP_HOST
    SMTP_PORT (optional)
    SMTP_USE_SSL (optional)
    SMTP_AUTH_USERNAME (optional)
    SMTP_AUTH_PASSWORD (optional)

On Heroku, you can set env vars like so:

    heroku config:add KEY=VAL

## Testing

    jasmine-node spec --coffee
    # or
    node node_modules/jasmine-node/lib/jasmine-node/cli.js spec --coffee
