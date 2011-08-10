# PT-Beanstalk Integration Proxy

Beanstalk does not offer a build-in Pivotal Tracker integration and
Pivotal Tracker doesn't natively understand and parse Beanstalk JSON
payloads. This proxy, therefore, bridges this gap by examining the
standard Beanstalk JSON payload, generating the appropriate Pivotal
Tracker XML, and posting it to the generic Pivotal Tracker commit
hook URL (http://www.pivotaltracker.com/services/v3/source\_commits).

## Installation

    npm install

## Testing

    jasmine-node spec --coffee
    # or
    node node_modules/jasmine-node/lib/jasmine-node/cli.js spec --coffee
