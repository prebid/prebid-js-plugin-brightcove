/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// DEPENDENCIES
var _prebidGlobal = require('./PrebidGlobal.js');
var _logger = require('./Logging.js');

// CONSTANTS
var PLUGIN_VERSION = '0.4.1';
var PREBID_PLUGIN_ID = 'bcPrebidVastPlugin';
var DEFAULT_PLUGIN_JS_URL = '//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

var LOAD_NOT_STARTED = 0;
var LOAD_IN_PROGRESS = 1;
var LOAD_SUCCESS = 2;
var LOAD_FAILED = 3;

var LOGGER_PREFIX = 'PrebidPluginLoader->';

// EVENT TYPES
var PLUGIN_LOADED_EVENT = 'prebidPluginLoaded';
var PLUGIN_LOAD_FAILED_EVENT = 'prebidPluginLoadError';

// OBJECT REFS
var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();
var _vjs;
var _player;
var _options;
var _prebidPluginObj;
var _pluginScrEl;

// STATE
var _playerElId;
var _prebidPluginLoadState;

// PRIVATE FUNCTIONS

function start () {
	_logger.always(LOGGER_PREFIX, 'Plugin loader version: ' + PLUGIN_VERSION);

	// Update global refs
	updateVJSRef();

	_loaderId = Date.now().valueOf();
	_prebidPluginLoadState = LOAD_NOT_STARTED;

	if (_vjs) {
		registerPrebidVastPlugin();
	} else {
		// load prebid plugin if doing header bidding
		if ($$PREBID_GLOBAL$$.plugin_prebid_options) {
			var prebidPluginPath = $$PREBID_GLOBAL$$.plugin_prebid_options.prebidPluginPath ? $$PREBID_GLOBAL$$.plugin_prebid_options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;

			var runPlugin = function () {
				// var prebidPluginObj = new BCVideo_PrebidVastMainPlugin(playerRef);
				var apiFunc = BCVideo_PrebidPluginApiQue.shift();
				var prebidPluginObj = apiFunc(_player);					// uses private closure var _player
				prebidPluginObj.run(_options);							// uses private closure var _optionsPluginObj;
			};

			_prebidPluginLoadState = LOAD_IN_PROGRESS;

			loadPrebidPlugin(prebidPluginPath, runPlugin);
		}
	}
}

function updateVJSRef () {
	if (!_vjs) {
		_vjs = (window.videojs !== undefined ? window.videojs : null);
	}
}

function registerPrebidVastPlugin() {
	// Brightcove Player v5.28.1 uses 'plugin' function to register plugin
	var regFn = _vjs.registerPlugin || _vjs.plugin;

	if (window.BCVideo_PrebidPluginApiQue === undefined) {
		// Create que to store plugin API objects as each one loads
		window.BCVideo_PrebidPluginApiQue = [];

		var pluginFunc = function (options) {
			var player = _player = this;
			_options = options;

			var runPlugin = function () {
				// var prebidPluginObj = new BCVideo_PrebidVastMainPlugin(playerRef);
				var apiFunc = BCVideo_PrebidPluginApiQue.shift();
				var prebidPluginObj = apiFunc(player);					// uses local var player
				prebidPluginObj.run(options);							// uses local var options
			};

			// load prebid plugin and run it when it is loaded
			var path = options && options.prebidPluginPath ? options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;

			if (_prebidPluginLoadState === LOAD_NOT_STARTED) {
				loadPrebidPlugin(path, runPlugin);
			}
		};

		regFn(PREBID_PLUGIN_ID, pluginFunc);
	}
}

function loadPrebidPlugin(path, loadedCallback) {
	// _prebidPluginLoadState = LOAD_IN_PROGRESS;

	_pluginScrEl = document.createElement('script');
	_pluginScrEl.id = 'bc-prebid-plugin-script-' + _loaderId;
	_pluginScrEl.async = true;
	_pluginScrEl.type = 'text/javascript';
	_pluginScrEl.src = path;

	_pluginScrEl.onload = function () {
		_logger.log(LOGGER_PREFIX, path + ' loaded successfully');
		// _prebidPluginLoadState = LOAD_SUCCESS;
		// dispatchPluginLoadEvent(PLUGIN_LOADED_EVENT);
		loadedCallback();
	};
	_pluginScrEl.onerror = function (e) {
		_logger.error(LOGGER_PREFIX, 'Failed to load ' + path + ' - Error event: ', e);
		// _prebidPluginLoadState = LOAD_FAILED;
		// dispatchPluginLoadEvent(PLUGIN_LOAD_FAILED_EVENT);			// *********************** NEED TO COME UP WITH HOW TO HANDLE FAILURE/ERROR CASE
	};

	var node = document.getElementsByTagName('head')[0];
	node.appendChild(_pluginScrEl);
}

// function dispatchPluginLoadEvent(type) {
// 	var event;
// 	if (typeof Event === 'function') {
// 		event = new Event(type);
// 	} else {
// 		event = document.createEvent('Event');
// 		event.initEvent(type, true, true);
// 	}
// 	document.dispatchEvent(event);
// }

// PUBLIC API

// register videojs prebid plugins
function apiInit() {
	updateVJSRef();

	// getPlugins not exist in Brightcove Player v5.28.1
	if (!_vjs.getPlugins || !_vjs.getPlugins()[PREBID_PLUGIN_ID]) {
		registerPrebidVastPlugin();
	}

	// Brightcove Player v5.28.1 uses 'plugin' function to register plugin
	var regFn = !!_vjs.registerPlugin ? _vjs.registerPlugin : _vjs.plugin;
	regFn('bcPrebidVastPluginCommand', function(command) {
		if (command === 'stop') {
			if (_prebidPluginObj) {
				_prebidPluginObj.stop();
			}
		}
	});
}

function apiDoPrebid (options, id) {
	_playerElID = id;
	options.onlyPrebid = true;
	options.loaderObj = this;
	_vjs(_playerElID)[PREBID_PLUGIN_ID](options);
}

function apiStop () {
	if (_playerElID) {
		_vjs(_playerElID).bcPrebidVastPluginCommand('stop');
	}
	else {
		// getPlugins not exist in Brightcove Player v5.28.1
		if (_vjs.getPlugins) {
			_vjs.getPlugins().bcPrebidVastPluginCommand('stop');
		}
	}
}

function apiRenderAd (renderOptions, id, creative) {
	_playerElID = id;
	renderOptions.creative = creative;
	renderOptions.onlyPrebid = false;
	renderOptions.loaderObj = this;
	_vjs(_playerElID)[PREBID_PLUGIN_ID](renderOptions);
}

// @exclude
// Method exposed for Unit Testing - Gets stripped out of the actual build artifact
function apiTest () {
	return {
		loadPrebidPlugin: loadPrebidPlugin,
		player: _player
	};
}
// @endexclude

// EXPORTS

var pluginLoaderAPI = {
	// @exclude
	// Method exposed for Unit Testing - Gets stripped out of the actual build artifact
	test: apiTest,
	// @endexclude

	get id () {
		return _playerElId;
	},
	set id (id) {
		_playerElId = id;
	},

	init: apiInit,

	doPrebid: apiDoPrebid,

	stop: apiStop,

	renderAd: apiRenderAd
};

module.exports = pluginLoaderAPI;

window.BCVideo_PrebidVastPlugin = pluginLoaderAPI;

start();
