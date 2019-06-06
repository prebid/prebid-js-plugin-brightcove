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

    function checkInitDone (callback) {
        _initCount--;
        if (_initCount <= 0) {
            callback(_adapterCount);
        }
    }

    // process adapter namespacing
    function getWindowVarValue (name) {
        var arr = name.split('_$_$_$');
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

    function loadAdapter (name, url, callback) {
        if (!name) {
            checkInitDone(callback);
            return;
        }
        var adapterValue;
        if (url) {
            // add adapter script to the document body
            var script = document.createElement('script');
            script.src = url;
            script.onerror = function (e) {
                _logger.error(_prefix, 'Failed to load adapter: ', name.replace(/_\$_\$_\$/g, '.'));
                checkInitDone(callback);
            };
            script.onload = function () {
                _logger.log(_prefix, 'Adapter ' + name.replace(/_\$_\$_\$/g, '.') + ' loaded successfully');
                adapterValue = getWindowVarValue(name);
                if (adapterValue) {
                    _adapters[name] = adapterValue;
                    _adapterCount++;
                }
                else {
                    _logger.error(_prefix, 'Failed to found adapter: ', name.replace(/_\$_\$_\$/g, '.'));
                }
                checkInitDone(callback);
            };
            document.body.appendChild(script);
        }
        else {
            adapterValue = getWindowVarValue(name);
            if (adapterValue) {
                _adapters[name] = adapterValue;
                _adapterCount++;
            }
            else {
                _logger.error(_prefix, 'Failed to found adapter: ', name.replace(/_\$_\$_\$/g, '.'));
            }
            checkInitDone(callback);
        }
    }

    this.init = function (callback) {
        if (Array.isArray(_options.adapters) && _options.adapters.length > 0) {
            _initCount = _options.adapters.length;
            for (var i = 0; i < _options.adapters.length; i++) {
                if (_options.adapters[i].id) {
                    // replace '.' to '_$_$_$' because '.' is not allowed character in variable name
                    var name = _options.adapters[i].id.replace(/\./g, '_$_$_$');
                    loadAdapter(name, _options.adapters[i].url, callback);
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

        var checkPluginEnabledForAdapter = function (obj, callback) {
            var endTime = Date.now() + obj.timeout;
            var timer = setInterval(function () {
                if (Date.now() > endTime) {
                    clearInterval(timer);
                    callback(obj.default);
                }
                else {
                    var enabled = obj.poll();
                    if (enabled === true || enabled === false) {
                        clearInterval(timer);
                        callback(enabled);
                    }
                }
            }, 200);
        };

        var processedCount = 0;
        for (var adapter in _adapters) {
            if (typeof _adapters[adapter].enablePrebidPlugin === 'function') {
                var ret = _adapters[adapter].enablePrebidPlugin();
                if (ret === false) {
                    _pluginCallback(false);
                    return;
                }
                if (ret === true) {
                    processedCount++;
                    if (processedCount === _adapterCount) {
                        _pluginCallback(true);
                    }
                }
                if (typeof ret === 'object' &&
                    ret.hasOwnProperty('timeout') &&
                    ret.hasOwnProperty('default') &&
                    ret.hasOwnProperty('poll')) {
                        checkPluginEnabledForAdapter(ret, function (enabled) {
                            if (!enabled) {
                                _pluginCallback(false);
                            }
                            else {
                                processedCount++;
                                if (processedCount === _adapterCount) {
                                    _pluginCallback(true);
                                }
                            }
                        });
                }
            }
            else {
                processedCount++;
                if (processedCount === _adapterCount) {
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
