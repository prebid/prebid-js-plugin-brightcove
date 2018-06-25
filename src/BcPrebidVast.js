/**
 * Header Bidding Plugin Brightcove module.
 */

// CONSTANTS

var _vjs = window.videojs !== undefined ? window.videojs : null;
var _prebidGlobal = require('./PrebidGlobal.js');
var _vastManager = require('./VastManager.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->';

var $$PREBID_GLOBAL$$ = _prebidGlobal.getGlobal();

_logger.always(_prefix, 'Version 0.0.10');

var BC_prebid_in_progress = $$PREBID_GLOBAL$$.plugin_prebid_options && $$PREBID_GLOBAL$$.plugin_prebid_options.biddersSpec;

// the function does bidding and returns bids thru callback
function doPrebid(options, callback) {
	if ($$PREBID_GLOBAL$$.bc_pbjs && options.biddersSpec) {
		$$PREBID_GLOBAL$$.bc_pbjs.que = $$PREBID_GLOBAL$$.bc_pbjs.que || [];

		//
		// Prebid Video adUnit
		//
		var logBids = function(bids) {
			_logger.log(_prefix, 'MESSAGE: got bids back: ', bids);
		};

		$$PREBID_GLOBAL$$.bc_pbjs.que.push(function() {
			$$PREBID_GLOBAL$$.bc_pbjs.addAdUnits(options.biddersSpec); // add your ad units to the bid request

			if (options.prebidConfigOptions) {
				// DFP reqired prebid cache
				if (!options.enablePrebidCache && options.prebidConfigOptions.cache && !options.dfpParameters) {
					delete options.prebidConfigOptions.cache;
				}
				$$PREBID_GLOBAL$$.bc_pbjs.setConfig(options.prebidConfigOptions);
			}

			// activate prebid cache (DFP reqired prebid cache)
			if (options.enablePrebidCache || options.dfpParameters) {
				$$PREBID_GLOBAL$$.bc_pbjs.setConfig({
					usePrebidCache: true
				});
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

// the function loads prebid.js and does header bidding if needed
function loadPrebidScript(options, fromHeader) {
    var pbjsScr = document.createElement('script');
    pbjsScr.onload = function() {
    	$$PREBID_GLOBAL$$.bc_pbjs = pbjs;
    	// do header bidding if needed
    	if (fromHeader && options && options.biddersSpec) {
    		BC_prebid_in_progress = true;
    		doPrebid(options, function(bids) {
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
	    			}
	    			else if (options.adServerCallback) {
	    				// use 3rd party ad server if ad server callback present in options
	        			_logger.log(_prefix, 'Use 3rd party ad server');
	    				$$PREBID_GLOBAL$$.plugin_prebid_options.adServerCallback(arrBids, function(creative) {
	    					$$PREBID_GLOBAL$$.prebid_creative = creative;
	    		            BC_prebid_in_progress = false;
							dispatchPrebidDoneEvent();
							_logger.log(_prefix, 'Selected VAST url: ' + $$PREBID_GLOBAL$$.prebid_creative);
						});
						return;
	    			}
	    			else {
	    				// select vast url from bid with higher cpm
	        			_logger.log(_prefix, 'Select winner by CPM');
	    				var cpm = 0.0;
	    				$$PREBID_GLOBAL$$.prebid_creativ = null;
	    				for (var i = 0; i < arrBids.length; i++) {
	    					if (arrBids[i].cpm > cpm) {
	    						cpm = arrBids[i].cpm;
	    						$$PREBID_GLOBAL$$.prebid_creative = arrBids[i].vastUrl;
	    					}
	    				}
	    	            BC_prebid_in_progress = false;
						dispatchPrebidDoneEvent();
	    			}
    			}
    			else {
    				// no bids
    	            BC_prebid_in_progress = false;
					dispatchPrebidDoneEvent();
    			}
    			_logger.log(_prefix, 'Selected VAST url: ' + $$PREBID_GLOBAL$$.prebid_creative);
			});
    	}
    };
    pbjsScr.onerror = function(e) {
    	_logger.error(_prefix, 'Failed to load prebid.js. Error event: ', e);
		if (options.pageNotificationCallback) {
			options.pageNotificationCallback('message', 'Failed to load prebid.js');
		}
    	$$PREBID_GLOBAL$$.bc_pbjs_error = true;
		dispatchPrebidDoneEvent();
    };
    pbjsScr.async = true;
    pbjsScr.type = 'text/javascript';
    pbjsScr.src = options.prebidPath ? options.prebidPath : '//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js';
    var node = document.getElementsByTagName('head')[0];
    node.appendChild(pbjsScr);
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
	if (!vjs.getPlugins().vastClient) {
		if (document.getElementById('mol-script')) {
			if (!molLoadingInProgress) {
		    	_logger.log(_prefix, 'MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfilly already');
				callback(molLoaded);
			}
			else {
				var waitMolLoaded = setInterval(function() {
					if (!molLoadingInProgress) {
						clearInterval(waitMolLoaded);
				    	_logger.log(_prefix, 'MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfilly already');
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
	    	_logger.log(_prefix, 'MailOnline Plugin loaded successfilly');
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
	    molScr.src = '//acdn.adnxs.com/video/plugins/mol/videojs_5.vast.vpaid.min.js';
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
function registerPrebidVastPlugin(vjs) {
	_vjs = vjs;
	if (!_vjs.getPlugins().bcPrebidVastPlugin) {
		reqisterPrebidVastPlugin();
	}

	_vjs.registerPlugin('bcPrebidVastPluginCommand', function(command) {
		if (command === 'stop') {
			if (_vastManagerObj) {
				_vastManagerObj.stop();
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
			loadPrebidScript: loadPrebidScript,
			bcPrebidInProgress: function() { return BC_prebid_in_progress; },
			loadMolPlugin: loadMolPlugin,
			renderAd: renderAd,
			player: _player
		};
	},
	// @endexclude

	init: function () {
		registerPrebidVastPlugin(videojs);
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
			_vjs.getPlugins().bcPrebidVastPluginCommand('stop');
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
var _prebidCommunicatorObj;
if (_vjs) {
	reqisterPrebidVastPlugin();
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
		// do prebid if needed and render ad
		_vastManagerObj = new _vastManager();
		options.doPrebid = doPrebid;
		_vastManagerObj.play(_player, options.creative, options);
	}
}

function reqisterPrebidVastPlugin() {
	_vjs.registerPlugin('bcPrebidVastPlugin', function(options) {
		if (!$$PREBID_GLOBAL$$.bc_pbjs && !BC_prebid_in_progress && !options.creative) {
			loadPrebidScript(options, false);
		}
		_player = this;
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
