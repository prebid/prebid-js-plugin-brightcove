/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// CONSTANTS

var _prebidGlobal = require('./PrebidGlobal.js');
var _vastManager = require('./VastManager.js');
var _adListManager = require('./AdListManager.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _dfpUrlGenerator = require('./DfpUrlGenerator.js');
var _logger = require('./Logging.js');

var PLUGIN_VERSION = '0.5.1f';
var _prefix = 'PrebidVast->';
var _molIFrame = null;

var DEFAULT_PREBID_JS_URL = '//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js';
var DEFAULT_PREBID_CACHE_URL = '//prebid.adnxs.com/pbc/v1/cache';
var MOL_PLUGIN_URL = '//acdn.adnxs.com/video/plugins/mol/videojs_5.vast.vpaid.min.js';

var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();
var _localPBJS = _prebidGlobal.getLocal();

_logger.always(_prefix, 'Prebid Plugin Version: ' + PLUGIN_VERSION);

var BC_prebid_in_progress = $$PREBID_GLOBAL$$.plugin_prebid_options && $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec;

var DEFAULT_SCRIPT_LOAD_TIMEOUT = 3000;

var _rendererNames = {
	MOL: 'mailonline',
	IMA: 'ima'
};

// UTIL FUNCTIONS FOR LOADING JS IFRAMES
function isEdge () {
	return /(edge)\/((\d+)?[\w\.]+)/i.test(navigator.userAgent);
}

function canLoadInIframe () {
	var docClassList = document.documentElement.classList;
	var playerInIframe = docClassList && docClassList.contains('bc-iframe'); // html of player has bc-iframe class when Brightcove player emded in iFrame
	return !(playerInIframe && isEdge());
}

function getOrigin () {
    if (window.location.origin) {
        return window.location.origin;
    }
    else {
        return window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    }
}

function insertHiddenIframe (id) {
    var iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.src = 'javascript:false';	// jshint ignore:line
    iframe.marginWidth = '0';
    iframe.marginHeight = '0';
    iframe.frameBorder = '0';
    iframe.width = '0%';
    iframe.height = '0%';
    iframe.style.position = 'absolute';
    iframe.style.left = '0px';
    iframe.style.top = '0px';
    iframe.style.margin = '0px';
    iframe.style.padding = '0px';
    iframe.style.border = 'none';
    iframe.style.width = '0%';
    iframe.style.height = '0%';
    iframe.tabIndex = '-1';

    document.body.appendChild(iframe);

    return iframe;
}

function writeAsyncScriptToFrame (targetFrame, jsPath, includeVJS, origin) {
    var doc = targetFrame.contentWindow.document;
    var docString = '<body onload="' +
        'var myjs = document.createElement(\'script\');' +
        ' myjs.src = \'' + jsPath + '\';' +
        ' myjs.onload = function () { notifyParent(true); };' +
        ' myjs.onerror = function () { notifyParent(false); };' +
        ' document.body.appendChild(myjs);">';
    docString += '<script type="text/javascript">' + '\n' +
        'function notifyParent(succ) {' + '\n' +
        '  window.postMessage(succ ? "ready" : "error", "' + origin + '");' + '\n' +
        '}' + '\n';
    if (includeVJS) {
        docString += 'var vjs = videojs = parent.videojs;' + '\n';
    }
    docString += '<\/script>' + '\n' + '</body>';

    doc.open().write(docString);
    doc.close();
}

// PREBID FUNCTIONS

// the function does bidding and returns bids thru callback
var BC_bidders_added = false;
var _dfpUrlGeneratorObj;

function doPrebid (options, callback) {
	if (_localPBJS.bc_pbjs && options.biddersSpec) {
		if (options.clearPrebid) {
			_localPBJS.bc_pbjs.adUnits = [];
			_localPBJS.bc_pbjs.bidderSettings = {};
			_localPBJS.bc_pbjs.medianetGlobals = {};
			BC_bidders_added = false;
		}
		_localPBJS.bc_pbjs.que = _localPBJS.bc_pbjs.que || [];

		//
		// Prebid Video adUnit
		//
		var logBids = function (bids) {
			_logger.log(_prefix, 'MESSAGE: got bids back: ', bids);
		};

		_localPBJS.bc_pbjs.que.push(function () {
			if (!BC_bidders_added) {
				BC_bidders_added = true;
				specifyBidderAliases(options.bidderAliases, _localPBJS.bc_pbjs);
				prepareBidderSettings(options);
				if (options.bidderSettings) {
					_localPBJS.bc_pbjs.bidderSettings = options.bidderSettings;
				}
				_localPBJS.bc_pbjs.addAdUnits(options.biddersSpec); // add your ad units to the bid request
			}

			if (options.prebidConfigOptions) {
                // Enable Prebid Cache by default
			    if (options.enablePrebidCache !== false) {
                    options.enablePrebidCache = true;
                    // If no Prebid Cache url is set, use AppNexus' Prebid Cache by default
                    if (!options.prebidConfigOptions.cache) {
                        options.prebidConfigOptions.cache = {};
                    }
                    if (!options.prebidConfigOptions.cache.url) {
                        var defaultCacheURL = DEFAULT_PREBID_CACHE_URL;
                        options.prebidConfigOptions.cache.url = defaultCacheURL;
                        _logger.log(_prefix, 'No Prebid Cache url set - using default: ' + defaultCacheURL);
                    }
				} else {
                    // DFP requires Prebid Cache, but otherwise remove the unused cache object if present
                    if (options.prebidConfigOptions.cache && !options.dfpParameters) {
                        delete options.prebidConfigOptions.cache;
                    }
                }
				_localPBJS.bc_pbjs.setConfig(options.prebidConfigOptions);
			}

			_localPBJS.bc_pbjs.requestBids({
				timeout: (options.prebidTimeout && options.prebidTimeout > 0) ? options.prebidTimeout : 700,
				bidsBackHandler: function (bids) { // this function will be called once bids are returned
					logBids(bids);
					callback(bids);
				}
			});
		});
	}
	else if (_localPBJS.bc_pbjs_error && options.dfpParameters) {
		if (!_dfpUrlGeneratorObj) {
			_dfpUrlGeneratorObj = new _dfpUrlGenerator();
		}
		var sizes = options.biddersSpec ? (options.biddersSpec.sizes || []) : [];
		var dfpUrl = _dfpUrlGeneratorObj.buildVideoUrl(options.dfpParameters, sizes);
		callback(dfpUrl);
	}
	else if (_localPBJS.bc_pbjs_error && options.adServerCallback) {
		// simulate empty bids situation
		callback([]);
	}
	else {
		callback(null);
	}
}

// This function enumerates all aliases for bidder adapters and defines them in prebid.js.
// bidderAliases is array of object each of them defines pair of alias/bidder.
// bc_pbjs is prebid.js instance.
function specifyBidderAliases (bidderAliases, bc_pbjs) {
	if (bidderAliases && Array.isArray(bidderAliases) && bidderAliases.length > 0) {
		for (var i = 0; i < bidderAliases.length; i++) {
			if (bidderAliases[i].bidderName && bidderAliases[i].name) {
				// defines alias for bidder adapter in prebid.js
				bc_pbjs.aliasBidder(bidderAliases[i].bidderName, bidderAliases[i].name);
			}
		}
	}
}

// This function converts 'val' properties in bidderSettings represented as string array to inline functions.
// We recommend to use string array in bidderSettings only when options are defined for Brightcove player
// in Brightcove studio.
function prepareBidderSettings (options) {
	if (options.bidderSettings) {
		var subtituteToEval = function (arr, obj) {
			if (arr.length > 1 && arr[0] === 'valueIsFunction') {
				arr.shift();
				var str = arr.join('');
				eval('obj.val = ' + str); // jshint ignore:line
			}
		};
		var findValProperty = function findValProperty (obj) {
			for (var name in obj) {
				if (name.toLowerCase() === 'val') {
					if (Array.isArray(obj.val)) {
						subtituteToEval(obj.val, obj);
					}
				}
				else if (obj[name] instanceof Object) {
					findValProperty(obj[name]);
				}
			}
		};
		if (options.bidderSettings) {
			findValProperty(options.bidderSettings);
		}
	}
}

function dispatchPrebidDoneEvent () {
	var event;
	if (typeof Event === 'function') {
		event = new Event('prebid_done_loading_script');
	}
	else {
		event = document.createEvent('Event');
		event.initEvent('prebid_done_loading_script', true, true);
	}
	document.dispatchEvent(event);
}

// This function will be invoked immediately when plugin script is loaded in the page or by brightcove player.
// The function loads prebid.js and does header bidding if needed.
// The first parameter contains bidder settings needed for prebid.
// If second parameter is present and is 'true' we have to call prebid right now (header bidding).
// That parameter is present and set to 'true' when $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec has a value.
// $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec has to be set for header bidding BEFORE the plugin's script is loaded.
function loadPrebidScript (options, fromHeader) {
	// internal function which will be called later
	var setupAdCreative = function () {
    	// do header bidding if fromHeader is 'true' and bidder setting are present in options
    	if (fromHeader && options) {
			BC_prebid_in_progress = true;
			// invoke prebid
    		doPrebid(options, function (bids) {
				// this function returns creative with higher CPM
				var selectWinnerByCPM = function (arrBids) {
					var cpm = 0.0;
					var creative = null;
					var cacheKey;
					for (var i = 0; i < arrBids.length; i++) {
						if (arrBids[i].cpm > cpm) {
							cpm = arrBids[i].cpm;
							creative = arrBids[i].vastUrl;
							cacheKey = arrBids[i].videoCacheKey;
						}
					}
					// get prebid cache url for winner
					if (cacheKey && cacheKey.length > 0 && options.prebidConfigOptions &&
						options.prebidConfigOptions.cache && options.prebidConfigOptions.cache.url) {
						creative = options.prebidConfigOptions.cache.url + '?uuid=' + cacheKey;
					}
					_logger.log(_prefix, 'Selected VAST url: ' + creative);
					return creative;
				};
				// get prebid cache url if available
				function getPrebidCacheUrl (creative, arrBids) {
					for (var i = 0; i < arrBids.length; i++) {
						if (arrBids[i].vastUrl === creative) {
							// winner is creative from bid array
							if (arrBids[i].videoCacheKey && arrBids[i].videoCacheKey.length > 0 &&
								options.prebidConfigOptions && options.prebidConfigOptions.cache &&
								options.prebidConfigOptions.cache.url) {
								return options.prebidConfigOptions.cache.url + '?uuid=' + arrBids[i].videoCacheKey;
							}
							return creative;
						}
					}
					// winner is not creative from bid array
					return creative;
				}
				var arrBids = (options.biddersSpec && bids && typeof bids !== 'string' && bids[options.biddersSpec.code]) ? bids[options.biddersSpec.code].bids : [];
    			_logger.log(_prefix, 'bids for bidding: ', arrBids);
    			if (arrBids && Array.isArray(arrBids)) {
	    			if (options.dfpParameters) {
						// use DFP server if DFP parameters present in options
						_logger.log(_prefix, 'Use DFP');
						if (arrBids.length === 0 && typeof bids === 'string') {
							// bids is a dfp vast url
							_localPBJS.prebid_creative = bids;
						}
						else {
							var dfpOpts = {adUnit: options.biddersSpec};
							if (options.dfpParameters.url && options.dfpParameters.url.length > 0) {
								dfpOpts.url = options.dfpParameters.url;
							}
							if (options.dfpParameters.params && options.dfpParameters.params.hasOwnProperty('iu')) {
								dfpOpts.params = options.dfpParameters.params;
							}
							if (options.dfpParameters.bid && Object.keys(options.dfpParameters.bid).length > 0) {
								dfpOpts.bid = options.dfpParameters.bid;
							}
							_logger.log(_prefix, 'DFP buildVideoUrl options: ', dfpOpts);
							_localPBJS.prebid_creative = _localPBJS.bc_pbjs.adServers.dfp.buildVideoUrl(dfpOpts);
						}
						BC_prebid_in_progress = false;
						_logger.log(_prefix, 'Selected VAST url: ' + _localPBJS.prebid_creative);
						dispatchPrebidDoneEvent();
					}
	    			else if (options.adServerCallback) {
	    				// use 3rd party ad server if ad server callback present in options
						_logger.log(_prefix, 'Use 3rd party ad server');
						var func;
						if (typeof options.adServerCallback === 'function') {
							func = $$PREBID_GLOBAL$$.plugin_prebid_options.adServerCallback;
						}
						else if (typeof options.adServerCallback === 'string' &&
								window[options.adServerCallback] &&
								typeof window[options.adServerCallback] === 'function') {
							func = window[options.adServerCallback];
						}
						if (func) {
							func(arrBids, function (creative) {
								_localPBJS.prebid_creative = getPrebidCacheUrl(creative, arrBids);
								BC_prebid_in_progress = false;
								_logger.log(_prefix, 'Selected VAST url: ' + _localPBJS.prebid_creative);
								dispatchPrebidDoneEvent();
							});
						}
						else {
							_logger.log(_prefix, 'Select winner by CPM because 3rd party callback is invalid');
							_localPBJS.prebid_creative = selectWinnerByCPM(arrBids);
							BC_prebid_in_progress = false;
							dispatchPrebidDoneEvent();
						}
	    			}
	    			else {
	    				// select vast url from bid with higher cpm
	        			_logger.log(_prefix, 'Select winner by CPM');
						_localPBJS.prebid_creative = selectWinnerByCPM(arrBids);
	    	            BC_prebid_in_progress = false;
						dispatchPrebidDoneEvent();
	    			}
    			}
    			else {
    				// no bids
    	            BC_prebid_in_progress = false;
					_logger.log(_prefix, 'Selected VAST url: ' + _localPBJS.prebid_creative);
				}
			});
    	}
	};

	var arrOptions = convertOptionsToArray(options);
	var prebidPath;
	var scriptLoadTimeout;
	for (var i = 0; i < arrOptions.length; i++) {
		if (arrOptions[i].prebidPath && !prebidPath) {
			prebidPath = arrOptions[i].prebidPath;
		}
		if (!scriptLoadTimeout && arrOptions[i].scriptLoadTimeout && arrOptions[i].scriptLoadTimeout > 0) {
			scriptLoadTimeout = arrOptions[i].scriptLoadTimeout;
		}
	}

	var debugMsg;
	if (!document.body) {
		// plugin has been loaded in the html page <head> (document body is not ready)
		if (document.getElementById('bc-pb-script')) {
			// if prebid.js is already loaded try to invoke prebid.
			setupAdCreative();
			return;
		}

		var pbjsScr = document.createElement('script');
		pbjsScr.onload = function () {
			// after prebid.js is successfully loaded try to invoke prebid.
			_localPBJS.bc_pbjs = frame.contentWindow.pbjs;

            _logger.log(_prefix, 'Prebid.js loaded successfully');

            setupAdCreative();
		};
		pbjsScr.onerror = function (e) {
			// failed to load prebid.js.
			_localPBJS.bc_pbjs_error = true;

            debugMsg = 'Failed to load prebid.js in header.';
			_logger.error(_prefix, debugMsg + ' Error event: ', e);

			if (options.pageNotificationCallback) {
				options.pageNotificationCallback('message', debugMsg);
			}

			// setuo ad creative for dfp or 3rd party ad server if either is present in options
			setupAdCreative();
		};

		pbjsScr.id = 'bc-pb-script-' + Date.now.valueOf();
		pbjsScr.async = true;
		pbjsScr.type = 'text/javascript';
		pbjsScr.src = !!prebidPath ? prebidPath : DEFAULT_PREBID_JS_URL;

		var node = document.getElementsByTagName('head')[0];
		node.appendChild(pbjsScr);
	}
	else {
        var timeout = setTimeout(function () {
			// failed to load prebid.js in iframe.
			_localPBJS.bc_pbjs_error = true;
			timeout = null;

            debugMsg = 'Failed to load prebid.js in iframe (timeout).';
			_logger.error(_prefix, debugMsg);

			if (options.pageNotificationCallback) {
				options.pageNotificationCallback('message', debugMsg);
			}

			// setuo ad creative for dfp or 3rd party ad server if either is present in options
			setupAdCreative();
		}, !!scriptLoadTimeout ? scriptLoadTimeout : DEFAULT_SCRIPT_LOAD_TIMEOUT);

        var onLoadIFrame = function (msgEvent) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            else {
                // prebid.js loading timeout already happened. do nothing
                return;
            }
            // check only our messages 'ready' and 'error' from ifarme
            if (msgEvent.data === 'ready') {
                frame.contentWindow.removeEventListener('message', onLoadIFrame);

                // after prebid.js is successfully loaded try to invoke prebid.
                _localPBJS.bc_pbjs = frame.contentWindow.pbjs;

                _logger.log(_prefix, 'Prebid.js loaded successfully');

                setupAdCreative();
            }
            else if (msgEvent.data === 'error') {
                frame.contentWindow.removeEventListener('message', onLoadIFrame);

                // failed to load prebid.js.
                _localPBJS.bc_pbjs_error = true;

                debugMsg = 'Failed to load prebid.js in iframe.';
                _logger.error(_prefix, debugMsg);

                if (options.pageNotificationCallback) {
                    options.pageNotificationCallback('message', debugMsg);
                }

				// setuo ad creative for dfp or 3rd party ad server if either is present in options
				setupAdCreative();
            }
        };

        try {
            var frameID = 'bc-pbjs-frame-' + Date.now().valueOf();
            var prebidJSSrc = (!!prebidPath ? prebidPath : DEFAULT_PREBID_JS_URL);

            var frame = insertHiddenIframe(frameID);

            writeAsyncScriptToFrame(frame, prebidJSSrc, false, getOrigin());

            frame.contentWindow.addEventListener('message', onLoadIFrame);
        }
        catch (e) {
            // failed to load prebid.js.
            _localPBJS.bc_pbjs_error = true;

            debugMsg = 'Failed to load prebid.js - caught error writing iFrame.';
            _logger.error(_prefix, debugMsg);

            if (options.pageNotificationCallback) {
                options.pageNotificationCallback('message', debugMsg + ' Error: ' + e);
            }

            dispatchPrebidDoneEvent();
        }
    }
}

function convertOptionsToArray (options) {
	var arrOptions;
	if (Array.isArray(options)) {
		arrOptions = options;
	}
	else {
		// array in brightcove studio converted to object {0: {...}, 1: {...}, ...}
		if (options.hasOwnProperty('0')) {
			// options parameter is array of options from plugin embedded in player in studio
			arrOptions = [];
			for (var i = 0; options.hasOwnProperty(i); i++) {
				arrOptions.push(options[i]);
			}
		}
		else {
			arrOptions = [options];
		}
	}
	return arrOptions;
}

// this function loads MailOnline Plugin
var _molLoadingInProgress = false;
var _molLoaded = false;
var _imaTriedToLoad = false;
var _vastClientFunc;

function loadMolPlugin (callback) {
    var vjs = window.videojs || false;
    if (!vjs) {
        _logger.warn(_prefix, 'Can\'t load MOL Plugin now - Videojs isn\'t loaded yet.');
        callback(false);
        return;
    }

    if (!_molLoaded) {
		var waitMolLoaded;
        if (_molIFrame && _molLoadingInProgress) {
            _logger.log(_prefix, 'MailOnline Plugin loading in progress - setting interval to run callback when loaded');
            waitMolLoaded = setInterval(function () {
                if (!_molLoadingInProgress) {
                    clearInterval(waitMolLoaded);
                    _logger.log(_prefix, 'MailOnline Plugin ' + (_molLoaded ? '' : 'not ') + 'loaded successfully - wait interval cleared');
                    callback(_molLoaded);
                }
            }, 50);
            return;
        }

		if (canLoadInIframe()) {
			var onLoadIFrame = function (msgEvent) {
				// check only our messages 'ready' and 'error' from ifarme
				if (msgEvent.data === 'ready') {
					frame.contentWindow.removeEventListener('message', onLoadIFrame);

					_molLoaded = true;
					_molLoadingInProgress = false;

					_logger.log(_prefix, 'MailOnline Plugin loaded successfully');

					// VIDLA-4391 - Add support for multiple players on the same page, each with a unique MOL plugin loaded from an iFrames
					if (_molIFrame && _molIFrame.contentWindow && _molIFrame.contentWindow.bc_vastClientFunc) {
						if (_player) {
							_player.vastClient = _molIFrame.contentWindow.bc_vastClientFunc;
						}
						else {
							// in case of header bidding the _player may not be set yet
							_vastClientFunc = _molIFrame.contentWindow.bc_vastClientFunc;
						}
					}

					callback(true);
				}
				else if (msgEvent.data === 'error') {
					frame.contentWindow.removeEventListener('message', onLoadIFrame);

					_molLoadingInProgress = false;

					_logger.error(_prefix, 'Failed to load MailOnline Plugin. Error event: ', e);
					callback(false);
				}
			};

			_molLoadingInProgress = true;

			var frameID = 'bc-mol-frame-' + Date.now();
			var frame = insertHiddenIframe(frameID);
			_molIFrame = frame;

			try {
				// make sure for every new plugin version we reload MOL plugin
				var molPath = MOL_PLUGIN_URL + '?rand=' + PLUGIN_VERSION;
				writeAsyncScriptToFrame(frame, molPath, true, getOrigin());

				frame.contentWindow.addEventListener('message', onLoadIFrame);
			}
			catch (e) {
				// failed to load MOL.
				_logger.error(_prefix, 'Failed to load Mail Online Plugin - caught error writing iFrame.');

				callback(false);
			}
		}
		else {
			if (_molLoadingInProgress) {
				_logger.log(_prefix, 'MailOnline Plugin loading in progress - setting interval to run callback when loaded');
				waitMolLoaded = setInterval(function () {
					if (!_molLoadingInProgress) {
						clearInterval(waitMolLoaded);
						_logger.log(_prefix, 'MailOnline Plugin ' + (_molLoaded ? '' : 'not ') + 'loaded successfully - wait interval cleared');
						callback(_molLoaded);
					}
				}, 50);
				return;
			}

			_molLoadingInProgress = true;
			var script = document.createElement('script');
			script.src = MOL_PLUGIN_URL + '?rand=' + PLUGIN_VERSION;
			script.onload = function () {
				_molLoaded = true;
				_player.vastClient = window.bc_vastClientFunc;
				_molLoadingInProgress = false;
				_logger.log(_prefix, 'MailOnline Plugin loaded successfully');
				callback(true);
			};
			script.onerror = function (e) {
				_molLoaded = false;
				_molLoadingInProgress = false;
				_logger.error(_prefix, 'Failed to load MailOnline Plugin. Error event: ', e);
				callback(false);
			};

			document.body.appendChild(script);
		}
   	}
    else {
		_logger.log(_prefix, 'MailOnline Plugin already loaded');
		// make sure MOL plugin is registered for header bidding
		if (_vastClientFunc) {
			if (_player && !_player.vastClient) {
				_player.vastClient = _vastClientFunc;
			}
			_vastClientFunc = null;
		}
        callback(true);
    }
}

function loadImaPlugin (callback) {
    var vjs = window.videojs || false;
    if (!vjs) {
        _logger.warn(_prefix, 'Can\'t load IMA Plugin now - Videojs isn\'t loaded yet.');
        callback(false);
        return;
	}

	// validation for header bidding
	if (!_player) {
        _logger.warn(_prefix, 'Can\'t load IMA Plugin now - Brightcove player isn\'t loaded yet. The player must be loaded for auto-registration of the IMA plugin. Will attempt to load the IMA Plugin later.');
        callback(false);
        return;
	}

    if (!_imaTriedToLoad) {
		// check if IMA plugin is imbedded in player
		if (_player.ima3) {
			_logger.warn(_prefix, 'IMA Plugin already loaded within player.');
			callback(true);
			return;
		}

		// if ima script node already in document wait until it loaded or failed
		if (document.getElementById('bc_ima_plugin')) {
			var imaInt = setInterval(function () {
				if (_player.ima3) {
					clearInterval(imaInt);
					callback(true);
				}
			}, 100);
			// wait no longer than DEFAULT_SCRIPT_LOAD_TIMEOUT
			setTimeout(function () {
				clearInterval(imaInt);
				if (!_player.ima3) {
					callback(false);
				}
			}, DEFAULT_SCRIPT_LOAD_TIMEOUT);
			return;
		}

		// add ima css to the document head
		var css = document.createElement('link');
		css.href = 'https://players.brightcove.net/videojs-ima3/3/videojs.ima3.min.css';
		css.rel = 'stylesheet';
		var node = document.getElementsByTagName('head')[0];
		node.appendChild(css);

		// add ima plugin script to the document body
		var script = document.createElement('script');
		script.src = 'https://players.brightcove.net/videojs-ima3/3/videojs.ima3.min.js';
		script.id = 'bc_ima_plugin';
		script.onerror = function (e) {
			_logger.error(_prefix, 'Failed to load IMA Plugin. Error event: ', e);
			_imaTriedToLoad = true;	// flag to load IMA plugin script only once
			callback(false);
		};
		script.onload = function () {
			_logger.log(_prefix, 'IMA Plugin loaded successfully');
			_imaTriedToLoad = true;	// flag to load IMA plugin script only once
			callback(true);
		};
		document.body.appendChild(script);
   	}
    else {
		_logger.log(_prefix, 'IMA Plugin already loaded');
		if (_player.ima3) {
			callback(true);
		}
		else {
			callback(false);
		}
    }
}

function getAdRendererFromAdOptions (adOptions) {
	// if adRenderer option is present use it for all ads
	if (adOptions.hasOwnProperty('adRenderer') && adOptions.adRenderer &&
		(adOptions.adRenderer === _rendererNames.MOL || adOptions.adRenderer === _rendererNames.IMA)) {
		return {adRenderer: adOptions.adRenderer, userSet: true};
	}
	// for DFP use IMA plugin as renderer
	if (adOptions.hasOwnProperty('dfpParameters')) {
		return {adRenderer: _rendererNames.IMA, userSet: false};
	}
	return null;
}

function setAdRenderer (options) {
	if (options) {
		var adRenderer = _rendererNames.MOL;
		var rendObj;
		var i;
		// if options parameter is array of options from plugin embedded in player in studio
		// array in brightcove studio converted to object {0: {...}, 1: {...}, ...}
		if (Array.isArray(options) || options.hasOwnProperty('0')) {
			// get renderer name
			for (i = 0; options.hasOwnProperty(i); i++) {
				rendObj = getAdRendererFromAdOptions(options[i]);
				if (rendObj) {
					adRenderer = rendObj.adRenderer;
					if (rendObj.userSet) {
						break;
					}
				}
			}
			// set the same renderer across all configurations
			for (i = 0; options.hasOwnProperty(i); i++) {
				options[i].adRenderer = adRenderer;
			}
		}
		else {
			rendObj = getAdRendererFromAdOptions(options);
			// set renderer explicitly
			if (rendObj) {
				adRenderer = rendObj.adRenderer;
				options.adRenderer = rendObj.adRenderer;
			}
			else {
				options.adRenderer = adRenderer;
			}
		}
		return adRenderer;
	}
	return null;
}

(function () {
	// if bidders settings are present in the $$PREBID_GLOBAL$$.plugin_prebid_options variable load prebid.js and do the bidding
	if ($$PREBID_GLOBAL$$.plugin_prebid_options && $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec) {
		setAdRenderer($$PREBID_GLOBAL$$.plugin_prebid_options);
		if ($$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec) {
			BC_prebid_in_progress = true;
			loadPrebidScript($$PREBID_GLOBAL$$.plugin_prebid_options, true);
		}
		if ($$PREBID_GLOBAL$$.plugin_prebid_options.adRenderer === 'ima') {
			loadImaPlugin(function () {});
		}
		else if ($$PREBID_GLOBAL$$.plugin_prebid_options.adRenderer === 'mailonline') {
			loadMolPlugin(function () {});
		}
	}
})();

var _player;
var _vastManagerObj;
var _adListManagerObj;
var _prebidCommunicatorObj;
var _defaultAdCancelTimeout = 3000;
var _adRenderer;

function renderAd (options) {
	if (_adRenderer === 'ima') {
		if (_player.ima3 && typeof _player.ima3 === 'function') {
			// initialize some setting values for IMA plugin
			_player.ima3({
				debug: true,
				showVpaidControls: true,
				requestMode: 'ondemand',
				timeout: options.adStartTimeout ? options.adStartTimeout : _defaultAdCancelTimeout,
				vpaidMode: 'ENABLED'
			});
		}
	}
	if (options.creative) {
		// render ad if vast url is ready
		_vastManagerObj = new _vastManager();
		options.doPrebid = null;
		_vastManagerObj.play(_player, options.creative, options);
	}
	else if (BC_prebid_in_progress) {
		// wait until prebid done
		document.addEventListener('prebid_done_loading_script', function () {
			if (_localPBJS.prebid_creative) {
				// render ad
				if (!options.onlyPrebid) {
					options.creative = _localPBJS.prebid_creative;
					_localPBJS.prebid_creative = null;
					_vastManagerObj = new _vastManager();
					options.doPrebid = null;
					_vastManagerObj.play(_player, options.creative, options);
				}
			}
		});
	}
	else if (_localPBJS.prebid_creative) {
		// render ad if vast url from prebid is ready
		if (!options.onlyPrebid) {
			options.creative = _localPBJS.prebid_creative;
			_localPBJS.prebid_creative = null;
			_vastManagerObj = new _vastManager();
			options.doPrebid = null;
			_vastManagerObj.play(_player, options.creative, options);
		}
	}
	else if (options.onlyPrebid) {
		// do bidding only
		_prebidCommunicatorObj = new _prebidCommunicator();
		options.doPrebid = doPrebid;
		_prebidCommunicatorObj.doPrebid(options);
	}
	else {
		// do prebid if needed and render ad(s)
		_adListManagerObj = new _adListManager();
		var arrOptions = convertOptionsToArray(options);
		arrOptions.forEach(function (opt) {
			opt.doPrebid = doPrebid;
		});
		_adListManagerObj.play(_player, arrOptions);
	}
}

var prebidVastPlugin = function (player) {
	_player = player;
	return {
		// @exclude
		// Method exposed only for unit Testing Purpose
		// Gets stripped off in the actual build artifact
		test: function () {
			return {
				doPrebid: function (options, callback) {
					if (_localPBJS.bc_pbjs === undefined) {
						loadPrebidScript(options, false);
						var waitReady = setInterval(function () {
							if (_localPBJS.bc_pbjs !== undefined) {
								clearInterval(waitReady);
								doPrebid(options, callback);
							}
						}, 50);
					}
					else {
						doPrebid(options, callback);
					}
				},
				specifyBidderAliases: specifyBidderAliases,
				prepareBidderSettings: prepareBidderSettings,
				loadPrebidScript: loadPrebidScript,
				bcPrebidInProgress: function () { return BC_prebid_in_progress; },
				loadMolPlugin: loadMolPlugin,
				loadImaPlugin: loadImaPlugin,
				renderAd: renderAd,
				insertHiddenIframe: insertHiddenIframe,
				getAdRendererFromAdOptions: getAdRendererFromAdOptions,
				setAdRenderer: setAdRenderer,
				player: _player,
				localPBJS: _localPBJS
			};
		},
		// @endexclude

		run: function (options) {
			if (!_player) {
				// ignore call if player is not ready
				return;
			}
			_adRenderer = setAdRenderer(options);
			// get Brightcove Player Id
			var playerId = '';
			if (_player.bcinfo) {
				playerId = _player.bcinfo.playerId;
			}
			else if (_player.options_ && _player.options_['data-player']) {
				playerId = _player.options_['data-player'];
			}
			_logger.setPlayerId((playerId && playerId.length > 0 ? (playerId + '-') : '') + _player.el_.id);
			if (!_localPBJS.bc_pbjs && !BC_prebid_in_progress && !options.creative) {
				loadPrebidScript(options, false);
			}
			// Brightcove Player v5.28.1 issues alert on every tech() call
			if (window.videojs && window.videojs.VERSION.substr(0, 2) <= '5.') {
				_player.tech = function () {
					return _player.tech_;
				};
			}
			if (!options.onlyPrebid) {
				var pluginLoader = loadMolPlugin;
				if (_adRenderer === 'ima') {
					pluginLoader = loadImaPlugin;
				}
				pluginLoader(function (succ) {
					if (succ) {
						renderAd(options);
					}
				});
			}
			else {
				renderAd(options);
			}
		},

		stop: function () {
			if (_vastManagerObj) {
				_vastManagerObj.stop();
			} else if (_adListManagerObj) {
                _adListManagerObj.stop();
            }
		}
	};
};
// ////////////////////////////////////////////////////////////////////
// EXPORTS
module.exports = prebidVastPlugin;

if ($$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue) {
    $$PREBID_GLOBAL$$.BCVideo_PrebidPluginApiQue.push(prebidVastPlugin);
}
