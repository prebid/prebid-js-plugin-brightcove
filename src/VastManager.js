/**
 * Ad Renderer module.
 * @module vastManager
 */

 var _logger = require('./Logging.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _MarkersHandler = require('./MarkersHandler.js');
var _prefix = 'apnPrebidVast->vastManager';

var vastManager = function () {
	var _player;
	var _creative;
	var _options;
	var _adPlaying = false;
	var _defaultAdCancelTimeout = 3000;
    var _savedMarkers;
    var _markersHandler;
    var _contentDuration = 0;
    var _markerXml = {};
    var _adIndicator;
	var _cover;
	var _spinnerDiv;
	var _showSpinner = false;
    var _mobilePrerollNeedClick = false;

    function isMobile() {
    	return /iP(hone|ad|od)|Android|Windows Phone/.test(navigator.userAgent);
    }

    function isIDevice() {
    	return /iP(hone|ad)/.test(navigator.userAgent);
    }

    function isIPhone() {
    	return /iP(hone|od)/.test(navigator.userAgent);
    }

	function showCover(show) {
		_logger.log(_prefix, (show ? 'Show' : 'Hide') + ' ad cover with spinner');
		if (show) {
    		_cover.style.display = 'block';
    		_showSpinner = true;
    		setTimeout(function() {
    			if (_showSpinner) {
    	    		_spinnerDiv.style.display = 'block';
    			}
    		}, 10);
    		_player.el().classList.add('vjs-waiting');
		}
		else {
    		_spinnerDiv.style.display = 'none';
    		_showSpinner = false;
    		_cover.style.display = 'none';
    		_player.el().classList.remove('vjs-waiting');
		}
	}

	// restore main content after ad is finished
	function resetContent() {
		showCover(false);
		setTimeout(function() {
			_adPlaying = false;
			if (_savedMarkers && _player.markers && _player.markers.reset) {
		    	_player.markers.reset(JSON.parse(_savedMarkers));
			}
		}, 1000);
		_adIndicator.style.display = 'none';
    	_player.off('trace.message', traceMessage);
    	_player.off('trace.event', traceEvent);
	}

	// convert string represetation of time to number represents seconds
	function convertStringToSeconds(strTime, callback) {
		if (!strTime || strTime === 'start') {
			return 0;
		}
		else if (strTime === 'end') {
			// post-roll
			if (_contentDuration > 0) {
				return _contentDuration;
			}
			else {
				// wait for metadata to get video duration
				_player.one('loadedmetadata', function() {
					_contentDuration = parseInt(_player.duration()) - 0.5;
					callback(_contentDuration);
				});
				return -1;
			}
		}
		else if (strTime.indexOf(':') > 0) {
			// convert hh:mm:ss or hh:mm:ss.msec to seconds
			try {
				var hours = parseInt(strTime.substr(0, strTime.indexOf(':')));
				strTime = strTime.substr(3, strTime.length - 3);
				var minuts = parseInt(strTime.substr(0, strTime.indexOf(':')));
				strTime = strTime.substr(3, strTime.length - 3);
				var seconds;
				if (strTime.indexOf('.') > 0) {
					seconds = parseInt(strTime.substr(0, strTime.indexOf('.')));
					strTime = strTime.substr(3, strTime.length - 3);
					var mseconds = parseInt(strTime);
					if (mseconds >= 500) {
						seconds++;
					}
				}
				else {
					seconds = parseInt(strTime);
				}
				return hours * 3600 + minuts * 60 + seconds;
			}
			catch (e) {
				_logger.warn(_prefix, 'Failed to convert time to seconds');
				return 0;
			}
		}
		else if (strTime.indexOf('%') > 0) {
			// convert n% to seconds
			var percents = parseInt(strTime.substr(0, strTime.indexOf('%')));
			if (_contentDuration > 0) {
				return parseInt(_contentDuration * percents / 100);
			}
			else {
				// wait for metadata to get video duration
				_player.one('loadedmetadata', function() {
					_contentDuration = parseInt(_player.duration()) - 0.5;
					callback(parseInt(_contentDuration * percents / 100));
				});
				return -1;
			}
		}
		else {
			_logger.warn(_prefix, 'Invalid time format: ' + strTime);
			return 0;
		}
	}

	// metadata loaded event handler
	function loadMetadataHandler() {
		_contentDuration = parseInt(_player.duration()) - 0.5;
        _player.off('loadedmetadata', loadMetadataHandler);
	}

	// send notification to page
	function traceMessage(event) {
		_logger.log(_prefix, 'trace event message: ' + event.data.message);
		if (_options.pageNotificationCallback) {
			_options.pageNotificationCallback('message', event.data.message);
		}
	}

	// send notification to page
	function traceEvent(event) {
		_logger.log(_prefix, 'trace event: ' + event.data.event);
		if (_options.pageNotificationCallback) {
			_options.pageNotificationCallback('event', event.data.event);
		}
	}

	function setPlaybackMethodData() {
		var initPlayback = 'auto';
    	if (_player.currentTime() === 0) {
    		initPlayback = _player.autoplay() ? 'auto' : 'click';
    	}
		var initAudio = _player.muted() ? 'off' : 'on';
		_options.initialPlayback = initPlayback;
		_options.initialAudio = initAudio;
	}

	// function to play ad
    function play(creative) {
    	_creative = creative;

    	var prerollNeedClickToPlay = false;

    	var creativeIsVast = _creative.indexOf('<VAST') >= 0;

    	// prepare ad indicator overlay
		_adIndicator = document.createElement('p');
		_adIndicator.className = 'vjs-overlay';
		_adIndicator.innerHTML = _options.adText ? _options.adText : 'Ad';
		_adIndicator.style.display = 'none';
		_adIndicator.style.left = '10px';
		_player.el().appendChild(_adIndicator);

		// player event listeners
    	_player.on('vast.adStart', function() {
      	  	_adIndicator.style.display = 'block';
    		_adPlaying = true;
    		showCover(false);
    	});

    	_player.on('vast.adError', function() {
    		resetContent();
    	});

    	_player.on('vast.adsCancel', function() {
    		resetContent();
    	});

    	_player.on('vast.adSkip', function() {
    		resetContent();
    	});

    	_player.on('vast.reset', function () {
    		resetContent();
    	});

    	_player.on('vast.contentEnd', function () {
    		resetContent();
    	});

    	_player.on('adFinished', function () {
    		resetContent();
    	});

    	_player.on('trace.message', traceMessage);
    	_player.on('trace.event', traceEvent);

    	// function to play vast xml
    	var playAd = function(xml) {
    		if (_adPlaying) {
    			// not interrupt playing ad
    			return;
    		}
        	setPlaybackMethodData();
    		// pause main content and save markers
    		var needPauseAndPlay = !isMobile() || !_player.paused();
    		if (needPauseAndPlay) {
        		_player.pause();
    		}
    		_adPlaying = true;
    		if (_markersHandler) {
      	  		_savedMarkers = JSON.stringify(_player.markers.getMarkers());
    		}
    		// prepare parameters for MailOnline plugin
    		var clientParams = {
          	  		// VAST xml
          	  		adTagXML: function(callback) {
          	  			setTimeout(function() {
          	  				callback(null, xml);
          	  			}, 0);
          	  		},
          	  		playAdAlways: false,
          	  		adCancelTimeout: (_options && _options.adStartTimeout) ? _options.adStartTimeout : _defaultAdCancelTimeout,
          	  		adsEnabled: true,
          	  		initialPlayback: _options.initialPlayback,
          	  		initialAudio: _options.initialAudio
                };
    		if (creativeIsVast) {
    			// creative is VAST
    			clientParams.adTagXML = function(callback) {
      	  			setTimeout(function() {
      	  				callback(null, _creative);
      	  			}, 0);
      	  		};
    		}
    		else {
    			// creative is VAST URL
    			clientParams.adTagUrl = creative;
    		}
    		if (_options && _options.skippable && _options.skippable.skipText) {
    			clientParams.skipText = _options.skippable.skipText;
    		}
    		if (_options && _options.skippable && _options.skippable.skipButtonText) {
    			clientParams.skipButtonText = _options.skippable.skipButtonText;
    		}
    		if (_options && _options.skippable && _options.skippable.hasOwnProperty('enabled')) {
    			clientParams.skippable = {};
    			clientParams.skippable.enabled = _options.skippable.enabled;
    			clientParams.skippable.videoThreshold = _options.skippable.videoThreshold * 1000;
    			clientParams.skippable.videoOffset = _options.skippable.videoOffset * 1000;
    		}

    		// start MailOnline plugin for render the ad
      	  	_player.vastClient(clientParams);
      	  	if (_options.initialPlayback !== 'click' || _mobilePrerollNeedClick) {
      	  		if (!prerollNeedClickToPlay) {
    	      	  	setTimeout(function() {
    	      	  		_player.play();
    	      	  	}, 0);
      	  		}
      	  	}
      	  	// _adIndicator.style.display = 'block';
		};

    	if (_player.duration() > 0) {
    		_contentDuration = parseInt(_player.duration()) - 0.5;
    	}
    	else {
            _player.one('loadedmetadata', loadMetadataHandler);
    	}
		if (_options.timeOffset) {
	        // prepare timeline marker for the ad
		    var timeMarkers = {
			    	markerStyle: {
			    		'width': '5px',
			    		'border-radius': '10%',
			    		'background-color': 'white'
			    	},
					markerTip: {
						display: false
					},
			    	onMarkerReached: function(marker) {
			    		if (_markerXml[marker.time]) {
			    			_mobilePrerollNeedClick = isMobile() && marker.time === 0;
			    			if (_mobilePrerollNeedClick) {
			    				showCover(false);
			    				_player.bigPlayButton.el_.style.opacity = 1;
			    				if (isIDevice()) {
			    					// iOS
			    					if (isIPhone()) {
			    						// iPhone
						    			_player.one('play', function() {
								    		playAd(_markerXml[marker.time]);
								    		delete _markerXml[marker.time];
						    			});
			    					}
			    					else {
			    						// iPad
					    				_player.pause();
					    				_player.bigPlayButton.el_.style.display = 'block';
					    				_player.bigPlayButton.el_.style.opacity = 1;
						    			_player.one('play', function() {
						    				playAd(_markerXml[marker.time]);
								    		delete _markerXml[marker.time];
						    			});
			    					}
			    				}
			    				else {
			    					// android
					    			_player.one('play', function() {
							    		playAd(_markerXml[marker.time]);
							    		delete _markerXml[marker.time];
					    			});
			    				}
			    			}
			    			else {
			    				if (marker.time === 0 && _player.paused()) {
									showCover(false);
									if (_player.tech_ && _player.tech_.el_ && !_player.tech_.el_.autoplay) {
										prerollNeedClickToPlay = true;
										_player.bigPlayButton.el_.style.display = 'block';
										_player.bigPlayButton.el_.style.opacity = 1;
									}
			    				}
					    		playAd(_markerXml[marker.time]);
					    		delete _markerXml[marker.time];
			    			}
			    		}
			    		else {
			    			showCover(false);
			    		}
			    	},
			    	markers: []
			    };
	      	_markersHandler = new _MarkersHandler(videojs);
			var seconds = convertStringToSeconds(_options.timeOffset, function(seconds) {
				_markerXml[seconds] = creative;
				if (seconds > 0) {
					showCover(false);
				}
				if (_markersHandler) {
					var markers = [];
					markers.push({time: seconds});
	            	if (_savedMarkers) {
	            		var temp = JSON.parse(_savedMarkers);
	            		temp = temp.concat(markers);
	            		_savedMarkers = JSON.stringify(temp);
	            	}
	            	else {
	            		_player.markers.add(markers);
	            	}
				}
			});
			if (seconds >= 0) {
				timeMarkers.markers.push({time: seconds});
				_markerXml[seconds] = creative;
				if (seconds > 0) {
					showCover(false);
				}
			}
	    	_markersHandler.init(_player);
	    	_markersHandler.markers(timeMarkers);
		}
		else {
		    // if there's already content loaded, request an add immediately
		    if (_player.currentSrc() && _player.duration() > 0) {
				playAd(creative);
		    }
		    else {
    		    _player.one('loadeddata', function() {
    				playAd(creative);
    		    });
		    }
		}
    }

    this.play = function (vjsPlayer, creative, options) {
    	_player = vjsPlayer;
    	_options = options;

    	_cover = document.getElementById('apn-break-cover');
    	if (!_cover) {
    		_cover = document.createElement('div');
    		_cover.id = 'apn-break-cover';
    		_cover.style.width = '100%';
    		_cover.style.height = '100%';
    		_cover.style.backgroundColor = 'black';
    		_cover.style.position = 'absolute';
    		_cover.style.zIndex = 101;
    		_player.el().appendChild(_cover);
    		_cover.style.display = 'none';
    	}

    	_spinnerDiv = document.getElementById('apn-vast-spinner');
    	if (!_spinnerDiv) {
			_spinnerDiv = document.createElement('div');
			_spinnerDiv.id = 'apn-vast-spinner';
			_spinnerDiv.className = 'vjs-loading-spinner';
			_spinnerDiv.style.display = 'none';
			_spinnerDiv.style.zIndex = 101;
			_player.el().appendChild(_spinnerDiv);
    	}

		showCover(true);

		if (creative) {
    		// render ad
    		play(creative);
    	}
    	else {
			// do bidding then render ad
			var prebidCommunicatorObj = new _prebidCommunicator();
			prebidCommunicatorObj.doPrebid(options, function(creative) {
				if (creative) {
					play(creative);
				}
				else {
					showCover(false);
				}
			});
    	}
    };

    this.stop = function() {
    	// stop ad if playing and remove marker from timeline
    	if (_adPlaying) {
    		_player.trigger('vast.adsCancel');
    	}
		if (_markersHandler) {
  	  		_player.markers.destroy();
		}
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function() {
		return {
			convertStringToSeconds: convertStringToSeconds,
			setDuration: function(duration) {
				_contentDuration = duration;
			},
			setOptions: function(options) {
				_options = options;
			},
			options: function() { return _options; },
			setPlayer: function(player) {
				_player = player;
			},
			showCover: showCover,
			setCover: function(cover) { _cover = cover; },
			setSpinner: function(spinner) { _spinnerDiv = spinner; },
			resetContent: resetContent,
			setAdIndicator: function(indic) { _adIndicator = indic; },
			setPlaybackMethodData: setPlaybackMethodData,
			play: play
		};
	};
	// @endexclude
};

module.exports = vastManager;
