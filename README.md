# PT-Beanstalk Integration Proxy

Beanstalk does not offer a build-in Pivotal Tracker integration and
Pivotal Tracker doesn't natively understand and parse Beanstalk JSON
payloads. This proxy, therefore, bridges this gap by examining the
standard Beanstalk JSON payload, generating the appropriate Pivotal
Tracker XML, and posting it to the generic Pivotal Tracker commit
hook URL (http://www.pivotaltracker.com/services/v3/source\_commits).

## Installation

    npm install

## Setup

If you want bug notifications, be sure to set the following environment variables:

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
