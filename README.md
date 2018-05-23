# apn_bc_prebid_vast

> A free and open source library for publishers to quickly implement a plugin for a videoJS player, such as Brightcove Player.  This plugin may be used to invoke prebid.js to execute the prebidding process.  It may also be used to render the "selected" video ad within the player.

This README is for developers who want to use and/or contribute to apn_bc_prebid_vast.
Additional documentation can be found at [the Brightcove Prebid Plugin homepage](http://prebid.org/dev-docs/plugins/brightcove-prebid-plugin/About-BC-Prebid-Plugin.html).
Working examples can be found in [Sample Implementations](http://prebid.org/dev-docs/plugins/brightcove-prebid-plugin/SampleImplementations/*.html) for the plugin.

**Table of Contents**

- [Plugin Partners](#Partners)
- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Deploy](#Deploy)
- [Contribute](#Contribute)

<a name="Partners"></a>
## Plugin Partners
A successful deployment of this plugin not only includes a build of this plugin but the inclusion of other components that are also provided in this repository and a companion repository.  These partners include:
- **MailOnline plugin** - by default this plugin uses a customized build of the public MailOnline plugin to render the video ad. 
-- This rendering plugin is availabe from: `https://github.com/prebid/videojs-mailonline-plugin.git`.  
-- You may use the MailOnline plugin as is or you may create your own build.  
-- Alternatively, you may also partner the prebid plugin with your own rendering code.  Details about how to do this is provided below under HOW TO BUILD AND RUN PROJECT LOCALLY.
- **MailOnline CSS** - If you are using the MailOnline rendering plugin, you also need to load the CSS file associated with the MailOnline plugin.  This CSS file is provided in the companion MailOnline repository mentioned above at the following location: `./videojs-mailonline-plugin/bin/apn_vpaid_vast_mo.css`.
- **Prebid Plugin CSS** - This prebid plugin also supplies an additional CSS file that must be loaded along with this plugin.  This CSS file is located in this repository at: `./prebid-js-plugin-brightcove/src/apn_bc_prebid_vast_vjs.css`.
- **Markers Plugin** - This plugin incorporates code from the Markers plugin: `https://github.com/spchuang/videojs-markers/`. 
-- The Markers code is used to help launch ad playback at different points along the timeine. 
-- This code has been added directly in this plugin and is found in `./prebid-js-plugin-brightcove/src/MarkersHandler.js`.

<a name="Install"></a>

## Install

    $ git clone https://github.com/prebid/prebid-js-plugin-brightcove.git
    $ cd prebid-js-plugin-brightcove
    $ npm install

*Note:* You need to have `NodeJS` 4.x or greater installed.

<a name="Build"></a>

## Build Stand-Alone Plugin

To build the project on your local machine, run:

    $ gulp

This runs some code quality checks and generates the following files:

+ `./dist/apn_bc_prebid_vast.min.js` - Minified production code
+ `./dist/apn_bc_prebid_vast.js` - Non-minified production code

<a name="Run"></a>

## Test locally

To lint the code:

```bash
gulp lint
```

To run the unit tests:

```bash
gulp test
```

To generate and view the code coverage reports:

```bash
gulp ci-test
```

## HOW TO BUILD AND RUN PROJECT LOCALLY
Steps:
1. (optional) Update host file
2. (optional) Modify path to ad renderer - by default, MailOnline
3. Build the plugin
4. Select test page to test with
a. Modify path to your prebid plugin build
b. (optional) Modify path to prebid plugin CSS file
c. (optional) Modify path to MailOnline CSS file
d. (optional) Modify path to the prebid.js

### Update Host File (optional step)
To build and run this project locally, you must first modify your host file to setup an alias for local.appnexus if you are planning on using an AppNexus bidder.  Otherwise, your "localhost" domain may become blacklisted by AppNexus.

Add the following line to your host file:
```bash
127.0.0.1       local.appnexus
```
### Modify path to MailOnline plugin (optional step)
You can either create your own custom build of the MailOnline plugin or you can replace the MailOnline plugin with your own ad rendering code.

#### Using your own build of MailOnline plugin
If you have either created your own build of the MailOnline plugin or if you are replacing the MailOnline plugin with your own rendering code, you will need to modify the path that the plugin uses to load the rendering plugin
- the path to the rendering plugin is defined in `./src/ApnPrebidVast.js>loadApnMolPlugin(callback)`
- the MailOnline plugin is invoked in `./src/VastManager.js>playAd(xml)`

#### Using your own rendering code
If you are replacing the MailOnline rendering plugin with your own custom rendering code, you need to change the code where currently the MailOnline plugin is loaded and invoked.
- Your renderer must be compatible with the Brightcove Player environment.
- Remove the following function which is used to load the MailOnline plugin: `./src/ApnPrebidVast.js>loadApnMolPlugin(callback)`
-- Make sure that all calls to this function have also been removed from your plugin code.
- Add code to load in your rendering script, if needed
- Re-write the following function which currently invokes the MailOnline plugin to play the ad:  `./src/VastManager.js>playAd(xml)`
- Modify the communication code between your renderer and `./src/VastManager.js` so that ad playback is synchronized with the playing of the main content in the Brightcove Player.  Currently, the `VastManager` is using the following events to manage this syncronization:
-- `vast.adStart`
-- `vast.adError`
-- `vast.adsCancel`
-- `vast.adSkip`
-- `vast.reset`
-- `vast.contentEnd`
-- `adFinished`

### Build the Plugin
Build and run the project locally with:
```bash
gulp dev-server
```

This builds the plugin and starts a web server at `http://local.appnexus:8082` serving from the project root.
Navigate to your example implementation to test, and if you use the `./dist/apn_bc_prebid_vast.js` file, you will have sourcemaps available in your browser's developer tools.

### Select Test Page
##### Sample Test Pages
There are several test pages that are provided with the plugin which uses the plugin in a variety of ways. These test pages are provided in the repository at: `./tests/e2e/testPages/`
You may select whichever style you want to test. See `http://prebid.org/dev-docs/plugins/brightcove-prebid-plugin/BC-Prebid-Plugin-Options.html` for details on all the options that can be passed to the plugin.
- `prebid-main.html`
    - This page can be used to launch any of the test pages listed below.
    - If you launch the pages directly from this page, an additional query string parameter will be added to the page url that enables additional browser console logging that may be useful in debugging.
- `prebid-header.html`
    - this test page invokes the prebid process in the header of the page
    - the results of prebid are then rendered by plugin once the Brightcove Player is loaded.
    - you can configure the prebid options to either use DFP as the primary ad server or to use no ad server.
- `prebid-header-ad-server.html`
    - this test page invokes the prebid process in the header of the page
    - the results of prebid are then passed to a preferred ad server, via the `adServerCallback` option, so that the preferred ad server can make the final decision about which ad to play.
    - the selected creative is then passed back to plugin so that the plugin can render the selected ad
- `prebid-body.html`
    - this test page invokes the prebid process in the body of the page, after the Brightcove Player has been loaded.
    - the results of prebid are then rendered by plugin once the Brightcove Player is loaded.
    - you can configure the prebid options to either use DFP as the primary ad server or to use no ad server.
- `prebid-body-ad-server.html`
    - this test page invokes the prebid process in the body of the page, after the Brightcove Player has been loaded.
    - the results of prebid are then passed to a preferred ad server, via the `adServerCallback` option, so that the preferred ad server can make the final decision about which ad to play.
    - the selected creative is then passed back to plugin so that the plugin can render the selected ad
- `prebid-studio-config.html`
    - this page can be used to test using the plugin if you choose to configure the plugin in the Brightcove Studio.
    - you will have to replace the player embed code with the embed code for your own player instance.
    - you will need to make sure that all the paths to the plugin, CSS files and prebid.js are configured correctly in the Studio
    - this page invokes the prebid process as the Brightcove Player is loading
    - you can configure the prebid options to either use DFP as the primary ad server or to use no ad server in the options that are specified in the Studio.


#### Test Page Modifications
Before testing, you may need to make the following changes to your selected test page:
- Change the path used to load the prebid plugin to point to your plugin build.
- (optional) Change the path used to load in the prebid  plugin CSS file to point to your plugin CSS location 
- (optional) Change the path used to load in the CSS file for MailOnline (or your renderer).
- If you want to use your own instance of the Brightcove Player, you need to replace the Brightcove Player embedding code that is on the provided test page with your player code.
- If you are replacing the Brightcove Player embedding code, be sure to add the id attribute to the player and set it to `test_player`.  If you have changed the id elsewhere in your code, the id of the player must match the player id that you are passing to doPrebid() in the plugin.

As an example, to run the prebid-body.html test page, go to:

+ `http://local.appnexus:8082/prebid-body.html`

As you make code changes, the bundles will be rebuilt but you must refresh the page to test the new code.

<a name="Deploy"></a>

## How To Deploy This Plugin
When you are ready to deploy your build of this plugin, you need to make sure that all the paths are set up correctly.  Depending on how you are integrating the plugin with your player, the paths can be defined:
- on the player page or in scripts loaded on the page
- in the configuration of the plugin set up in Brightcove Studio
 
Make sure the following paths are correct:
- plugin path should point to your build of the plugin
- path to MailOnline CSS file
- path to plugin CSS file
- path to your build of prebid.js

<a name="Contribute"></a>

## Contribute

SSPs and publishers may contributed to this project. 

For guidelines, see [Contributing](https://github.com/prebid/prebid-js-plugin-brightcove/tree/master/CONTRIBUTING.md).

Our PR review process can be found [here](https://github.com/prebid/prebid-js-plugin-brightcove/tree/master/PR_REVIEW.md). 

### Code Quality

Code quality is defined by `.eslintrc` and errors are reported in the terminal.

If you are contributing code, you should [configure your editor](http://eslint.org/docs/user-guide/integrations#editors) with the provided `.eslintrc` settings.

### Unit Testing with Karma

        $ gulp test

This will run the tests. To keep the Karma test browser open, you need to modify `karma.conf.js` to set `singleRun` to `false`. If you test with the `apn_bc_prebid_vast.js` file, you will also have sourcemaps available when using your browser's developer tools.

+ To access the Karma debug page, go to `http://localhost:9876/debug.html`

+ For test results, see the console

+ To set breakpoints in source code, see the developer tools

Detailed code coverage reporting can be generated explicitly with

        $ gulp ci-test

The results will be in

        ./coverage


### Supported Browsers

apn_bc_prebid_vast is supported on IE11+ and modern browsers.

### Governance 
Review our governance model [here](https://github.com/prebid/prebid-js-plugin-brightcove/tree/master/governance.md).
