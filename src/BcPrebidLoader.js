/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// DEPENDENCIES
var _prebidGlobal = require('./PrebidGlobal.js');
var _logger = require('./Logging.js');

// CONSTANTS
var LOADER_VERSION = '0.4.6';
var PREBID_PLUGIN_ID = 'bcPrebidVastPlugin';
var COMMAND_PLUGIN_ID = 'bcPrebidVastPluginCommand';
var DEFAULT_PLUGIN_JS_URL = '//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

var LOGGER_PREFIX = 'PrebidPluginLoader->';

// OBJECT REFS
var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();
var _vjs;
var _player;
var _prebidPluginObj;
var _pluginScrEl;

// STATE
$$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue = null;
var _isLoadedFromPage = false;
var _playerElId;

// PRIVATE FUNCTIONS

function getPluginPath (options) {
	if (options) {
		var i;
		if (Array.isArray(options)) {
			for (i = 0; i < options.length; i++) {
				if (options[i].prebidPluginPath && options[i].prebidPluginPath.length > 0) {
					return options[i].prebidPluginPath;
				}
			}
			return DEFAULT_PLUGIN_JS_URL;
		}
		else {
			// array in brightcove studio converted to object {0: {...}, 1: {...}, ...}
			if (options.hasOwnProperty('0')) {
				// options parameter is array of options from plugin embedded in player in studio
				for (i = 0; options.hasOwnProperty(i); i++) {
					if (options[i].prebidPluginPath && options[i].prebidPluginPath.length > 0) {
						return options[i].prebidPluginPath;
					}
				}
				return DEFAULT_PLUGIN_JS_URL;
			}
			else {
				return options.prebidPluginPath ? options.prebidPluginPath : DEFAULT_PLUGIN_JS_URL;
			}
		}
	}
	else {
		return DEFAULT_PLUGIN_JS_URL;
	}
}

function start () {
	_logger.always(LOGGER_PREFIX, 'Prebid Plugin Loader Version: ' + LOADER_VERSION);

	apiInit();

	if (!_vjs) {
		// load prebid plugin if doing header bidding
		if ($$PREBID_GLOBAL$$.plugin_prebid_options) {
			var prebidPluginPath = getPluginPath($$PREBID_GLOBAL$$.plugin_prebid_options);

			var runPlugin = function () {
				var apiFunc = getLoadedPluginAPI(true);								// keep PluginAPI in que for future call
                var _prebidPluginObj = apiFunc(_player);							// uses private closure var _player
                _prebidPluginObj.run($$PREBID_GLOBAL$$.plugin_prebid_options);		// uses $$PREBID_GLOBAL$$.plugin_prebid_options (set from page)
			};

            _isLoadedFromPage = true;

			loadPrebidPlugin(prebidPluginPath, runPlugin);
		}
	}
}

function getLoadedPluginAPI (keepInQue) {
    if (!$$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue || !$$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue.length) {
		_logger.log(LOGGER_PREFIX, 'ERROR - No loaded Plugin API available to run!');
		var placeholder = function () {
			return { run: function () {} };
		};
        return placeholder;
	}
	if (keepInQue) {
		return $$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue[0];
	}
	else {
		return $$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue.shift();
	}
}

function loadPrebidPlugin (path, callback) {
	_loaderId = Date.now().valueOf();

    _pluginScrEl = document.createElement('script');
	_pluginScrEl.id = 'bc-prebid-plugin-script-' + _loaderId;
	_pluginScrEl.async = true;
	_pluginScrEl.type = 'text/javascript';
	_pluginScrEl.src = path;

	_pluginScrEl.onload = function () {
		_logger.log(LOGGER_PREFIX, path + ' loaded successfully');

		callback(true);
	};
	_pluginScrEl.onerror = function (e) {
		_logger.error(LOGGER_PREFIX, 'Failed to load Prebid Plugin from: ' + path + ' -- Error: ', e);

		callback(false);
	};

	var node = document.getElementsByTagName('head')[0];
	node.appendChild(_pluginScrEl);
}

function isPluginRegistered () {
    if (_vjs.registerPlugin) {
		// Brightcove v6.x.x Players have the registerPlugin() and getPlugin() methods
		return _vjs.getPlugins()[PREBID_PLUGIN_ID];
    }
    else {
        // Brightcove v5.x.x Players don't have a getPlugins() method, so we must check their internal Player prototype
		// Also, v5 used the deprecated plugin() method to register new plugins
		return _vjs.Player.prototype[PREBID_PLUGIN_ID];
    }
}

function registerPlugins (prebidFunc, commandFunc) {
    // ONLY register plugins ONCE with global videojs
    if (_vjs.registerPlugin) {
        // Brightcove v6.x.x Players have the registerPlugin() and getPlugin() methods
        if (!_vjs.getPlugins()[PREBID_PLUGIN_ID]) {
            _vjs.registerPlugin(PREBID_PLUGIN_ID, prebidFunc);
        }
        if (!_vjs.getPlugins()[COMMAND_PLUGIN_ID]) {
            _vjs.registerPlugin(COMMAND_PLUGIN_ID, commandFunc);
        }
    }
    else {
        // Brightcove v5.x.x Players don't have a getPlugins() method, so we must check their internal Player prototype
        // Also, v5 used the deprecated plugin() method to register new plugins
        if (!_vjs.Player.prototype[PREBID_PLUGIN_ID]) {
            _vjs.plugin(PREBID_PLUGIN_ID, prebidFunc);
        }
        if (!_vjs.Player.prototype[COMMAND_PLUGIN_ID]) {
            _vjs.plugin(COMMAND_PLUGIN_ID, commandFunc);
        }
    }
}

// PUBLIC API

// register videojs prebid plugins
function apiInit () {
    // Create que to store plugin API objects as each one loads
    $$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue = $$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue || [];

    // First check for videojs - and only continue if it's already loaded
    _vjs = _vjs || window.videojs || null;
    if (!_vjs) {
        return;
    }
    // Second, make sure we only initialize the API once
    if (isPluginRegistered()) {
        return;
    }

    var prebidPluginFunc = function (options) {
		var player = this;
		_player = this;

		// get Brightcove Player Id
		var playerStudioId = '';
		if (_player.bcinfo) {
			playerStudioId = _player.bcinfo.playerId;
		}
		else if (_player.options_ && _player.options_['data-player']) {
			playerStudioId = _player.options_['data-player'];
		}
		_logger.setPlayerId((playerStudioId && playerStudioId.length > 0 ? (playerStudioId + '-') : '') + _player.el_.id);

		// cover player with black div to avoid video flickering (do it only at very begging of the main content video)
		var playerId = _player.el_.id;
    	if (!document.getElementById('plugin-break-cover' + playerId) && _player.currentTime() < 1) {
    		var cover = document.createElement('div');
    		cover.id = 'plugin-break-cover' + playerId;
    		cover.style.width = '100%';
    		cover.style.height = '100%';
    		cover.style.backgroundColor = 'black';
    		cover.style.position = 'absolute';
    		cover.style.zIndex = 101;
    		_player.el().appendChild(cover);
		}

		// load prebid plugin and run it when it is loaded
        var path = getPluginPath(options);

        var runPlugin = function (success) {
        	if (success) {
				var apiFunc = getLoadedPluginAPI();
				_playerElID = player.el().id;
				_prebidPluginObj = apiFunc(player);					// uses local var player
				_prebidPluginObj.run(options);						// uses local var options
			} else {
        		// Handle the error
				var cover = document.getElementById('plugin-break-cover' + playerId);
				if (cover) {
					player.el().removeChild(cover);
				}
			}
        };

        if (!_isLoadedFromPage) {
            loadPrebidPlugin(path, runPlugin);
		}
		else {
			runPlugin(true);
		}
    };

	var commandPluginFunc = function (command) {
        if (command === 'stop') {
            if (_prebidPluginObj) {
                _prebidPluginObj.stop();
            }
        }
	};

	registerPlugins(prebidPluginFunc, commandPluginFunc);
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
		getLoadedPluginAPI: getLoadedPluginAPI,
		getPluginPath: getPluginPath,
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
