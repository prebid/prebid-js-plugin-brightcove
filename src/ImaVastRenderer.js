/**
 * IMA VAST Renderer module.
 * @module imaVastRenderer
 */

var _logger = require('./Logging.js');
var _prefix = 'PrebidVast->imaVastRenderer';

var imaVastRenderer = function (player) {
    var _eventCallback;
    var _player = player;

    // resend event to caller
    function resendEvent (event) {
        _eventCallback(event);
    }

    function closeEvent (event) {
        resendEvent(event);
        removeListeners();
    }

    function onEvent (event) {
        var mapCloseEvents = {
            'ima3error': 'vast.adError',
            'ads-ended': 'vast.contentEnd',
            'ads-ad-skipped': 'vast.adSkip',
            'ima3-ad-error': 'vast.adError',
            'ima3-complete': 'adFinished',
            'ima3-hardtimeout': 'vast.adsCancel',
            'ima3-hard-timeout': 'vast.adsCancel',
            'ad-hard-timeout': 'vast.adsCancel'
        };
        _logger.log(_prefix, 'IMA3 plugin event: ' + event.type + '. ', event);

        var str = 'IMA3 plugin event: ' + event.type + '. ';
        switch (event.type) {
            case 'ima3error':
                str += 'Error loading the IMA3 SDK from Google.';
            break;
            case 'ads-request':
                str += 'Upon request ad data.';
            break;
            case 'ads-load':
                str += 'An ad data is available.';
            break;
            case 'ads-started':
                str += 'An ad has started playing.';
            break;
            case 'ads-ended':
                str += 'An ad has finished playing.';
            break;
            case 'ads-ad-skipped':
                str += 'An ad is skipped.';
            break;
            case 'ads-click':
                str += 'A viewer clicked on the playing ad.';
            break;
            case 'ads-volumechange':
                str += 'The volume of the playing ad has been changed. Volume: ';
                var vol = _player.ima3.adsManager.getVolume();
                str += vol;
            break;
            case 'ima3-ad-error':
                str += 'An error has occurred in the IMA3 SDK.';
                if (event.originalEvent && event.originalEvent.h) {
                    str += (' Error code: ' + event.originalEvent.h.h);
                    str += ('. Message: ' + event.originalEvent.h.l);
                }
            break;
            case 'ima3-ads-manager-loaded':
                str += 'Ads have been loaded and an AdsManager is available.';
            break;
            case 'ima3-click':
                str += 'An ad is clicked.';
            break;
            case 'ima3-complete':
                str += 'An ad completes playing.';
            break;
            case 'ima3-hardtimeout':
            case 'ima3-hard-timeout':
            case 'ad-hard-timeout':
                str += 'Reached a timeout';
            break;
            case 'ima3-loaded':
                str += 'An ad data is available.';
            break;
            case 'ima3-started':
                str += 'An ad starts playing. Url: ';
                var media = _player.ima3.currentAd.getMediaUrl();
                str += media;
            break;
            case 'ima3-volume-change':
                str += 'An ad volume has changed. Volume: ';
                vol = myPlayer.ima3.adsManager.getVolume();
                str += vol;
            break;
        }
        _player.trigger({type: 'trace.message', data: {message: str}});
        if (mapCloseEvents[event.type]) {
            closeEvent({type: mapCloseEvents[event.type], data: {}});
        }
    }

	// add listeners for renderer events
    function addListeners () {
        _player.on('ima3error', onEvent);
        _player.on('ads-request', onEvent);
        _player.on('ads-load', onEvent);
        _player.on('ads-started', onEvent);
        _player.on('ads-ended', onEvent);
        _player.on('ads-ad-skipped', onEvent);
        _player.on('ads-click', onEvent);
        _player.on('ads-volumechange', onEvent);

        _player.on('ima3-ad-error', onEvent);
        _player.on('ima3-ads-manager-loaded', onEvent);
        _player.on('ima3-click', onEvent);
        _player.on('ima3-complete', onEvent);
        _player.on('ima3-hardtimeout', onEvent);
        _player.on('ima3-hard-timeout', onEvent);
        _player.on('ad-hard-timeout', onEvent);
        _player.on('ima3-loaded', onEvent);
        _player.on('ima3-started', onEvent);
        _player.on('ima3-volume-change', onEvent);

    	_player.on('trace.message', resendEvent);
        _player.on('trace.event', resendEvent);

        _player.on('internal', resendEvent);
    }

	// remove listeners for renderer events
    function removeListeners () {
        _player.off('ima3error', onEvent);
        _player.off('ads-request', onEvent);
        _player.off('ads-load', onEvent);
        _player.off('ads-started', onEvent);
        _player.off('ads-ended', onEvent);
        _player.off('ads-ad-skipped', onEvent);
        _player.off('ads-click', onEvent);
        _player.off('ads-volumechange', onEvent);

        _player.off('ima3-ad-error', onEvent);
        _player.off('ima3-ads-manager-loaded', onEvent);
        _player.off('ima3-click', onEvent);
        _player.off('ima3-complete', onEvent);
        _player.off('ima3-hardtimeout', onEvent);
        _player.off('ima3-hard-timeout', onEvent);
        _player.off('ad-hard-timeout', onEvent);
        _player.off('ima3-loaded', onEvent);
        _player.off('ima3-started', onEvent);
        _player.off('ima3-volume-change', onEvent);

    	_player.off('trace.message', resendEvent);
    	_player.off('trace.event', resendEvent);

        _player.off('internal', resendEvent);
    }

    // play single ad
    this.playAd = function (xml, options, firstVideoPreroll, mobilePrerollNeedClick, prerollNeedClickToPlay, eventCallback) {
        // if IMA plugin is not registered in videojs immediatelly notify caller and return
        if (!_player.ima3) {
            if (eventCallback) {
                eventCallback({type: 'internal', data: {name: 'resetContent'}});
            }
            return;
        }

        // IMA plugin can play ONLY vast tag
        var creativeIsVast = xml.indexOf('<VAST') >= 0;
        if (creativeIsVast) {
            if (eventCallback) {
                eventCallback({type: 'internal', data: {name: 'resetContent'}});
            }
            return;
        }

        _eventCallback = eventCallback;
        _options = options;

		// player event listeners
		addListeners();

        _player.trigger({type: 'internal', data: {name: 'cover', cover: false}});

        // request IMA plugin to render ad
        _player.ima3.adrequest(xml);
    };

    // @exclude
    // Method exposed only for unit Testing Purpose
    // Gets stripped off in the actual build artifact
	this.test = function () {
		return {
            // to do unit tests
		};
	};
	// @endexclude
};

module.exports = imaVastRenderer;
