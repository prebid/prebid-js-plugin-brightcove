/**
 * Prebid.js Adapter Manager module.
 * @module adapterManager
 */

var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->AdapterManager';

var adapterManager = function (options) {
    var _options = options;
    var _pluginCallback;
    var _adapters = {};
    var _adapterCount = 0;
    var _initCount = 0;
    var _timers = [];

    function checkInitDone (callback) {
        _initCount--;
        if (_initCount <= 0) {
            callback(_adapterCount);
        }
    }

    // process adapter namespacing
    function getWindowVarValue (name) {
        var arr = name.split('.');
        if (arr.length > 0) {
            var value = window;
            for (var i = 0; i < arr.length; i++) {
                value = value[arr[i]];
                if (!value) {
                    return null;
                }
            }
            return value;
        }
        return null;
    }

    function addAdapterToArray (adapter, callback) {
        var adapterValue = getWindowVarValue(adapter.id);
        if (adapterValue) {
            _adapters[adapter.updatedName] = adapterValue;
            _adapterCount++;
        }
        else {
            _logger.error(_prefix, 'Failed to find adapter:' + adapter.id);
        }
        checkInitDone(callback);
    }

    function loadAdapter (adapter, callback) {
        if (!adapter || !adapter.updatedName) {
            checkInitDone(callback);
            return;
        }
        if (adapter.url) {
            // add adapter script to the document body
            var script = document.createElement('script');
            script.src = adapter.url;
            script.onerror = function (e) {
                _logger.error(_prefix, 'Failed to load adapter: ' + adapter.id);
                checkInitDone(callback);
            };
            script.onload = function () {
                _logger.log(_prefix, 'Adapter ' + adapter.id + ' loaded successfully');
                addAdapterToArray(adapter, callback);
            };
            document.body.appendChild(script);
        }
        else {
            addAdapterToArray(adapter, callback);
        }
    }

    function clearTimers () {
        for (var i = 0; i < _timers.length; i++) {
            clearInterval(_timers[i]);
        }
    }

    this.init = function (callback) {
        if (Array.isArray(_options.adapters) && _options.adapters.length > 0) {
            _initCount = _options.adapters.length;
            for (var i = 0; i < _options.adapters.length; i++) {
                if (_options.adapters[i].id) {
                    // replace '.' to '_$_$_$' because '.' is not allowed character in variable name
                    var name = _options.adapters[i].id.replace(/\./g, '_$_$_$');
                    _options.adapters[i].updatedName = name;
                    loadAdapter(_options.adapters[i], callback);
                }
            }
        }
        else {
            callback(0);
        }
    };

    this.isPrebidPluginEnabled = function (callback) {
        if (_adapterCount === 0) {
            callback(true);
            return;
        }
        _pluginCallback = callback;

        var checkPluginEnabledForAdapter = function (adapterResponse, callback) {
            var endTime = Date.now() + (adapterResponse.timeout >= 1000 && adapterResponse.timeout <= 10000 ? adapterResponse.timeout : 5000);
            var timer = setInterval(function () {
                if (Date.now() > endTime) {
                    callback(adapterResponse.default);
                }
                else {
                    var enabled = adapterResponse.poll();
                    if (enabled === true || enabled === false) {
                        callback(enabled);
                    }
                }
            }, 200);
            _timers.push(timer);
        };

        var processedCount = 0;
        for (var adapter in _adapters) {
            if (typeof _adapters[adapter].enablePrebidPlugin === 'function') {
                var adapterResponse = _adapters[adapter].enablePrebidPlugin();
                if (adapterResponse === false) {
                    _pluginCallback(false);
                    return;
                }
                if (adapterResponse === true) {
                    processedCount++;
                    if (processedCount === _adapterCount) {
                        _pluginCallback(true);
                    }
                }
                if (typeof adapterResponse === 'object' &&
                    adapterResponse.hasOwnProperty('timeout') &&
                    adapterResponse.hasOwnProperty('default') &&
                    adapterResponse.hasOwnProperty('poll')) {
                        checkPluginEnabledForAdapter(adapterResponse, function (enabled) {
                            // If any adapter returns false, then we return false,
                            // but only if all adapters return true to do we return true.
                            if (!enabled) {
                                clearTimers();
                                _pluginCallback(false);
                            }
                            else {
                                processedCount++;
                                if (processedCount === _adapterCount) {
                                    clearTimers();
                                    _pluginCallback(true);
                                }
                            }
                        });
                }
            }
            else {
                processedCount++;
                if (processedCount === _adapterCount) {
                    clearTimers();
                    _pluginCallback(true);
                }
            }
        }
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function () {
		return {
            getWindowVarValue: getWindowVarValue,
            setOptions: function (opts) {
                _options = opts;
            },
            setAdapter: function (name, adapterValue) {
                _adapterCount++;
                _adapters[name] = adapterValue;
            }
		};
	};
	// @endexclude
};

module.exports = adapterManager;
