/**
 * Prebid.js Communication module.
 * @module prebidCommunicator
 */

var _prebidGlobal = require('./PrebidGlobal.js');
var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->PrebidCommunicator';

var _localPBJS = _prebidGlobal.getLocal();

var prebidCommunicator = function () {
	var _options;
	var _callback;

	function selectWinnerByCPM(arrBids) {
		var cpm = 0.0;
		var creative;
		var cacheKey;
		for (var i = 0; i < arrBids.length; i++) {
			if (arrBids[i].cpm > cpm) {
				cpm = arrBids[i].cpm;
				creative = arrBids[i].vastUrl;
				cacheKey = arrBids[i].videoCacheKey;
			}
		}
		// get prebid cache url for winner
		if (cacheKey && cacheKey.length > 0 && _options.prebidConfigOptions &&
			_options.prebidConfigOptions.cache && _options.prebidConfigOptions.cache.url) {
			creative = _options.prebidConfigOptions.cache.url + '?uuid=' + cacheKey;
		}
		_logger.log(_prefix, 'Selected VAST url: ' + creative);
		return creative;
	}

	// get prebid cache url if available
	function getPrebidCacheUrl(creative, arrBids) {
		for (var i = 0; i < arrBids.length; i++) {
			if (arrBids[i].vastUrl === creative) {
				// winner is creative from bid array
				if (arrBids[i].videoCacheKey && arrBids[i].videoCacheKey.length > 0 &&
					_options.prebidConfigOptions && _options.prebidConfigOptions.cache &&
					_options.prebidConfigOptions.cache.url) {
					return _options.prebidConfigOptions.cache.url + '?uuid=' + arrBids[i].videoCacheKey;
				}
				return creative;
			}
		}
		// winner is not creative from bid array
		return creative;
	}

	function doPrebid() {
		// call bidding
    	if (_options.biddersSpec) {
    		_options.doPrebid(_options, function(bids) {
				var arrBids = (_options.biddersSpec && bids && typeof bids !== 'string' && bids[_options.biddersSpec.code])	? bids[_options.biddersSpec.code].bids : [];
    			_logger.log(_prefix, 'bids for bidding: ', arrBids);
    			if (arrBids && Array.isArray(arrBids)) {
        			var creative;
        			if (_options.dfpParameters) {
        				// use DFP server if DFP settings are present in options
	        			_logger.log(_prefix, 'Use DFP');
						if (arrBids.length === 0 && typeof bids === 'string') {
							// bids is a dfp vast url
							creative = bids;
						}
						else {
							var dfpOpts = {adUnit: _options.biddersSpec};
							if (_options.dfpParameters.url && _options.dfpParameters.url.length > 0) {
								dfpOpts.url = _options.dfpParameters.url;
							}
							if (_options.dfpParameters.params && _options.dfpParameters.params.hasOwnProperty('iu')) {
								dfpOpts.params = _options.dfpParameters.params;
							}
							if (_options.dfpParameters.bid && Object.keys(_options.dfpParameters.bid).length > 0) {
								dfpOpts.bid = _options.dfpParameters.bid;
							}
							_logger.log(_prefix, 'DFP buildVideoUrl options: ', dfpOpts);
							creative = _localPBJS.bc_pbjs.adServers.dfp.buildVideoUrl(dfpOpts);
						}
            			_logger.log(_prefix, 'Selected VAST url: ' + creative);
						if (_callback) {
							_callback(creative);
        				}
        				else {
							_localPBJS.prebid_creative = creative;
        				}
        			}
        			else if (_options.adServerCallback) {
        				// use 3rd party ad server if ad server callback is present in options
	        			_logger.log(_prefix, 'Use 3rd party ad server');
						var func;
						if (typeof _options.adServerCallback === 'function') {
							func = _options.adServerCallback;
						}
						else if (typeof _options.adServerCallback === 'string' &&
								 window[_options.adServerCallback] &&
								 typeof window[_options.adServerCallback] === 'function') {
							func = window[_options.adServerCallback];
						}
						if (func) {
							func(arrBids, function(adServerCreative) {
								var cr = getPrebidCacheUrl(adServerCreative, arrBids);
								_logger.log(_prefix, 'Selected VAST url: ' + cr);
								if (_callback) {
									_callback(cr);
								}
								else {
									$$PREBID_GLOBAL$$.prebid_creative = cr;
								}
							});
						}
						else {
							_logger.log(_prefix, 'Select winner by CPM because 3rd party callback is invalid');
							creative = selectWinnerByCPM(arrBids);
							if (_callback) {
								_callback(creative);
							}
							else {
								_localPBJS.prebid_creative = creative;
							}
						}
        			}
        			else {
        				// select vast url from bid with higher cpm
	        			_logger.log(_prefix, 'Select winner by CPM');
	    				creative = selectWinnerByCPM(arrBids);
						if (_callback) {
        					_callback(creative);
        				}
        				else {
							_localPBJS.prebid_creative = creative;
        				}
        			}
    			}
    			else {
   	    			_logger.log(_prefix, 'Selected VAST url: null');
 				    if (_callback) {
    					_callback(null);
    				}
    			}
    		});
    	}
    	else {
			if (_callback) {
				_callback(null);
			}
    	}
	}

    this.doPrebid = function (options, callback) {
    	_options = options;
    	_callback = callback;

    	if (_options.doPrebid) {
    		if (_localPBJS.bc_pbjs) {
    			// do prebid if prebid.js is loaded
    			doPrebid();
    		}
    		else {
    			// wait until prebid.js is loaded
    			var waitPbjs = setInterval(function() {
    	    		if (_localPBJS.bc_pbjs || _localPBJS.bc_pbjs_error) {
    	    			clearInterval(waitPbjs);
    	    			waitPbjs = null;
    	    			doPrebid();		// we will try to get xml url from prebid.js if possible or generate locally for DFP call.
    	    		}
    			}, 100);
    		}
    	}
    	else {
    		if (_callback) {
    			_callback(null);
    		}
    	}
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function() {
		return {
		};
	};
	// @endexclude
};

module.exports = prebidCommunicator;
