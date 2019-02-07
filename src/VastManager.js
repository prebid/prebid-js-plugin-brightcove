/**
 * Ad Renderer module.
 * @module vastManager
 */

var _logger = require('./Logging.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _MarkersHandler = require('./MarkersHandler.js');
var _vastRenderer = require('./VastRenderer.js');
var _prefix = 'PrebidVast->vastManager';

var vastManager = function () {
	'use strict';
	var _prebidCommunicatorObj;
	var _vastRendererObj;
	var _player;
	var _playerId;
	var _playlist = [];
	var _playlistIdx = -1;
	var _playlistCreative;
	var _nextPlaylistItemFired = false;
	var _options;
	var _adPlaying = false;
    var _savedMarkers;
    var _markersHandler;
    var _contentDuration = 0;
    var _markerXml = {};
    var _adIndicator;
	var _cover;
	var _spinnerDiv;
	var _showSpinner = false;
    var _mobilePrerollNeedClick = false;

    var isMobile = function isMobile() {
    	return /iP(hone|ad|od)|Android|Windows Phone/.test(navigator.userAgent);
    };

    var isIDevice = function isIDevice() {
    	return /iP(hone|ad)/.test(navigator.userAgent);
    };

    var isIPhone = function isIPhone() {
    	return /iP(hone|od)/.test(navigator.userAgent);
	};

	// show/hide black div witrh spinner
	var showCover = function showCover(show) {
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
	};

	// restore main content after ad is finished
	var resetContent = function resetContent() {
		showCover(false);
		setTimeout(function() {
			_adPlaying = false;
			if (_savedMarkers && _player.markers && _player.markers.reset) {
		    	_player.markers.reset(JSON.parse(_savedMarkers));
			}
		}, 1000);
		_adIndicator.style.display = 'none';
		_nextPlaylistItemFired = false;
		if (_playlistCreative && _playlist.length > 0) {
			_player.one('ended', function() {
				setTimeout(function() {
					if (!_nextPlaylistItemFired && _playlistCreative) {
						_player.playlist.next();
					}
				}, 500);
			});
		}
		doPrebidForNextPlaylistItem();
	};

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
		if (_playlist.length > 1 && _player.playlist.currentIndex && _player.playlist.currentIndex() < _playlist.length - 1) {
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

	function eventCallback(event) {
		var arrResetEvents = ['vast.adError', 'vast.adsCancel', 'vast.adSkip', 'vast.reset',
							  'vast.contentEnd', 'adFinished'];
		var isResetEvent = function(name) {
			for (var i = 0; i < arrResetEvents.length; i++) {
				if (arrResetEvents[i] === name) {
					return true;
				}
			}
			return false;
		};

		var name = event.type;
		if (name === 'vast.adStart') {
			_adIndicator.style.display = 'block';
			_adPlaying = true;
			showCover(false);
		}
		else if (name === 'trace.message') {
			traceMessage(event);
		}
		else if (name === 'trace.event') {
			traceEvent(event);
		}
		else if (isResetEvent(name)) {
			resetContent();
		}
		else if (name === 'internal') {
			var internalName = event.data.name;
			if (internalName === 'cover') {
				showCover(event.data.cover);
			}
			else if (internalName === 'resetContent') {
				resetContent();
			}
		}
	}

	// function to play ad
    function play(creative) {
		if (!creative) {
			return;
		}

    	var prerollNeedClickToPlay = false;

    	// prepare ad indicator overlay
		_adIndicator = document.createElement('p');
		_adIndicator.className = 'vjs-overlay';
		_adIndicator.innerHTML = _options.adText ? _options.adText : 'Ad';
		_adIndicator.style.display = 'none';
		_adIndicator.style.left = '10px';
		_player.el().appendChild(_adIndicator);

    	// function to play vast xml
    	var playAd = function(xml) {
    		if (_adPlaying) {
    			// not interrupt playing ad
    			return;
			}
			if (!_vastRendererObj) {
				_vastRendererObj = new _vastRenderer(_player);
			}
			_playlistCreative = null;
    		_adPlaying = true;
    		if (_markersHandler && _player.markers) {
				_savedMarkers = JSON.stringify(_player.markers.getMarkers());
			}
			var firstVideoPreroll = _player.currentTime() < 0.5 && _playlistIdx <= 0;
			_vastRendererObj.playAd(xml, _options, firstVideoPreroll, _mobilePrerollNeedClick, prerollNeedClickToPlay, eventCallback);
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
						if (_mobilePrerollNeedClick && _playlistIdx < 0) {
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
									_player.one('play', function() {
										traceMessage({data: {message: 'Main content - play event'}});
										_player.pause();
										playAd(_markerXml[marker.time]);
										delete _markerXml[marker.time];
									});
								}
							}
							else {
								// android
								if (_player.paused()) {
									_player.one('play', function() {
										showCover(true);
										playAd(_markerXml[marker.time]);
										delete _markerXml[marker.time];
									});
								}
								else {
									showCover(true);
									playAd(_markerXml[marker.time]);
									delete _markerXml[marker.time];
								}
							}
						}
						else {
							if (marker.time === 0 && _player.paused()) {
								if (_player.tech_ && _player.tech_.el_ && !_player.tech_.el_.autoplay) {
									showCover(false);
									// show play button if brightcove player is configured for not autoplay
									prerollNeedClickToPlay = true;
									_player.bigPlayButton.el_.style.display = 'block';
									_player.bigPlayButton.el_.style.opacity = 1;
								}
								else {
									showCover(true);
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
				_markersHandler = new _MarkersHandler(videojs, _options.adMarkerStyle);
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
		_playerId = _player.el_.id;
		_options = options;

    	_cover = document.getElementById('plugin-break-cover' + _playerId);
    	if (!_cover) {
    		_cover = document.createElement('div');
    		_cover.id = 'plugin-break-cover' + _playerId;
    		_cover.style.width = '100%';
    		_cover.style.height = '100%';
    		_cover.style.backgroundColor = 'black';
    		_cover.style.position = 'absolute';
    		_cover.style.zIndex = 101;
    		_player.el().appendChild(_cover);
    		_cover.style.display = 'none';
    	}

    	_spinnerDiv = document.getElementById('plugin-vast-spinner' + _playerId);
    	if (!_spinnerDiv) {
			_spinnerDiv = document.createElement('div');
			_spinnerDiv.id = 'plugin-vast-spinner' + _playerId;
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
		if (_player.playlist.currentIndex && typeof _player.playlist.currentIndex === 'function') {
			_player.on('playlistitem', nextListItemHandler);
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
			play: play
		};
	};
	// @endexclude
};

module.exports = vastManager;
