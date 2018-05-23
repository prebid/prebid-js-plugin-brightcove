/**
 * Header Bidding Plugin Brightcove module.
 */

// CONSTANTS

var _vjs = window.videojs !== undefined ? window.videojs : null;
var _vastManager = require('./VastManager.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _logger = require('./Logging.js');
var _prefix = 'apnPrebidVast->';

_logger.always(_prefix, 'Version 1.0.9');

var APN_prebid_in_progress = window.apn_plugin_prebid_options && window.apn_plugin_prebid_options.biddersSpec;

// the function does bidding and returns bids thru callback
function doPrebid(options, callback) {
	if (window.apn_pbjs && options.biddersSpec) {
		  var pbjs = window.apn_pbjs || {};
	      pbjs.que = pbjs.que || [];

	      //
	      // Prebid Video adUnit
	      //
	      var logBids = function(bids) {
	    	  _logger.log(_prefix, 'MESSAGE: got bids back: ', bids);
	      };

	      pbjs.que.push(function() {
	        pbjs.addAdUnits(options.biddersSpec); // add your ad units to the bid request

	        if (options.prebidConfigOptions) {
	        	// DFP reqired prebid cache
			    if (!options.enablePrebidCache && options.prebidConfigOptions.cache && !options.dfpParameters) {
			    	delete options.prebidConfigOptions.cache;
			    }
	        	pbjs.setConfig(options.prebidConfigOptions);
	        }

	        // activate prebid cache (DFP reqired prebid cache)
		    if (options.enablePrebidCache || options.dfpParameters) {
			    pbjs.setConfig({
			        usePrebidCache: true
			    });
		    }

	        pbjs.requestBids({
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

// the function loads prebid.js and does header bidding if needed
function loadPrebidScript(options, fromHeader) {
    var pbjsScr = document.createElement('script');
    pbjsScr.onload = function() {
    	window.apn_pbjs = pbjs;
    	// do header bidding if needed
    	if (fromHeader && options && options.biddersSpec) {
    		APN_prebid_in_progress = true;
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
						window.prebid_creative = window.apn_pbjs.adServers.dfp.buildVideoUrl(dfpOpts);
	    	            APN_prebid_in_progress = false;
	    			}
	    			else if (options.adServerCallback) {
	    				// use 3rd party ad server if ad server callback present in options
	        			_logger.log(_prefix, 'Use 3rd party ad server');
	    				window.apn_plugin_prebid_options.adServerCallback(arrBids, function(creative) {
	    					window.prebid_creative = creative;
	    		            APN_prebid_in_progress = false;
	    				});
	    			}
	    			else {
	    				// select vast url from bid with higher cpm
	        			_logger.log(_prefix, 'Select winner by CPM');
	    				var cpm = 0.0;
	    				window.prebid_creativ = null;
	    				for (var i = 0; i < arrBids.length; i++) {
	    					if (arrBids[i].cpm > cpm) {
	    						cpm = arrBids[i].cpm;
	    						window.prebid_creative = arrBids[i].vastUrl;
	    					}
	    				}
	    	            APN_prebid_in_progress = false;
	    			}
    			}
    			else {
    				// no bids
    	            APN_prebid_in_progress = false;
    			}
    			_logger.log(_prefix, 'Selected VAST url: ' + window.prebid_creative);
			});
    	}
    };
    pbjsScr.onerror = function(e) {
    	_logger.error(_prefix, 'Failed to load prebid.js. Error event: ', e);
		if (options.pageNotificationCallback) {
			options.pageNotificationCallback('message', 'Failed to load prebid.js');
		}
    	window.apn_pbjs_error = true;
    };
    pbjsScr.async = true;
    pbjsScr.type = 'text/javascript';
    pbjsScr.src = options.prebidPath ? options.prebidPath : '//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js';
    var node = document.getElementsByTagName('head')[0];
    node.appendChild(pbjsScr);
}

// this function loads Appnexus MailOnline Plugin
var molLoadingInProgress = false;
var molLoaded = false;
function loadApnMolPlugin(callback) {
	var vjs = window.videojs || false;
	if (!vjs) {
    	_logger.warn(_prefix, 'Videojs is not loaded yet');
		callback(false);
		return;
	}
	if (!vjs.getPlugins().vastClient) {
		if (document.getElementById('apn-mol-script')) {
			if (!molLoadingInProgress) {
		    	_logger.log(_prefix, 'Appnexus MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfilly already');
				callback(molLoaded);
			}
			else {
				var waitMolLoaded = setInterval(function() {
					if (!molLoadingInProgress) {
						clearInterval(waitMolLoaded);
				    	_logger.log(_prefix, 'Appnexus MailOnline Plugin ' + (molLoaded ? '' : 'not ') + 'loaded successfilly already');
						callback(molLoaded);
					}
				}, 50);
			}
			return;
		}
		molLoadingInProgress = true;
	    var molScr = document.createElement('script');
	    molScr.id = 'apn-mol-script';
	    molScr.onload = function() {
	    	_logger.log(_prefix, 'Appnexus MailOnline Plugin loaded successfilly');
	    	molLoaded = true;
	    	molLoadingInProgress = false;
	    	callback(true);
	    };
	    molScr.onerror = function(e) {
	    	_logger.error(_prefix, 'Failed to load Appnexus MailOnline Plugin. Error event: ', e);
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
    	_logger.log(_prefix, 'Appnexus MailOnline Plugin already loaded');
		callback(true);
	}
}

(function () {
	// if bidders settings are present in the window.apn_plugin_prebid_options variable load prebid.js and do the bidding
	if (window.apn_plugin_prebid_options && window.apn_plugin_prebid_options.biddersSpec) {
		APN_prebid_in_progress = true;
		loadPrebidScript(window.apn_plugin_prebid_options, true);
	}
	loadApnMolPlugin(function() {});
})();

// register videojs prebid plugins
function registerPrebidVastPlugin(vjs) {
	_vjs = vjs;
	if (!_vjs.getPlugins().apnPrebidVastPlugin) {
		reqisterPrebidVastPlugin();
	}

	_vjs.registerPlugin('apnPrebidVastPluginCommand', function(command) {
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
				if (window.apn_pbjs === undefined) {
					loadPrebidScript(options, false);
					var waitReady = setInterval(function() {
						if (window.apn_pbjs !== undefined) {
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
			apnPrebidInProgress: function() { return APN_prebid_in_progress; },
			loadApnMolPlugin: loadApnMolPlugin,
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
		_vjs(id).apnPrebidVastPlugin(options);
	},

	stop: function() {
		if (this.id) {
			_vjs(this.id).apnPrebidVastPluginCommand('stop');
		}
		else {
			_vjs.getPlugins().apnPrebidVastPluginCommand('stop');
		}
	},

	renderAd: function(renderOptions, id, creative) {
		this.id = id;
		renderOptions.creative = creative;
		renderOptions.onlyPrebid = false;
		_vjs(id).apnPrebidVastPlugin(renderOptions);
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
	else if (APN_prebid_in_progress) {
		// wait until prebid done
		var waitPrebid = setInterval(function() {
			if (!APN_prebid_in_progress) {
				clearInterval(waitPrebid);
				waitPrebid = null;
				if (window.prebid_creative) {
					// render ad
					if (!options.onlyPrebid) {
						options.creative = window.prebid_creative;
						window.prebid_creative = null;
						_vastManagerObj = new _vastManager();
						options.doPrebid = null;
						_vastManagerObj.play(_player, options.creative, options);
					}
				}
			}
		}, 50);
	}
	else if (window.prebid_creative) {
		// render ad if vast url from prebid is ready
		if (!options.onlyPrebid) {
			options.creative = window.prebid_creative;
			window.prebid_creative = null;
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
	_vjs.registerPlugin('apnPrebidVastPlugin', function(options) {
		if (!window.apn_pbjs && !APN_prebid_in_progress && !options.creative) {
			loadPrebidScript(options, false);
		}
		_player = this;
		if (!options.onlyPrebid) {
			loadApnMolPlugin(function(succ) {
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
window.APNVideo_PrebidVastPlugin = prebidVastPlugin;
