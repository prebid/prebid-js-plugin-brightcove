/**
 * Prebid.js Adapter Manager module.
 * @module adapterManager
 */

var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->AdapterManager';

var _localPBJS = _prebidGlobal.getLocal();

var adapterManager = function (prebidPlugin, options) {
    var _options = options;
    var _plugin = prebidPlugin;
    var _pluginCallbacks;
    var _adapters = {};
    var _player;
    var _initCount = 0;

    function checkInitDone (callback) {
        _initCount--;
        if (_initCount <= 0) {
            callback();
        }
    }

    function loadAdapter (name, url, callback) {
        if (!url || !name) {
            checkInitDone(callback);
            return;
        }
		// add adapter script to the document body
		var script = document.createElement('script');
		script.src = url;
		script.onerror = function (e) {
			_logger.error(_prefix, 'Failed to load adapter: ', name);
			checkInitDone(callback);
		};
		script.onload = function () {
            _logger.log(_prefix, 'Adapter ' + name + ' loaded successfully');
            _adapters[name] = window[name];
			checkInitDone(callback);
		};
		document.body.appendChild(script);
    }

    this.init = function (callback) {
        if (_options.adapters) {
            _initCount = Object.keys(_options.adapters).length;
            for (var prop in _options.adapters) {
                loadAdapter(prop, _options.adapters[prop], callback);
            }
        }
    };

    this.run = function (player, callbacks) {
    	_player = player;
        _pluginCallbacks = callbacks;

        var localCalbacks = {
            enablePrebid: function (enable) {
                if (_pluginCallbacks.enablePrebid) {
                    _pluginCallbacks.enablePrebid(enable);
                }
            },
            doPrebid: function (opts, callback) {
                // not implemented yet
            },
            getOptions: function () {
                return _options;
            },
            setTagUrl: function (url) {
                // not implemented yet
            }
        };

        for (var adapter in adapters) {
            adapters[adapter].start(_player, localCalbacks);
        }
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function () {
		return {
		};
	};
	// @endexclude
};

module.exports = adapterManager;
