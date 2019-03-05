/**
 * Ad List Manager module.
 * @module adListManager
 */

var _logger = require('./Logging.js');
var _prebidCommunicator = require('./PrebidCommunicator.js');
var _MarkersHandler = require('./MarkersHandler.js');
var _vastRenderer = require('./VastRenderer.js');
var _prefix = 'PrebidVast->adListManager';

var adListManager = function () {
	'use strict';
	var _prebidCommunicatorObj = new _prebidCommunicator();
	var _vastRendererObj;
	var _player;
	var _playerId;
	var _playlistIdx = -1;
	var _arrOptions;
	var _options;
	var _arrAdList = [];
	var _adMarkerStyle;
	var _frequencyRules;
	var _hasPreroll = false;
	var _isPostroll = false;
	var _adPlaying = false;
	var _adTime;
	var _firstAd = true;
	var _mainVideoEnded = false;
    var _savedMarkers;
    var _markersHandler;
    var _contentDuration = 0;
    var _adIndicator;
	var _cover;
	var _spinnerDiv;
	var _showSpinner = false;
	var _mobilePrerollNeedClick = false;
	var _prerollNeedClickToPlay = false;
	var _needForceToPlayMainContent = false;

	var _pageNotificationCallback;

	var AD_STATUS_NOT_PLAYED = 0;
	var AD_STATUS_TAG_REQUEST = 1;
	var AD_STATUS_READY_PLAY = 2;
	var AD_STATUS_PLAYING = 3;
	var AD_STATUS_DONE = 4;

	var BEFORE_AD_PREPARE_TIME = 5;		// 5 seconds

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

	// force next playlist video
	var forceNextVideoForLastAd = function forceNextVideoForLastAd() {
		// after ad played brightcove player stopped to fire 'playlistitem' events !?!?
		var isLastAd = _arrAdList[_arrAdList.length - 1].adTime === _adTime;
		if (isLastAd && _player.playlist.currentIndex && _player.playlist.currentIndex() < _player.playlist.lastIndex()) {
			// when last ad done, and main video is ended, and main video is not last video in playlist
			// force to play next video in playlist
			_player.one('ended', function() {
				startNextPlaylistVideo();
			});
		}
	};

	// restore main content after ad is finished
	var resetContent = function resetContent() {
		if (_isPostroll) {
			var state = _player.muted();
			_player.muted(true);
			showCover(true);
			_mainVideoEnded = true;
			_player.one('ended', function() {
				_player.muted(state);
				if (_player.playlist && _player.playlist.autoadvance) {
					if (_markersHandler && _player.markers && _player.markers.destroy) {
						_player.markers.destroy();
					}
					if (_player.playlist.currentIndex && _player.playlist.currentIndex() < _player.playlist.lastIndex()) {
						startNextPlaylistVideo();
					}
					else {
						showCover(false);
					}
				}
				else {
					showCover(false);
				}
			});
		}
		else {
			showCover(false);
		}
		_options = null;
		setTimeout(function() {
			_adPlaying = false;
			if (!_mainVideoEnded && _savedMarkers && _player.markers && _player.markers.reset) {
				_player.markers.reset(JSON.parse(_savedMarkers));
			}
		}, 500);
		_adIndicator.style.display = 'none';
		var adData = _arrAdList.find(function(data) {
			return data.status === AD_STATUS_PLAYING;
		});
		if (adData) {
			adData.status = AD_STATUS_DONE;
		}
		if (!_isPostroll) {
			if (_player.playlist && _player.playlist.autoadvance) {
				forceNextVideoForLastAd();
			}
			// Here is the specific code used for iPad, because very rare we could see the player send
			// 'playing' event when player paused and we expected to see play button.
			// This code compensate this unexpected player bihavior to make sure player not freez after ad
			// finished with error. We check (using Promise) if video can be played, and if not we are showing play button
			// to make sure user can continue to play main content by clicking this play button.
			// We use some delay to pass the first 'play' event (if happened), because when 'play' event happened
			// the play button will be hidden. We need keep play button visible to allow client continue to play
			// main video.
			if (_needForceToPlayMainContent) {
				traceMessage({data: {message: 'Force to play main content after preroll'}});
				try {
					_needForceToPlayMainContent = false;
					var playPromise = _player.tech().el().play();
					if (playPromise !== undefined && typeof playPromise.then === 'function') {
						playPromise.then(function() {
							_logger.log(_prefix, 'playPromise resolves to play video');
							_player.play();
						}).catch(function() {
							_logger.log(_prefix, 'playPromise rejects to play video');
							var gotPlayEvent = false;
							_player.one('play', function() {
								_logger.log(_prefix, 'got play event');
								gotPlayEvent = true;
							});
							setTimeout(function() {
								if (!gotPlayEvent || _player.paused()) {
									// show play button
									_player.bigPlayButton.el_.style.display = 'block';
									_player.bigPlayButton.el_.style.opacity = 1;
									_logger.log(_prefix, 'show BIG play button');
									_player.one('play', function() {
										_logger.log(_prefix, 'Main content - play event');
										_player.bigPlayButton.el_.style.display = 'none';
										_logger.log(_prefix, 'hide BIG play button');
									});
								}
							}, 2000);
						});
					}
					else {
						_player.play();
					}
				}
				catch (ex) {
					_player.play();
				}
			}
		}
		_isPostroll = false;
	};

	if (!Array.prototype.find) {
		// Because IE 11 does not support Array.find we add Array.find to Array prototype
		Object.defineProperty(Array.prototype, 'find', {
			value: function (predicate) {
				if (this == null) {
					throw new TypeError('this is null or not defined');
				}
				var obj = Object(this);
				var len = obj.length >>> 0;

				if (typeof predicate !== 'function') {
					throw new TypeError('predicate must be a function');
				}
				var thisArg = arguments[1];
				var index = 0;
				while (index < len) {
					var iValue = obj[index];
					if (predicate.call(thisArg, iValue, index, obj)) {
						return iValue;
					}
					index++;
				}
				return undefined;
			}
		});
	}

	// check frequency capping rules
	function needPlayAdForPlaylistItem(plIdx) {
		if (_frequencyRules && _frequencyRules.playlistClips && _frequencyRules.playlistClips > 1) {
			var mod = plIdx % _frequencyRules.playlistClips;
			return mod === 0;
		}
		return true;
	}

	// event handler for 'playlistitem' event
	function nextListItemHandler() {
		if (!_player.playlist.currentIndex || typeof _player.playlist.currentIndex !== 'function') {
			// player not support playlisting
			return;
		}
		if (_playlistIdx === _player.playlist.currentIndex()) {
			// ignore second call event handler for same playlist item
			return;
		}
		_player.off('timeupdate', checkPrepareTime);
		_savedMarkers = null;
		_prerollNeedClickToPlay = false;
		showCover(true);
		if (_player.playlist && _player.playlist.currentIndex) {
			_playlistIdx = _player.playlist.currentIndex();
		}
		_contentDuration = 0;
		_player.one('loadedmetadata', function() {
			_mainVideoEnded = false;
			if (needPlayAdForPlaylistItem(_player.playlist.currentIndex())) {
				// for first video in playlist we already handle loadedmatadata event
				if (_player.playlist.currentIndex() > 0) {
					startRenderingPreparation();
				}
				return;
			}
			if (_markersHandler && _player.markers && _player.markers.destroy) {
				_player.markers.destroy();
			}
			showCover(false);
			_logger.log(_prefix, 'Ad did not play due to frequency settings');
			_player.playlist.autoadvance(0);
		});
		setTimeout(function() {
			if (_contentDuration === 0) {
				showCover(false);
			}
		}, 1000);
	}

	// event handler for 'playlistitem' event
	function nextListItemHandlerAuto() {
		if (!_mainVideoEnded) {
			// handle 'next playlist item' event when current playlist video have been interrupted
			nextListItemHandler();
		}
	}

	// convert string represetation of time to number represents seconds
	function convertStringToSeconds(strTime, duration) {
		if (!strTime || strTime === 'start') {
			return 0;
		}
		else if (strTime === 'end') {
			// post-roll
			return duration;
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
				return -1;
			}
		}
		else if (strTime.indexOf('%') > 0) {
			// convert n% to seconds
			var percents = parseInt(strTime.substr(0, strTime.indexOf('%')));
			return parseInt(duration * percents / 100);
		}
		else {
			_logger.warn(_prefix, 'Invalid time format: ' + strTime);
			return -1;
		}
	}

	// send notification to page
	function traceMessage(event) {
		_logger.log(_prefix, 'trace event message: ' + event.data.message);
		if (_pageNotificationCallback) {
			_pageNotificationCallback('message', event.data.message);
		}
	}

	// send notification to page
	function traceEvent(event) {
		_logger.log(_prefix, 'trace event: ' + event.data.event);
		if (_pageNotificationCallback) {
			_pageNotificationCallback('event', event.data.event);
		}
	}

	// handles events from VAST renderer
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
			if (_pageNotificationCallback) {
				_pageNotificationCallback('message', 'renderer event name - ' + name);
			}
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

	// function to play vast xml
	var playAd = function(adData, forceAdToAutoplay) {
		if (_adPlaying) {
			// not interrupt playing ad
			showCover(false);
			return;
		}
		if (!_vastRendererObj) {
			_vastRendererObj = new _vastRenderer(_player);
		}
		_adPlaying = true;
		if (_markersHandler && _player.markers) {
			_savedMarkers = JSON.stringify(_player.markers.getMarkers());
			_player.markers.removeAll();
		}
		var firstVideoPreroll = _firstAd && adData.adTime === 0 && _playlistIdx <= 0;
		_options = adData.options;
		if (!_adIndicator) {
			// prepare ad indicator overlay
			_adIndicator = document.createElement('p');
			_adIndicator.className = 'vjs-overlay';
			_adIndicator.innerHTML = 'Ad';
			_adIndicator.style.display = 'none';
			_adIndicator.style.left = '10px';
			_player.el().appendChild(_adIndicator);
		}
		_adIndicator.innerHTML = _options.adText ? _options.adText : 'Ad';
		adData.status = AD_STATUS_PLAYING;
		_firstAd = false;
		_adTime = adData.adTime;
		if (forceAdToAutoplay) {
			_options.initialPlayback = 'auto';
		}
		_vastRendererObj.playAd(adData.adTag, _options, firstVideoPreroll, _mobilePrerollNeedClick, _prerollNeedClickToPlay, eventCallback);
	};

	// function to get break data for ad renderring
	function getAdData(adTime, callback) {
		var adData = _arrAdList.find(function(data) {
			return data.adTime === adTime && (data.status === AD_STATUS_NOT_PLAYED || data.status === AD_STATUS_READY_PLAY);
		});
		if (adData) {
			if (adData.adTag) {
				callback(adData);
			}
			else {
				adData.status = AD_STATUS_TAG_REQUEST;
				adData.options.clearPrebid = _arrOptions && _arrOptions.length > 1;
				_prebidCommunicatorObj.doPrebid(adData.options, function(creative) {
					adData.adTag = creative;
					if (creative) {
						adData.status = AD_STATUS_READY_PLAY;
						callback(adData);
					}
					else {
						adData.status = AD_STATUS_DONE;
						callback(null, adData.status);
					}
				});
			}
		}
		else {
			adData = _arrAdList.find(function(data) {
				return data.adTime === adTime && data.status === AD_STATUS_TAG_REQUEST;
			});
			if (adData) {
				var interval = setInterval(function() {
					if (adData.status != AD_STATUS_TAG_REQUEST) {
						clearInterval(interval);
						callback(adData.adTag ? adData : null, adData.status);
					}
				}, 50);
			}
			else {
				callback(null);
			}
		}
	}

	// callback to handle marker reached event from marker component
	var markerReached = function markerReached(marker) {
		var adTime = marker.time;
		_needForceToPlayMainContent = false;
		getAdData(adTime, function(adData, status) {
			if (adData) {
				traceMessage({data: {message: 'Play Ad at time = ' + adTime}});
				_isPostroll = adTime === _contentDuration;
				adData.status = AD_STATUS_READY_PLAY;
				_mobilePrerollNeedClick = isMobile() && adTime === 0;
				if (_mobilePrerollNeedClick && _playlistIdx < 0) {
					_player.bigPlayButton.el_.style.opacity = 1;
					if (isIDevice()) {
						// iOS
						if (isIPhone()) {
							// iPhone
							showCover(false);
							_player.one('play', function() {
								_mobilePrerollNeedClick = false;	// don't need more click for preroll on iPhone
								adData.status = AD_STATUS_PLAYING;
								// force player to autoplay after user click play button
								_player.autoplay(true);
								playAd(adData);
							});
						}
						else {
							// iPad
							var state = _player.readyState();
							traceMessage({data: {message: 'iPad -> Player ready state = ' + state}});
							if (_player.paused()) {
								traceMessage({data: {message: 'iPad -> Player paused'}});
								showCover(false);
								// show play button
								_player.bigPlayButton.el_.style.display = 'block';
								_player.bigPlayButton.el_.style.opacity = 1;
								_player.one('playing', function() {
									traceMessage({data: {message: 'Main content - playing event'}});
									// we use this flag to activate special code to protect main video from freezing
									_needForceToPlayMainContent = true;
									// hide play button
									_player.bigPlayButton.el_.style.display = 'none';
									_mobilePrerollNeedClick = false;	// don't need more click for preroll on iPad
									showCover(true);
									adData.status = AD_STATUS_PLAYING;
									// make sure ad going to autoplay
									playAd(adData, true);
								});
							}
							else {
								traceMessage({data: {message: 'iPad -> Player not paused'}});
								showCover(true);
								_mobilePrerollNeedClick = false;	// don't need click for preroll on iPad
								adData.status = AD_STATUS_PLAYING;
								playAd(adData);
							}
						}
					}
					else {
						// android
						if (_player.paused()) {
							if (_player.tech_ && _player.tech_.el_ && !_player.tech_.el_.autoplay) {
								showCover(false);
								// show play button if brightcove player is configured for not autoplay
								_prerollNeedClickToPlay = true;
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
						adData.status = AD_STATUS_PLAYING;
						playAd(adData);
					}
				}
				else {
					if (marker.time === 0 && _player.paused()) {
						if (_player.tech_ && _player.tech_.el_ && !_player.tech_.el_.autoplay) {
							showCover(false);
							// show play button if brightcove player is configured for not autoplay
							_prerollNeedClickToPlay = true;
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
					adData.status = AD_STATUS_PLAYING;
					playAd(adData);
				}
			}
			else {
				if (!_mainVideoEnded) {
					showCover(false);
				}
				if (status === AD_STATUS_DONE && _player.playlist && _player.playlist.currentIndex && _player.playlist.currentIndex() >= 0) {
					var playPromise = _player.play();
					_adTime = adTime;

					if (playPromise !== undefined) {
						// Add catch handler to prevent "Uncaught (in promise) DOM Exception" Error in console
						playPromise.catch(function (err) {});
					}
					forceNextVideoForLastAd();
				}
			}
		});
	};

	// function to check if it is a time to prepare ad tag
	function checkPrepareTime() {
		if (_adPlaying) {
			// not interrupt playing ad
			return;
		}
		var curTime = _player.currentTime();
		for (var i = 0; i < _arrAdList.length; i++) {
			var nextTime = (i < _arrAdList.length - 1) ? _arrAdList[i + 1].adTime : _contentDuration;
			if (_arrAdList[i].adTime - curTime <= BEFORE_AD_PREPARE_TIME &&	curTime < nextTime) {
				if (!_arrAdList[i].adTag && _arrAdList[i].status === AD_STATUS_NOT_PLAYED) {
					_arrAdList[i].status = AD_STATUS_TAG_REQUEST;
					_arrAdList[i].options.clearPrebid = _arrOptions && _arrOptions.length > 1;
					_prebidCommunicatorObj.doPrebid(_arrAdList[i].options, function(creative) {		// jshint ignore:line
						_arrAdList[i].status = !!creative ? AD_STATUS_READY_PLAY : AD_STATUS_DONE;
						_arrAdList[i].adTag = creative;
					});
				}
				break;
			}
		}
	}

	// checks if list of ad options has preroll option
	function optionsHavePreroll() {
		for (var i = 0; i < _arrOptions.length; i++) {
			if (_arrOptions[i].timeOffset &&
				(_arrOptions[i].timeOffset === 'start' ||
				 _arrOptions[i].timeOffset === '0%' ||
				 _arrOptions[i].timeOffset.indexOf('00:00:00') === 0
				)
			) {
				return true;
			}
		}
		return false;
	}

	// prepares ad data array, markers data, and starts ad list renderring
	function startRenderingPreparation() {
		_contentDuration = _player.duration();	// parseInt(_player.duration()) - 0.5;
		if (_hasPreroll) {
			_player.pause();
		}
		_arrAdList = [];
		var arrTimes = [];
		_arrOptions.forEach(function(options) {
			if (options.adMarkerStyle && !_adMarkerStyle) {
				_adMarkerStyle = options.adMarkerStyle;
			}
			if (options.frequencyRules && !_frequencyRules) {
				_frequencyRules = options.frequencyRules;
			}
			if (options.pageNotificationCallback && !_pageNotificationCallback) {
				_pageNotificationCallback = options.pageNotificationCallback;
			}
			var adTime = convertStringToSeconds(options.timeOffset, _contentDuration);
			if (adTime >= 0 && adTime <= _contentDuration) {
				// avoid ad time duplication
				var timeVal = arrTimes.find(function(time) {
					return time === adTime;
				});
				if (!timeVal) {
					_arrAdList.push({adTag: null, options: options, adTime: adTime, status: AD_STATUS_NOT_PLAYED});
					arrTimes.push(adTime);
				}
			}
		});

		if (_arrAdList.length === 0) {
			showCover(false);
			return;
		}

		// sort ad list by ad time
		_arrAdList.sort(function (a, b) {
	        return a.adTime - b.adTime;
		});

		// create markers
		var timeMarkers = {
			markerStyle: {
				'width': '5px',
				'border-radius': '10%',
				'background-color': 'white'
			},
			markerTip: {
				display: false
			},
			onMarkerReached: markerReached,
			markers: []
		};
		var needRegMarkers = false;
		if (!_markersHandler) {
			_markersHandler = new _MarkersHandler(videojs, _adMarkerStyle);
			needRegMarkers = true;
		}
		for (var i = 0; i < _arrAdList.length; i++) {
			var seconds = _arrAdList[i].adTime;
			if (seconds >= 0) {
				timeMarkers.markers.push({time: seconds});
			}
		}
		if (needRegMarkers) {
			_markersHandler.init(_player);
		}
		// remove old markers from previous video
		if (_player.markers) {
			_player.markers.removeAll();
		}
		_markersHandler.markers(timeMarkers);

		_player.on('timeupdate', checkPrepareTime);
		if (!_hasPreroll) {
			showCover(false);
		}
	}

	// starts next video in playlist
	function startNextPlaylistVideo() {
		_player.one('playlistitem', nextListItemHandler);
		showCover(true);
		if (_pageNotificationCallback) {
			_pageNotificationCallback('message', 'go to next video in playlist');
		}
		_player.playlist.next(0);
	}

	// main entry point to start play ad
    this.play = function (vjsPlayer, options) {
		_player = vjsPlayer;
		_playerId = _player.el_.id;
		_arrOptions = options;

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
		_hasPreroll = optionsHavePreroll();
		showCover(_hasPreroll);

		_player.on('playlistitem', nextListItemHandlerAuto);

    	if (_player.duration() > 0) {
			startRenderingPreparation();
    	}
    	else {
			_player.one('loadedmetadata', startRenderingPreparation);
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
			setDuration: function(duration) {
				_contentDuration = duration;
			},
			setOptions: function(arrOptions) {
				_arrOptions = arrOptions;
			},
			options: function(opts) {
				if (opts) {
					_options = opts;
				}
				else {
					 return _options;
				}
			},
			setPlayer: function(player) {
				_player = player;
			},
			setCover: function(cover) { _cover = cover; },
			setSpinner: function(spinner) { _spinnerDiv = spinner; },
			setCommunicator: function(comm) { _prebidCommunicatorObj = comm; },
			getCommunicator: function() { return _prebidCommunicatorObj; },
			setAdIndicator: function(indic) { _adIndicator = indic; },
			setArrAdList: function(adList) { _arrAdList = adList; },
			setFrequencyRules: function(rules) { _frequencyRules = rules; },
			setVastRenderer: function(player) {
				_vastRendererObj = !!player ? new _vastRenderer(_player) : null;
				return _vastRendererObj;
			},
			convertStringToSeconds: convertStringToSeconds,
			showCover: showCover,
			resetContent: resetContent,
			needPlayAdForPlaylistItem: needPlayAdForPlaylistItem,
			nextListItemHandler: nextListItemHandler,
			playAd: playAd,
			getAdData: getAdData,
			markerReached: markerReached,
			checkPrepareTime: checkPrepareTime,
			optionsHavePreroll: optionsHavePreroll,
			startRenderingPreparation: startRenderingPreparation
		};
	};
	// @endexclude
};

module.exports = adListManager;
