/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// DEPENDENCIES
var _prebidGlobal = require('./PrebidGlobal.js');
var _logger = require('./Logging.js');

// CONSTANTS
var PLUGIN_VERSION = '0.4.1';
var DEFAULT_PLUGIN_JS_URL = '//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

var LOAD_NOT_STARTED = 0;
var LOAD_IN_PROGRESS = 1;
var LOAD_SUCCESS = 2;
var LOAD_FAILED = 3;

var LOGGER_PREFIX = 'PrebidPluginLoader->';

// EVENT TYPES
var PLUGIN_LOADED_EVENT = 'prebidPluginLoaded';
var PLUGIN_LOAD_FAILED_EVENT = 'prebidPluginLoaded';

// OBJECT REFS
var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();
var _vjs;
var _player;
var _prebidPluginObj;
var _pluginScrEl;

// STATE
var _playerElId;
var _loaderId;
var _pluginScrElId;
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
			loadPrebidPlugin(prebidPluginPath);
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

	regFn('bcPrebidVastPlugin', function(options) {
		_player = this;
		var opts = options;
		var runPlugin = function() {
			if (!_prebidPluginObj) {
				_prebidPluginObj = new BCVideo_PrebidVastMainPlugin(_player);
			}
			_prebidPluginObj.run(opts);
		};
		var loadListener = function(evt) {
			// Ignore event if not dispatched from THIS loader (there may be multiple players+loaders on the page)
			if (!_pluginScrEl || _prebidPluginLoadState !== LOAD_SUCCESS) {
				return;
			}
			document.removeEventListener(PLUGIN_LOADED_EVENT, loadListener);
			runPlugin();
		};
		if (_pluginScrEl) {
			// script tag already in document
			if (_prebidPluginLoadState === LOAD_IN_PROGRESS) {
				// wait id prebid plugin loading is in progress
				document.addEventListener(PLUGIN_LOADED_EVENT, loadListener);
			}
			else if (_prebidPluginLoadState === LOAD_SUCCESS) {
				// run plugin if it is successfully loaded
				runPlugin();
			}
		}
		else {
			// load prebid plugin and run it when it is loaded
			var path = options && options.prebidPluginPath ? options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;
			document.addEventListener(PLUGIN_LOADED_EVENT, loadListener);
			loadPrebidPlugin(path);
		}
	});
}

function loadPrebidPlugin(path) {
	_prebidPluginLoadState = LOAD_IN_PROGRESS;

	_pluginScrElId = 'bc-prebid-plugin-script-' + _loaderId;

	_pluginScrEl = document.createElement('script');
	_pluginScrEl.id = _pluginScrElId;
	_pluginScrEl.async = true;
	_pluginScrEl.type = 'text/javascript';
	_pluginScrEl.src = path;

	_pluginScrEl.onload = function () {
		_logger.log(LOGGER_PREFIX, path + ' loaded successfully - id: ' + _pluginScrElId);
		_prebidPluginLoadState = LOAD_SUCCESS;
		dispatchPluginLoadEvent(PLUGIN_LOADED_EVENT);
	};
	_pluginScrEl.onerror = function (e) {
		_logger.error(LOGGER_PREFIX, 'Failed to load ' + path + ' - id: ' + _pluginScrElId + ' - Error event: ', e);
		_prebidPluginLoadState = LOAD_FAILED;
		dispatchPluginLoadEvent(PLUGIN_LOAD_FAILED_EVENT);
	};

	var node = document.getElementsByTagName('head')[0];
	node.appendChild(_pluginScrEl);
}

function dispatchPluginLoadEvent(type) {
	var event;
	if (typeof Event === 'function') {
		event = new Event(type);
	} else {
		event = document.createEvent('Event');
		event.initEvent(type, true, true);
	}
	document.dispatchEvent(event);
}

// PUBLIC API

// register videojs prebid plugins
function apiInit() {
	updateVJSRef();

	// getPlugins not exist in Brightcove Player v5.28.1
	if (!_vjs.getPlugins || !_vjs.getPlugins().bcPrebidVastPlugin) {
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
	_vjs(_playerElID).bcPrebidVastPlugin(options);
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
	_vjs(id).bcPrebidVastPlugin(renderOptions);
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
