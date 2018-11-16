/* eslint no-eval: 0 */
/**
 * Header Bidding Plugin Brightcove module.
 */

// CONSTANTS

var _vjs = window.videojs !== undefined ? window.videojs : null;
var _prebidGlobal = require('./PrebidGlobal.js');
var _vastManager = require('./VastManager.js');
var _adListManager = require('./AdListManager.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->';

var DEFAULT_PREBID_JS_URL = '//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js';
var DEFAULT_PREBID_CACHE_URL = '//prebid.adnxs.com/pbc/v1/cache';
var MOL_PLUGIN_URL = '//acdn.adnxs.com/video/plugins/mol/videojs_5.vast.vpaid.min.js';

var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();

_logger.always(_prefix, 'Version 0.3.3');

var BC_prebid_in_progress = $$PREBID_GLOBAL$$.plugin_prebid_options && $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec;

var defaultTemplate = '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0">' +
    '<script type="text/javascript">' +
	'function notifyParent(succ) {' +
    'window.parent.postMessage(succ ? \'ready\' : \'error\', \'{{origin}}\');' +
	'}' +
    '</script>' +
    '<script type="text/javascript" src="{{iframePrebid_JS}}" onload="notifyParent(true);" onerror="notifyParent(false);"></script>' +
    '</body>' +
	'</html>';
var DEFAULT_SCRIPT_LOAD_TIMEOUT = 3000;

// the function does bidding and returns bids thru callback
var BC_bidders_added = false;
function doPrebid(options, callback) {
	if ($$PREBID_GLOBAL$$.bc_pbjs && options.biddersSpec) {
		if (options.clearPrebid) {
			$$PREBID_GLOBAL$$.bc_pbjs.adUnits = [];
			$$PREBID_GLOBAL$$.bc_pbjs.bidderSettings = {};
			$$PREBID_GLOBAL$$.bc_pbjs.medianetGlobals = {};
			BC_bidders_added = false;
		}
		$$PREBID_GLOBAL$$.bc_pbjs.que = $$PREBID_GLOBAL$$.bc_pbjs.que || [];

		//
		// Prebid Video adUnit
		//
		var logBids = function(bids) {
			_logger.log(_prefix, 'MESSAGE: got bids back: ', bids);
		};

		$$PREBID_GLOBAL$$.bc_pbjs.que.push(function() {
			if (!BC_bidders_added) {
				BC_bidders_added = true;
				specifyBidderAliases(options.bidderAliases, $$PREBID_GLOBAL$$.bc_pbjs);
				prepareBidderSettings(options);
				if (options.bidderSettings) {
					$$PREBID_GLOBAL$$.bc_pbjs.bidderSettings = options.bidderSettings;
				}
				$$PREBID_GLOBAL$$.bc_pbjs.addAdUnits(options.biddersSpec); // add your ad units to the bid request
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
				$$PREBID_GLOBAL$$.bc_pbjs.setConfig(options.prebidConfigOptions);
			}

			$$PREBID_GLOBAL$$.bc_pbjs.requestBids({
				timeout: (options.prebidTimeout && options.prebidTimeout > 0) ? options.prebidTimeout : 700,
				bidsBackHandler: function(bids) { // this function will be called once bids are returned
					logBids(bids);
					callback(bids);
				}
			});
		});
	}
	else {
		callback(null);
	}
}

// This function enumerates all aliases for bidder adapters and defines them in prebid.js.
// bidderAliases is array of object each of them defines pair of alias/bidder.
// bc_pbjs is prebid.js instance.
function specifyBidderAliases(bidderAliases, bc_pbjs) {
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
function prepareBidderSettings(options) {
	if (options.bidderSettings) {
		var subtituteToEval = function (arr, obj) {
			if (arr.length > 1 && arr[0] === 'valueIsFunction') {
				arr.shift();
				var str = arr.join('');
				eval('obj.val = ' + str); // jshint ignore:line
			}
		};
		var findValProperty = function findValProperty(obj) {
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

function dispatchPrebidDoneEvent() {
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
function loadPrebidScript(options, fromHeader) {
	// internal function which will be called later
	var doInternalPrebid = function() {
    	// do header bidding if fromHeader is 'true' and bidder setting are present in options
    	if (fromHeader && options && options.biddersSpec) {
			BC_prebid_in_progress = true;
			// invoke prebid
    		doPrebid(options, function(bids) {
				// this function returns creative with higher CPM
				var selectWinnerByCPM = function(arrBids) {
					var cpm = 0.0;
					var creative = null;
					for (var i = 0; i < arrBids.length; i++) {
						if (arrBids[i].cpm > cpm) {
							cpm = arrBids[i].cpm;
							creative = arrBids[i].vastUrl;
						}
					}
					_logger.log(_prefix, 'Selected VAST url: ' + creative);
					return creative;
				};
				var arrBids = (bids && bids[options.biddersSpec.code]) ? bids[options.biddersSpec.code].bids : [];
    			_logger.log(_prefix, 'bids for bidding: ', arrBids);
    			if (arrBids && Array.isArray(arrBids)) {
	    			if (options.dfpParameters) {
	    				// use DFP server if DFP parameters present in options
						_logger.log(_prefix, 'Use DFP');
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
						$$PREBID_GLOBAL$$.prebid_creative = $$PREBID_GLOBAL$$.bc_pbjs.adServers.dfp.buildVideoUrl(dfpOpts);
						BC_prebid_in_progress = false;
						dispatchPrebidDoneEvent();
						_logger.log(_prefix, 'Selected VAST url: ' + $$PREBID_GLOBAL$$.prebid_creative);
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
							func(arrBids, function(creative) {
	    						$$PREBID_GLOBAL$$.prebid_creative = creative;
	    		            	BC_prebid_in_progress = false;
								dispatchPrebidDoneEvent();
								_logger.log(_prefix, 'Selected VAST url: ' + $$PREBID_GLOBAL$$.prebid_creative);
							});
						}
						else {
							_logger.log(_prefix, 'Select winner by CPM because 3rd party callback is invalid');
							$$PREBID_GLOBAL$$.prebid_creative = selectWinnerByCPM(arrBids);
							BC_prebid_in_progress = false;
							dispatchPrebidDoneEvent();
						}
	    			}
	    			else {
	    				// select vast url from bid with higher cpm
	        			_logger.log(_prefix, 'Select winner by CPM');
	    				$$PREBID_GLOBAL$$.prebid_creative = selectWinnerByCPM(arrBids);
	    	            BC_prebid_in_progress = false;
						dispatchPrebidDoneEvent();
	    			}
    			}
    			else {
    				// no bids
    	            BC_prebid_in_progress = false;
					_logger.log(_prefix, 'Selected VAST url: ' + $$PREBID_GLOBAL$$.prebid_creative);
				}
			});
    	}
	};

	function getOrigin() {
		if (window.location.origin) {
			return window.location.origin;
		}
		else {
			return window.location.protocol + '//' +
				window.location.hostname +
				(window.location.port ? ':' + window.location.port : '');
		}
	}

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

	if (!document.body) {
		// plugin has been loaded in a headed (document body is not ready)
		if (document.getElementById('bc-pb-script')) {
			// if prebid.js is already loaded try to invoke prebid.
			doInternalPrebid();
			return;
		}

		var pbjsScr = document.createElement('script');
		pbjsScr.onload = function() {
			$$PREBID_GLOBAL$$.bc_pbjs = pbjs;
			// after prebid.js is successfully loaded try to invoke prebid.
			doInternalPrebid();
		};
		pbjsScr.onerror = function(e) {
			// failed to load prebid.js.
			_logger.error(_prefix, 'Failed to load prebid.js. Error event: ', e);
			if (options.pageNotificationCallback) {
				options.pageNotificationCallback('message', 'Failed to load prebid.js');
			}
			$$PREBID_GLOBAL$$.bc_pbjs_error = true;
			dispatchPrebidDoneEvent();
		};
		pbjsScr.id = 'bc-pb-script';
		pbjsScr.async = true;
		pbjsScr.type = 'text/javascript';
		pbjsScr.src = !!prebidPath ? prebidPath : DEFAULT_PREBID_JS_URL;
		var node = document.getElementsByTagName('head')[0];
		node.appendChild(pbjsScr);
	}
	else {
		// plugin has been loaded in the document body or has been embedded in a player
		var frame = document.createElement('iframe');
		frame.id = 'pbjs_container_' + Date.now();
		frame.src = 'about:blank';
		frame.marginWidth = '0';
		frame.marginHeight = '0';
		frame.frameBorder = '0';
		frame.width = '0%';
		frame.height = '0%';
		frame.style.position = 'absolute';
		frame.style.left = '0px';
		frame.style.top = '0px';
		frame.style.margin = '0px';
		frame.style.padding = '0px';
		frame.style.border = 'none';
		frame.style.width = '0%';
		frame.style.height = '0%';
		document.body.appendChild(frame);

		var template = defaultTemplate;
		template = template.replace(new RegExp('{{iframePrebid_JS}}', 'g'), !!prebidPath ? prebidPath : DEFAULT_PREBID_JS_URL);
		template = template.replace(new RegExp('{{origin}}', 'g'), getOrigin());

		var timeout = setTimeout(function() {
			// failed to load prebid.js in iframe.
			_logger.error(_prefix, 'Failed to load prebid.js in iframe (timeout).');
			if (options.pageNotificationCallback) {
				options.pageNotificationCallback('message', 'Failed to load prebid.js in iframe (timeout)');
			}
			$$PREBID_GLOBAL$$.bc_pbjs_error = true;
			dispatchPrebidDoneEvent();
			timeout = null;
		}, !!scriptLoadTimeout ? scriptLoadTimeout : DEFAULT_SCRIPT_LOAD_TIMEOUT);

		var iframeDoc = frame.contentWindow && frame.contentWindow.document;
		if (iframeDoc) {
			try {
				iframeDoc.open();
				iframeDoc.write(template);
				iframeDoc.close();
				var onLoadIFrame = function(msgEvent) {
					if (timeout) {
						clearTimeout(timeout);
					}
					else {
						// prebid.js loadding timeout already happened. do nothing
						return;
					}
					// check only our messages 'ready' and 'error' from ifarme
					if (msgEvent.data === 'ready') {
						$$PREBID_GLOBAL$$.bc_pbjs = frame.contentWindow.pbjs;
						// after prebid.js is successfully loaded try to invoke prebid.
						doInternalPrebid();
						window.removeEventListener('message', onLoadIFrame);
					}
					else if (msgEvent.data === 'error') {
						// failed to load prebid.js.
						_logger.error(_prefix, 'Failed to load prebid.js in iframe.');
						if (options.pageNotificationCallback) {
							options.pageNotificationCallback('message', 'Failed to load prebid.js inframe');
						}
						$$PREBID_GLOBAL$$.bc_pbjs_error = true;
						dispatchPrebidDoneEvent();
						window.removeEventListener('message', onLoadIFrame);
					}
				};

				window.addEventListener('message', onLoadIFrame);
			}
			catch (e) {
				// failed to load prebid.js.
				_logger.error(_prefix, 'Failed to load prebid.js.');
				if (options.pageNotificationCallback) {
					options.pageNotificationCallback('message', 'Failed to load prebid.js. Error: ' + e);
				}
				$$PREBID_GLOBAL$$.bc_pbjs_error = true;
				dispatchPrebidDoneEvent();
			}
		}
	}
}

function convertOptionsToArray(options) {
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
var molLoadingInProgress = false;
var molLoaded = false;
function loadMolPlugin(callback) {
	var vjs = window.videojs || false;
	if (!vjs) {
    	_logger.warn(_prefix, 'Videojs is not loaded yet');
		callback(false);
		return;
	}
	// getPlugins not exist in Brightcove Player v5.28.1
	if (!vjs.getPlugins || !vjs.getPlugins().vastClient) {
		if (document.getElementById('mol-script')) {
			if (!molLoadingInProgress) {
		    	_logger.log(_prefix, 'MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfully already');
				callback(molLoaded);
			}
			else {
				var waitMolLoaded = setInterval(function() {
					if (!molLoadingInProgress) {
						clearInterval(waitMolLoaded);
				    	_logger.log(_prefix, 'MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfully already');
						callback(molLoaded);
					}
				}, 50);
			}
			return;
		}
		molLoadingInProgress = true;
	    var molScr = document.createElement('script');
	    molScr.id = 'mol-script';
	    molScr.onload = function() {
	    	_logger.log(_prefix, 'MailOnline Plugin loaded successfully');
	    	molLoaded = true;
	    	molLoadingInProgress = false;
	    	callback(true);
	    };
	    molScr.onerror = function(e) {
	    	_logger.error(_prefix, 'Failed to load MailOnline Plugin. Error event: ', e);
	    	molLoadingInProgress = false;
	    	callback(false);
	    };
	    molScr.async = true;
	    molScr.type = 'text/javascript';
	    molScr.src = MOL_PLUGIN_URL;
	    var node = document.getElementsByTagName('head')[0];
	    node.appendChild(molScr);
	}
	else {
    	_logger.log(_prefix, 'MailOnline Plugin already loaded');
		callback(true);
	}
}

(function () {
	// if bidders settings are present in the $$PREBID_GLOBAL$$.plugin_prebid_options variable load prebid.js and do the bidding
	if ($$PREBID_GLOBAL$$.plugin_prebid_options && $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec) {
		BC_prebid_in_progress = true;
		loadPrebidScript($$PREBID_GLOBAL$$.plugin_prebid_options, true);
	}
	loadMolPlugin(function() {});
})();

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
			if (_vastManagerObj) {
				_vastManagerObj.stop();
			}
			else if (_adListManagerObj) {
				_adListManagerObj.stop();
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
			doPrebid: function(options, callback) {
				if ($$PREBID_GLOBAL$$.bc_pbjs === undefined) {
					loadPrebidScript(options, false);
					var waitReady = setInterval(function() {
						if ($$PREBID_GLOBAL$$.bc_pbjs !== undefined) {
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
			bcPrebidInProgress: function() { return BC_prebid_in_progress; },
			loadMolPlugin: loadMolPlugin,
			renderAd: renderAd,
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
// ////////////////////////////////////////////////////////////////////
// EXPORTS
module.exports = prebidVastPlugin;

var _player;
var _vastManagerObj;
var _adListManagerObj;
var _prebidCommunicatorObj;
if (_vjs) {
	registerPrebidVastPlugin();
}

function renderAd(options) {
	if (options.creative) {
		// render ad if vast url is ready
		_vastManagerObj = new _vastManager();
		options.doPrebid = null;
		_vastManagerObj.play(_player, options.creative, options);
	}
	else if (BC_prebid_in_progress) {
		// wait until prebid done
		document.addEventListener('prebid_done_loading_script', function() {
			if ($$PREBID_GLOBAL$$.prebid_creative) {
				// render ad
				if (!options.onlyPrebid) {
					options.creative = $$PREBID_GLOBAL$$.prebid_creative;
					$$PREBID_GLOBAL$$.prebid_creative = null;
					_vastManagerObj = new _vastManager();
					options.doPrebid = null;
					_vastManagerObj.play(_player, options.creative, options);
				}
			}
		});
	}
	else if ($$PREBID_GLOBAL$$.prebid_creative) {
		// render ad if vast url from prebid is ready
		if (!options.onlyPrebid) {
			options.creative = $$PREBID_GLOBAL$$.prebid_creative;
			$$PREBID_GLOBAL$$.prebid_creative = null;
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
		arrOptions.forEach(function(opt) {
			opt.doPrebid = doPrebid;
		});
		_adListManagerObj.play(_player, arrOptions);
	}
}

function registerPrebidVastPlugin() {
	// Brightcove Player v5.28.1 uses 'plugin' function to register plugin
	var regFn = !!_vjs.registerPlugin ? _vjs.registerPlugin : _vjs.plugin;
	regFn('bcPrebidVastPlugin', function(options) {
		if (!$$PREBID_GLOBAL$$.bc_pbjs && !BC_prebid_in_progress && !options.creative) {
			loadPrebidScript(options, false);
		}
		_player = this;
		// Brightcove Player v5.28.1 issues alert on every tech() call
		if (videojs.VERSION.substr(0, 2) <= '5.') {
			_player.tech = function() {
				return _player.tech_;
			};
		}
		if (!options.onlyPrebid) {
			loadMolPlugin(function(succ) {
				if (succ) {
					renderAd(options);
				}
			});
		}
		else {
			renderAd(options);
		}
	});
}
window.BCVideo_PrebidVastPlugin = prebidVastPlugin;
