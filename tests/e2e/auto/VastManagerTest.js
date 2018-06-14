var _vastManager = require('../../../src/VastManager.js');
var BcPrebidVast = require('./../../../src/BcPrebidVast.js');

describe('VastManager unit test', function () {
    var mock;
    var mockObject;

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        mock = function () {
            this.duration = 900;	// 15 minuts
        };
        mockObject = new mock();
        done();
    });

    it('convertStringToSeconds test - 00:10:10', function () {
        var vastManager = new _vastManager();

    	var testObj = vastManager.test();
    	var title = this.test.title;
    	testObj.setDuration(mockObject.duration);
    	var seconds = testObj.convertStringToSeconds('00:10:10', function(seconds) {});
 		assert(seconds === 610, title + ' failed. Expected - 610, got - ' + seconds);
    });

    it('convertStringToSeconds test - 00:10:10.600', function () {
        var vastManager = new _vastManager();

    	var testObj = vastManager.test();
    	var title = this.test.title;
    	testObj.setDuration(mockObject.duration);
    	var seconds = testObj.convertStringToSeconds('00:10:10.600', function(seconds) {});
    	assert(seconds === 611, title + ' failed. Expected - 611, got - ' + seconds);
    });

    it('convertStringToSeconds test - 20%', function () {
        var vastManager = new _vastManager();

    	var testObj = vastManager.test();
    	var title = this.test.title;
    	testObj.setDuration(mockObject.duration);
    	var seconds = testObj.convertStringToSeconds('20%', function(seconds) {});
    	assert(seconds === 180, title + ' failed. Expected - 180, got - ' + seconds);
    });

    it('convertStringToSeconds test - start', function () {
        var vastManager = new _vastManager();

    	var testObj = vastManager.test();
    	var title = this.test.title;
    	testObj.setDuration(mockObject.duration);
    	var seconds = testObj.convertStringToSeconds('start', function(seconds) {});
    	assert(seconds === 0, title + ' failed. Expected - 0, got - ' + seconds);
    });

    it('convertStringToSeconds test - end', function () {
        var vastManager = new _vastManager();

    	var testObj = vastManager.test();
    	var title = this.test.title;
    	testObj.setDuration(mockObject.duration);
    	var seconds = testObj.convertStringToSeconds('end', function(seconds) {});
    	assert(seconds === 900, title + ' failed. Expected - 900, got - ' + seconds);
    });

    describe('player related', function () {
        before(function(done) {
            setTimeout(function() {
                BcPrebidVast.init();
                BcPrebidVast.renderAd({}, 'test_player');
                done();
            }, 1500);
        });

        var player, vastManager, testObj, cover, spinner, spy, adIndicator;

        beforeEach(function (done) {
            player = BcPrebidVast.test().player;
            vastManager = new _vastManager();
            testObj = vastManager.test();
            testObj.setPlayer(player);
            if (!cover) {
                cover = document.createElement('div');
                cover.id = 'plugin-break-cover';
                cover.style.width = '100%';
                cover.style.height = '100%';
                cover.style.backgroundColor = 'black';
                cover.style.position = 'absolute';
                cover.style.zIndex = 101;
                player.el().appendChild(cover);
                cover.style.display = 'none';
            }
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'plugin-vast-spinner';
                spinner.className = 'vjs-loading-spinner';
                spinner.style.display = 'none';
                spinner.style.zIndex = 101;
                player.el().appendChild(spinner);
            }
            if (!adIndicator) {
                adIndicator = document.createElement('p');
                adIndicator.className = 'vjs-overlay';
                adIndicator.innerHTML = 'Ad';
                adIndicator.style.display = 'none';
                adIndicator.style.left = '10px';
                player.el().appendChild(adIndicator);
            }
            testObj.setCover(cover);
            testObj.setSpinner(spinner);
            testObj.setAdIndicator(adIndicator);
            done();
        });

        afterEach(function(done) {
            if (spy) {
                spy.restore();
                spy = null;
            }
            testObj = null;
            vastManager = null;
            done();
        });

        it('showCover test - show cover div', function () {
            testObj.showCover(true);
            assert.isTrue(player.el().classList.contains('vjs-waiting'));
        });

        it('showCover test - hide cover div', function () {
            testObj.showCover(false);
            assert.isFalse(player.el().classList.contains('vjs-waiting'));
        });

        it('resetContent test - resets main content after ad finished', function () {
            spy = sinon.spy(player, 'off');
            testObj.resetContent();
            assert(spy.calledTwice);
        });

        it('setPlaybackMethodData test - sets autoplay and muted options base on player status', function () {
            testObj.setOptions({});
            testObj.setPlaybackMethodData();
            var opts = testObj.options();
            assert.equal(opts.initialPlayback, 'auto');
            assert.equal(opts.initialAudio, 'on');
        });

        it('play test - prepares data to render VAST creative', function (done) {
            player.vastClient = function(params) {
                // console.log('PARAMS = ', params);
                assert.equal(params.adTagUrl, 'http://bla_bla')
                done();
            };
            testObj.setOptions({});
            testObj.play('http://bla_bla');
            player.trigger('loadeddata');
        });

        it('play test - prepares data to render VAST creative as mid-roll', function (done) {
            // this.timeout(500000);
            player.vastClient = function(params) {
                // console.log('PARAMS = ', params);
                assert.equal(params.adTagUrl, 'http://bla_bla')
                done();
            };
            testObj.setOptions({timeOffset: '00:05:00'});
            testObj.play('http://bla_bla');
            player.trigger('loadedmetadata');
            player.duration(600);
            player.currentTime(310);
            player.trigger('timeupdate');
        });
    });
});
