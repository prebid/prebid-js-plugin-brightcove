/**
 * VAST Renderer module.
 * @module vastRenderer
 */

var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->vastRenderer';

var vastRenderer = function (player) {
    var _eventCallback;
    var _options;
    var _player = player;
	var _defaultAdCancelTimeout = 3000;

    var isMobile = function isMobile() {
    	return /iP(hone|ad|od)|Android|Windows Phone/.test(navigator.userAgent);
    };

	var isMobileSafari = function isMobileSafari() {
		return /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i.test(navigator.userAgent);
	};

	// set ad playback options base on main content state
	function setPlaybackMethodData() {
		var initPlayback = 'auto';
    	if (_player.currentTime() === 0) {
            initPlayback = _player.autoplay() ? 'auto' : 'click';
            console.log('****** 4: _player.autoplay() = ' + _player.autoplay());
    	}
		var initAudio = _player.muted() ? 'off' : 'on';
		_options.initialPlayback = initPlayback;
		_options.initialAudio = initAudio;
    }

	function getMobileSafariVersion() {
		var nVer = null;
		var nPos = navigator.userAgent.indexOf('Version');
		if (nPos > 0) {
			var temp = navigator.userAgent.substring(nPos + 8);
			nPos = temp.indexOf('.');
			if (nPos > 0) {
				temp = temp.substr(0, nPos);
				nVer = parseInt(temp);
			}
		}
		return nVer;
	}

	// show/hide brightcove controls activated for next clip within playlist
	var showNextOverlay = function showNextOverlay(show) {
		var nextOverlays = document.getElementsByClassName('vjs-next-overlay');
		if (nextOverlays && nextOverlays.length > 0) {
			nextOverlays[0].style.display = show ? '' : 'none';
		}
	};

    // resend event to caller
    function resendEvent(event) {
        _eventCallback(event);
    }

    function closeEvent(event) {
        resendEvent(event);
        removeListeners();
        showNextOverlay(true);
    }

	// add listeners for renderer events
    function addListeners() {
    	_player.one('vast.adStart', resendEvent);

    	_player.on('vast.adError', closeEvent);
    	_player.on('vast.adsCancel', closeEvent);
    	_player.on('vast.adSkip', closeEvent);
    	_player.on('vast.reset', closeEvent);
    	_player.on('vast.contentEnd', closeEvent);
    	_player.on('adFinished', closeEvent);

    	_player.on('trace.message', resendEvent);
        _player.on('trace.event', resendEvent);

        _player.on('internal', resendEvent);
    }

	// remove listeners for renderer events
    function removeListeners() {
    	_player.off('vast.adStart', resendEvent);

    	_player.off('vast.adError', closeEvent);
    	_player.off('vast.adsCancel', closeEvent);
    	_player.off('vast.adSkip', closeEvent);
    	_player.off('vast.reset', closeEvent);
    	_player.off('vast.contentEnd', closeEvent);
    	_player.off('adFinished', closeEvent);

    	_player.off('trace.message', resendEvent);
    	_player.off('trace.event', resendEvent);

        _player.on('internal', resendEvent);
    }

    // play single ad
    this.playAd = function(xml, options, firstVideoPreroll, mobilePrerollNeedClick, prerollNeedClickToPlay, eventCallback) {
        _eventCallback = eventCallback;
        _options = options;

		// player event listeners
		addListeners();

        var creativeIsVast = xml.indexOf('<VAST') >= 0;

        setPlaybackMethodData();
        // pause main content and save markers
        var needPauseAndPlay = !isMobile() || !_player.paused();
        if (needPauseAndPlay) {
            _player.pause();
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
            clientParams.adTagUrl = xml;
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
        if (_options && _options.wrapperLimit && _options.wrapperLimit > 0) {
            clientParams.wrapperLimit = _options.wrapperLimit;
        }

        var renderAd = function (clientParams, canAutoplay) {
            console.log('****** 2: _options.initialPlayback = ' + _options.initialPlayback +
                ', mobilePrerollNeedClick = ' + mobilePrerollNeedClick);
            if (_options.initialPlayback !== 'click' || mobilePrerollNeedClick) {
                console.log('****** 3: canAutoplay = ' + canAutoplay +
                    ', mobilePrerollNeedClick = ' + mobilePrerollNeedClick +
                    ', prerollNeedClickToPlay = ' + prerollNeedClickToPlay);
                if (!prerollNeedClickToPlay) {
                    setTimeout(function() {
                        if (canAutoplay) {
                            // start MailOnline plugin for render the ad
                            _player.vastClient(clientParams);
                            _player.trigger({type: 'trace.message', data: {message: 'Video main content - play()'}});
                            _player.play();
                        }
                        else {
                            // hide black cover before show play button
                            _player.trigger({type: 'internal', data: {name: 'cover', cover: false}});
                            // pause main content just in case
                            _player.pause();
                            _player.trigger({type: 'trace.message', data: {message: 'Video main content - activate play button'}});
                            _player.bigPlayButton.el_.style.display = 'block';
                            _player.bigPlayButton.el_.style.opacity = 1;
                            _player.bigPlayButton.el_.style.zIndex = 99999;
                            _player.one('play', function() {
                                _player.bigPlayButton.el_.style.display = 'none';
                                _player.trigger({type: 'internal', data: {name: 'cover', cover: true}});
                                // start MailOnline plugin for render the ad
                                _player.vastClient(clientParams);
                                setTimeout(function() {
                                    // trigger play event to MailOnline plugin to force render pre-roll
                                    _player.trigger('play');
                                }, 0);
                            });
                        }
                    }, 0);
                }
                else {
                    // start MailOnline plugin for render the ad
                    _player.vastClient(clientParams);
                }
            }
            else {
                // start MailOnline plugin for render the ad
                _player.vastClient(clientParams);
            }
            showNextOverlay(false);
        };

        // preroll for first video (event playlistitem did not triggered)
        if (firstVideoPreroll) {
            if (isMobileSafari() && mobilePrerollNeedClick) {
                // the special code to force player start preroll by click for safari version 10 or less for iOS.
                var ver = getMobileSafariVersion();
                if (ver != null && ver < 11) {
                    _logger.log(_prefix, 'Do not autoplay preroll on mobile safari version 10 or less');
                    _player.trigger({type: 'trace.message', data: {message: 'Do not autoplay preroll on mobile safari version 10 or less'}});
                    // give player the time to finish initialization
                    setTimeout(function() {
                        _player.pause();
                        renderAd(clientParams, false);
                    }, 1000);
                    return;
                }
            }
            try {
                var playPromise = _player.tech().el().play();
                if (playPromise !== undefined && typeof playPromise.then === 'function') {
                    playPromise.then(function() {
                        _player.pause();
                        _logger.log(_prefix, 'Video can play with sound (allowed by browser)');
                        _player.trigger({type: 'trace.message', data: {message: 'Video can play with sound (allowed by browser)'}});
                        renderAd(clientParams, true);
                    }).catch(function() {
                        setTimeout(function() {
                            _player.pause();
                            _logger.log(_prefix, 'Video cannot play with sound (browser restriction)');
                            _player.trigger({type: 'trace.message', data: {message: 'Video cannot play with sound (browser restriction)'}});
                            renderAd(clientParams, false);
                        }, 200);
                    });
                }
                else {
                    _logger.log(_prefix, 'Video can play with sound (promise undefined)');
                    traceMessage({data: {message: 'Video can play with sound (promise undefined)'}});
                    if (_player.paused()) {
                        _player.trigger({type: 'trace.message', data: {message: 'Main video paused before preroll'}});
                        renderAd(clientParams, false);
                    }
                    else {
                        _player.trigger({type: 'trace.message', data: {message: 'Main video is auto-playing. Pause it.'}});
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
                _player.trigger({type: 'trace.message', data: {message: 'Video can play with sound (exception)'}});
                renderAd(clientParams, false);
            }
        }
        else {
            _logger.log(_prefix, 'Video can play with sound (not preroll)');
            _player.trigger({type: 'trace.message', data: {message: 'Video can play with sound (not preroll)'}});
            renderAd(clientParams, true);
        }
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function() {
		return {
			setOptions: function(options) {
				_options = options;
			},
			options: function() { return _options; },
            setPlaybackMethodData: setPlaybackMethodData,
            getMobileSafariVersion: getMobileSafariVersion
		};
	};
	// @endexclude
};

module.exports = vastRenderer;
