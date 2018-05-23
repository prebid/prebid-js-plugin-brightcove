# Contributing to prebid-js-plugin-brightcove
Contributions are always welcome. To contribute, [fork](https://help.github.com/articles/fork-a-repo/) prebid-js-plugin-brightcove,
commit your changes, and [open a pull request](https://help.github.com/articles/using-pull-requests/) against the
master branch.

Pull requests must have 50% code coverage before being considered for merge.
Additional details about the process can be found [here](./pr_review.md).

## Issues
[prebid.org](http://prebid.org/) contains documentation that may help answer questions you have about using the Brightcove Prebid Plugin.
If you can't find the answer there, try searching for a similar issue on the [issues page](https://github.com/prebid/prebid-js-plugin-brightcove/issues).
If you don't find an answer there, [open a new issue](https://github.com/prebid/prebid-js-plugin-brightcove/issues/new).

## Documentation
If you have a documentation issue or pull request, please open a ticket or PR in the [documentation repository](https://github.com/prebid/prebid.github.io).

## Writing Tests

The prebid-js-plugin-brightcove plugin uses [Mocha](http://mochajs.org/) and [Chai](http://chaijs.com/) for unit tests. [Sinon](http://sinonjs.org/)
provides mocks, stubs, and spies. [Karma](https://karma-runner.github.io/1.0/index.html) runs the tests and generates
code coverage reports at `coverage/Chrome 66.0.3359 (Mac OS X 10.12.6)/index.html` Note that the exact version numbers may be different for your browser.

Tests are stored in the `tests/e2e/auto` directory. 
They can be run with the following command:

- `gulp test` - run the test suite once 

Before a Pull Request will be considered for merge:

- All new and existing tests must pass
- Added or modified code must have greater than 50% coverage

### Test Guidelines
When you are adding code to prebid-js-plugin-brightcove, or modifying code that isn't covered by an existing test, test the code according to these guidelines:

- If the module you are working on is already partially tested by a file within the `tests/e2e/auto` directory, add tests to that file
- If the module does not have any tests, create a new test file
- Group tests in a `describe` block
- Test individual units of code within an `it` block
- If you need to check `adloader.loadScript` in a test, use a `stub` rather than a `spy`. `spy`s trigger a network call which can result in a `script error` and cause unrelated unit tests to fail. `stub`s will let you gather information about the `adloader.loadScript` call without affecting external resources
- When writing tests you may use ES2015 syntax if desired

### Test Examples
prebid-js-plugin-brightcove already has several tests. Read them to see how prebid-js-plugin-brightcove is tested, and for inspiration:

- Look in `tests/e2e/auto` directory

