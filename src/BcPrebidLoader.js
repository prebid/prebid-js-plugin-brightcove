/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// CONSTANTS

var _vjs = window.videojs !== undefined ? window.videojs : null;
var _prebidGlobal = require('./PrebidGlobal.js');
var _logger = require('./Logging.js');
var _prefix = 'PrebidPluginLoader->';

var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();

var DEFAULT_PLUGIN_JS_URL = '//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

_logger.always(_prefix, 'Plugin loader version 0.4.1');

var _player;
var _prebidPluginObj;

// register videojs prebid plugins
function regPrebidVastPlugin(vjs) {
	_vjs = vjs;
	// getPlugins not exist in Brightcove Player v5.28.1
	if (!vjs.getPlugins || !_vjs.getPlugins().bcPrebidVastPlugin) {
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

var prebidVastPlugin = {
	// @exclude
	// Method exposed only for unit Testing Purpose
	// Gets stripped off in the actual build artifact
	test: function() {
		return {
			loadPrebidPlugin: loadPrebidPlugin,
			player: _player
		};
	},
	// @endexclude

	init: function () {
		regPrebidVastPlugin(videojs);
	},

	id: null,

	doPrebid: function(options, id) {
		this.id = id;
		options.onlyPrebid = true;
		_vjs(id).bcPrebidVastPlugin(options);
	},

	stop: function() {
		if (this.id) {
			_vjs(this.id).bcPrebidVastPluginCommand('stop');
		}
		else {
			// getPlugins not exist in Brightcove Player v5.28.1
			if (_vjs.getPlugins) {
				_vjs.getPlugins().bcPrebidVastPluginCommand('stop');
			}
		}
	},

	renderAd: function(renderOptions, id, creative) {
		this.id = id;
		renderOptions.creative = creative;
		renderOptions.onlyPrebid = false;
		_vjs(id).bcPrebidVastPlugin(renderOptions);
	}
};

function dispatchPluginLoadEvent(name) {
	var event;
	if (typeof Event === 'function') {
		event = new Event(name);
	}
	else {
		event = document.createEvent('Event');
		event.initEvent(name, true, true);
	}
	document.dispatchEvent(event);
}

var NOT_STARTED = 0;
var IN_PROGRESS = 1;
var LOADED = 2;
var FAILED = 3;
var prebidPluginLoaded = NOT_STARTED;
function loadPrebidPlugin(path) {
	prebidPluginLoaded = IN_PROGRESS;
	var pluginScr = document.createElement('script');
	pluginScr.id = 'bc-prebid-plugin-script';
	pluginScr.onload = function() {
		_logger.log(_prefix, path + ' loaded successfully');
		prebidPluginLoaded = LOADED;
		dispatchPluginLoadEvent('prebidPluginLoaded');
	};
	pluginScr.onerror = function(e) {
		_logger.error(_prefix, 'Failed to load ' + path + '. Error event: ', e);
		prebidPluginLoaded = FAILED;
		dispatchPluginLoadEvent('prebidPluginLoadFailed');
	};
	pluginScr.async = true;
	pluginScr.type = 'text/javascript';
	pluginScr.src = path;
	var node = document.getElementsByTagName('head')[0];
	node.appendChild(pluginScr);
}

// ////////////////////////////////////////////////////////////////////
// EXPORTS
module.exports = prebidVastPlugin;

if (_vjs) {
	registerPrebidVastPlugin();
}
else {
	// load prebid plugin if doing header bidding
	if ($$PREBID_GLOBAL$$.plugin_prebid_options) {
		var prebidPluginPath = $$PREBID_GLOBAL$$.plugin_prebid_options.prebidPluginPath ? $$PREBID_GLOBAL$$.plugin_prebid_options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;
		loadPrebidPlugin(prebidPluginPath);
	}
}

function registerPrebidVastPlugin() {
	// Brightcove Player v5.28.1 uses 'plugin' function to register plugin
	var regFn = !!_vjs.registerPlugin ? _vjs.registerPlugin : _vjs.plugin;
	regFn('bcPrebidVastPlugin', function(options) {
		_player = this;
		var opts = options;
		var runPlugin = function() {
			if (!_prebidPluginObj) {
				_prebidPluginObj = new BCVideo_PrebidVastMainPlugin(_player);
			}
			_prebidPluginObj.run(opts);
		};
		var loadListener = function() {
			document.removeEventListener('prebidPluginLoaded', loadListener);
			runPlugin();
		};
		if (document.getElementById('bc-prebid-plugin-script')) {
			// script tag already in document
			if (prebidPluginLoaded === IN_PROGRESS) {
				// wait id prebid plugin loading is in progress
				document.addEventListener('prebidPluginLoaded', loadListener);
			}
			else if (prebidPluginLoaded === LOADED) {
				// run plugin if it is successfully loaded
				runPlugin();
			}
		}
		else {
			// load prebid plugin and run it when it is loaded
			var path = options && options.prebidPluginPath ? options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;
			document.addEventListener('prebidPluginLoaded', loadListener);
			loadPrebidPlugin(path);
		}
	});
}
window.BCVideo_PrebidVastPlugin = prebidVastPlugin;
