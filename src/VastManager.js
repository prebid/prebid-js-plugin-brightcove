/**
 * Ad Renderer module.
 * @module vastManager
 */

 var _logger = require('./Logging.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _MarkersHandler = require('./MarkersHandler.js');
var _prefix = 'PrebidVast->vastManager';

var vastManager = function () {
	var _prebidCommunicatorObj;
	var _player;
	var _playlist = [];
	var _playlistIdx = -1;
	var _playlistCreative;
	var _nextPlaylistItemFired = false;
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

	// show/hide black div witrh spinner
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

	// show/hide brightcove controls activated for next clip within playlist
	function showNextOverlay(show) {
		var nextOverlays = document.getElementsByClassName('vjs-next-overlay');
		if (nextOverlays && nextOverlays.length > 0) {
			nextOverlays[0].style.display = show ? '' : 'none';
		}
	}

	// check frequency capping rules
	function needPlayAdForPlaylistItem(plIdx) {
		if (_options.frequencyRules && _options.frequencyRules.playlistClips && _options.frequencyRules.playlistClips > 1) {
			var mod = plIdx % _options.frequencyRules.playlistClips;
			return mod === 0;
		}
		return true;
	}

	// event handler for 'playlistitem' event
	function nextListItemHandler() {
		_nextPlaylistItemFired = true;
		_savedMarkers = null;
		showCover(true);
		_playlistIdx++;
		_contentDuration = 0;
		_player.one('loadedmetadata', function() {
			if (_markersHandler && _player.markers && _player.markers.destroy) {
				_player.markers.destroy();
			}
			_contentDuration = parseInt(_player.duration()) - 0.5;
			if (_playlistCreative) {
				if (needPlayAdForPlaylistItem(_player.playlist.currentIndex())) {
					if (_options.timeOffset != 'start') {
						showCover(false);
					}
					play(_playlistCreative);
					return;
				}
				showCover(false);
				_logger.log(_prefix, 'Ad did not play due to frequency settings');
				_player.playlist.autoadvance(0);
			}
			else {
				if (!_prebidCommunicatorObj) {
					_prebidCommunicatorObj = new _prebidCommunicator();
				}
				_prebidCommunicatorObj.doPrebid(_options, function(creative) {
					_playlistCreative = creative;
					if (creative) {
						if (needPlayAdForPlaylistItem(_player.playlist.currentIndex())) {
							if (_options.timeOffset != 'start') {
								showCover(false);
							}
							play(_playlistCreative);
						}
						else {
							showCover(false);
							_logger.log(_prefix, 'Ad did not play due to frequency settings');
							_player.playlist.autoadvance(0);
						}
					}
					else {
						showCover(false);
						_player.playlist.autoadvance(0);
					}
				});
				return;
			}
			if (_options.timeOffset != 'start') {
				showCover(false);
			}
		});
		setTimeout(function() {
			if (_contentDuration === 0) {
				showCover(false);
			}
		}, 1000);
	}

	// request prebid.js for creative for next clip in playlist
	function doPrebidForNextPlaylistItem() {
		_playlist = (_player.playlist && typeof _player.playlist === 'function') ? _player.playlist() : [];
		if (!_playlist) {
			_playlist = [];
		}
		if (_playlist.length > 1 && _player.playlist.currentIndex() < _playlist.length - 1) {
			if (!_playlistCreative) {
				if (!_prebidCommunicatorObj) {
					_prebidCommunicatorObj = new _prebidCommunicator();
				}
				_prebidCommunicatorObj.doPrebid(_options, function(creative) {
					_playlistCreative = creative;
					_player.playlist.autoadvance(!!_playlistCreative ? null : 0);
				});
			}
		}
		else {
			_player.off('playlistitem', nextListItemHandler);
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
		removeListeners();
		showNextOverlay(true);
		_nextPlaylistItemFired = false;
		if (_playlistCreative && _playlist.length > 0) {
			_player.one('ended', function() {
				// traceMessage({data: {message: '****** ended fired'}});
				setTimeout(function() {
					if (!_nextPlaylistItemFired && _playlistCreative) {
						_player.playlist.next();
					}
				}, 500);
			});
		}
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

	// set ad playback options base on main content state
	function setPlaybackMethodData() {
		var initPlayback = 'auto';
    	if (_player.currentTime() === 0) {
    		initPlayback = _player.autoplay() ? 'auto' : 'click';
    	}
		var initAudio = _player.muted() ? 'off' : 'on';
		_options.initialPlayback = initPlayback;
		_options.initialAudio = initAudio;
	}

	// add listeners for renderer events
    function addListeners() {
    	_player.one('vast.adStart', function() {
			_adIndicator.style.display = 'block';
			_adPlaying = true;
			showCover(false);
		});

    	_player.on('vast.adError', resetContent);
    	_player.on('vast.adsCancel', resetContent);
    	_player.on('vast.adSkip', resetContent);
    	_player.on('vast.reset', resetContent);
    	_player.on('vast.contentEnd', resetContent);
    	_player.on('adFinished', resetContent);

    	_player.on('trace.message', traceMessage);
    	_player.on('trace.event', traceEvent);
    }

	// remove listeners for renderer events
    function removeListeners() {
    	_player.off('vast.adError', resetContent);
    	_player.off('vast.adsCancel', resetContent);
    	_player.off('vast.adSkip', resetContent);
    	_player.off('vast.reset', resetContent);
    	_player.off('vast.contentEnd', resetContent);
    	_player.off('adFinished', resetContent);

    	_player.off('trace.message', traceMessage);
    	_player.off('trace.event', traceEvent);
    }

	// function to play ad
    function play(creative) {
		if (!creative) {
			return;
		}
		removeListeners();
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
		addListeners();

    	// function to play vast xml
    	var playAd = function(xml) {
    		if (_adPlaying) {
    			// not interrupt playing ad
    			return;
			}
			_playlistCreative = null;
        	setPlaybackMethodData();
    		// pause main content and save markers
    		var needPauseAndPlay = !isMobile() || !_player.paused();
    		if (needPauseAndPlay) {
        		_player.pause();
    		}
    		_adPlaying = true;
    		if (_markersHandler && _player.markers) {
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
			// set rendering options
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
			if (_options && _options.wrapperLimit && _options.wrapperLimit > 0) {
				clientParams.wrapperLimit = _options.wrapperLimit;
			}

			var renderAd = function (clientParams, canAutoplay) {
				// start MailOnline plugin for render the ad
				_player.vastClient(clientParams);
				if (_options.initialPlayback !== 'click' || _mobilePrerollNeedClick) {
					if (!prerollNeedClickToPlay) {
						setTimeout(function() {
							// check if ad can be autoplayed with sound
							if (canAutoplay) {
								traceMessage({data: {message: 'Video main content - play()'}});
								_player.play();
							}
							else {
								traceMessage({data: {message: 'Video main content - activate play button'}});
								_player.bigPlayButton.el_.style.display = 'block';
								_player.bigPlayButton.el_.style.opacity = 1;
								_player.bigPlayButton.el_.style.zIndex = 99999;
								_player.bigPlayButton.one('click', function() {
									showCover(true);
								});
							}
						}, 0);
					}
				}
				showNextOverlay(false);
				doPrebidForNextPlaylistItem();
			};

			var preroll = _player.currentTime() < 0.5;
			// preroll for first video (event playlistitem did not triggered)
			if (preroll && _playlistIdx === -1) {
				try {
					// check if browser allows video to autoplay with sound
					var playPromise = _player.tech().el().play();
					if (playPromise !== undefined && typeof playPromise.then === 'function') {
						playPromise.then(function() {
							_player.pause();
							_logger.log(_prefix, 'Video can play with sound (allowed by browser)');
							traceMessage({data: {message: 'Video can play with sound (allowed by browser)'}});
							renderAd(clientParams, true);
						}).catch(function() {
							setTimeout(function() {
								_player.pause();
								_logger.log(_prefix, 'Video cannot play with sound (browser restriction)');
								traceMessage({data: {message: 'Video cannot play with sound (browser restriction)'}});
								renderAd(clientParams, false);
							}, 200);
						});
					}
					else {
						// assumes a video can autoplay with sound if Promise is undefined
						_logger.log(_prefix, 'Video can play with sound (promise undefined)');
						traceMessage({data: {message: 'Video can play with sound (promise undefined)'}});
						// pause main content before playing ad
						if (_player.paused()) {
							traceMessage({data: {message: 'Main video paused before preroll'}});
							renderAd(clientParams, false);
						}
						else {
							traceMessage({data: {message: 'Main video is auto-playing. Pause it.'}});
							_player.pause();
							if (_options.initialPlayback === 'click') {
								setTimeout(function() {
									_player.one('play', function() {
										// we already did click, now we can play automatically.
										_options.initialPlayback = 'auto';
										prerollNeedClickToPlay = false;
										_player.pause();
										renderAd(clientParams, true);
									});
								}, 0);
							}
							else {
								renderAd(clientParams, true);
							}
						}
					}
				}
				catch (ex) {
					_logger.log(_prefix, 'Video can play with sound (exception)');
					traceMessage({data: {message: 'Video can play with sound (exception)'}});
					renderAd(clientParams, false);
				}
			}
			else {
				// video can always autoplay with sound if it is not preroll
				_logger.log(_prefix, 'Video can play with sound (not preroll or not 1st in playlist)');
				traceMessage({data: {message: 'Video can play with sound (not preroll or not 1st in playlist)'}});
				renderAd(clientParams, true);
			}
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
						// preroll for first video (event playlistitem did not triggered)
						if (_mobilePrerollNeedClick && _playlistIdx === -1) {
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
									showCover(true);
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
							else {
								showCover(true);
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
			var needRegMarkers = false;
			if (!_markersHandler) {
				_markersHandler = new _MarkersHandler(videojs, _options.adMarkers);
				needRegMarkers = true;
			}
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
			if (needRegMarkers) {
				_markersHandler.init(_player);
			}
			// _logger.log(_prefix, '****** Video duration = ' + _player.duration());
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

	// main entry point to start play ad
    this.play = function (vjsPlayer, creative, options) {
    	_player = vjsPlayer;
		_options = options;

    	_cover = document.getElementById('plugin-break-cover');
    	if (!_cover) {
    		_cover = document.createElement('div');
    		_cover.id = 'plugin-break-cover';
    		_cover.style.width = '100%';
    		_cover.style.height = '100%';
    		_cover.style.backgroundColor = 'black';
    		_cover.style.position = 'absolute';
    		_cover.style.zIndex = 101;
    		_player.el().appendChild(_cover);
    		_cover.style.display = 'none';
    	}

    	_spinnerDiv = document.getElementById('plugin-vast-spinner');
    	if (!_spinnerDiv) {
			_spinnerDiv = document.createElement('div');
			_spinnerDiv.id = 'plugin-vast-spinner';
			_spinnerDiv.className = 'vjs-loading-spinner';
			_spinnerDiv.style.display = 'none';
			_spinnerDiv.style.zIndex = 101;
			_player.el().appendChild(_spinnerDiv);
    	}

		showCover(true);

		if (creative) {
    		// render ad
			play(creative);
			_player.on('playlistitem', nextListItemHandler);
    	}
    	else {
			// do bidding then render ad
			_prebidCommunicatorObj = new _prebidCommunicator();
			_prebidCommunicatorObj.doPrebid(options, function(creative) {
				_playlistCreative = creative;
				if (creative) {
					play(creative);
					setTimeout(function() {
						_player.on('playlistitem', nextListItemHandler);
					}, 1000);
				}
				else {
					showCover(false);
					_player.on('playlistitem', nextListItemHandler);
				}
			});
    	}
    };

	// stop play ad
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
			setPlaylist: function(pl) { _playlist = pl; },
			needPlayAdForPlaylistItem: needPlayAdForPlaylistItem,
			setCreative: function(cr) { _playlistCreative = cr; },
			nextListItemHandler: nextListItemHandler,
			setCommunicator: function(comm) { _prebidCommunicatorObj = comm; },
			doPrebidForNextPlaylistItem: doPrebidForNextPlaylistItem,
			setAdIndicator: function(indic) { _adIndicator = indic; },
			setPlaybackMethodData: setPlaybackMethodData,
			play: play
		};
	};
	// @endexclude
};

module.exports = vastManager;
