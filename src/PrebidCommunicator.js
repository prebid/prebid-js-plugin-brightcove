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
		for (var i = 0; i < arrBids.length; i++) {
			if (arrBids[i].cpm > cpm) {
				cpm = arrBids[i].cpm;
				creative = arrBids[i].vastUrl;
			}
		}
		_logger.log(_prefix, 'Selected VAST url: ' + creative);
		return creative;
	}

	function doPrebid() {
		// call bidding
    	if (_options.biddersSpec) {
    		_options.doPrebid(_options, function(bids) {
    			var arrBids = (bids && bids[_options.biddersSpec.code]) ? bids[_options.biddersSpec.code].bids : [];
    			_logger.log(_prefix, 'bids for bidding: ', arrBids);
    			if (arrBids && Array.isArray(arrBids)) {
        			var creative;
        			if (_options.dfpParameters) {
        				// use DFP server if DFP settings are present in options
	        			_logger.log(_prefix, 'Use DFP');
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
								_logger.log(_prefix, 'Selected VAST url: ' + adServerCreative);
								if (_callback) {
									_callback(adServerCreative);
								}
								else {
									$$PREBID_GLOBAL$.prebid_creative = adServerCreative;
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
    	    		if (_localPBJS.bc_pbjs) {
    	    			clearInterval(waitPbjs);
    	    			waitPbjs = null;
    	    			doPrebid();
    	    		}
    	    		else if (_localPBJS.bc_pbjs_error) {
    	    			clearInterval(waitPbjs);
    	    			waitPbjs = null;
    	    			callback(null);
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
