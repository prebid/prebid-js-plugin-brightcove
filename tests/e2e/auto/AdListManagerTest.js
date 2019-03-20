var _adListManager = require('../../../src/AdListManager.js');
var BcPrebidVast = require('../../../src/BcPrebidLoader.js');

describe('AdListManager unit test', function () {
    var Mock;
    var mockObject, adListManager, testObj;

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        Mock = function () {
            this.duration = 900;	// 15 minuts
        };
        mockObject = new Mock();
        adListManager = new _adListManager();
        testObj = adListManager.test();
        done();
    });

    it('convertStringToSeconds test - 00:10:10', function () {
    	var title = this.test.title;
     	var seconds = testObj.convertStringToSeconds('00:10:10', mockObject.duration);
 		assert(seconds === 610, title + ' failed. Expected - 610, got - ' + seconds);
    });

    it('convertStringToSeconds test - 00:10:10.600', function () {
    	var title = this.test.title;
    	var seconds = testObj.convertStringToSeconds('00:10:10.600', mockObject.duration);
    	assert(seconds === 611, title + ' failed. Expected - 611, got - ' + seconds);
    });

    it('convertStringToSeconds test - 20%', function () {
    	var title = this.test.title;
    	var seconds = testObj.convertStringToSeconds('20%', mockObject.duration);
    	assert(seconds === 180, title + ' failed. Expected - 180, got - ' + seconds);
    });

    it('convertStringToSeconds test - start', function () {
    	var title = this.test.title;
    	var seconds = testObj.convertStringToSeconds('start', mockObject.duration);
    	assert(seconds === 0, title + ' failed. Expected - 0, got - ' + seconds);
    });

    it('convertStringToSeconds test - end', function () {
    	var title = this.test.title;
    	var seconds = testObj.convertStringToSeconds('end', mockObject.duration);
    	assert(seconds === 900, title + ' failed. Expected - 900, got - ' + seconds);
    });

    describe('player related', function () {
        before(function (done) {
            setTimeout(function () {
                BcPrebidVast.init();
                BcPrebidVast.renderAd({}, 'test_player');
                done();
            }, 1500);
        });

        var player, adListManager, testObj, cover, spinner, spy, adIndicator;

        beforeEach(function (done) {
            player = BcPrebidVast.test().player;
            adListManager = new _adListManager();
            testObj = adListManager.test();
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

        afterEach(function (done) {
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
            var adList = [{status: 2}];
            testObj.setArrAdList(adList);
            testObj.resetContent();
            assert.equal(adList[0].status, 2);
        });

        it('needPlayAdForPlaylistItem test - returns true when matching frequency rules', function () {
            testObj.setFrequencyRules({playlistClips: 2});
            var needPlay = testObj.needPlayAdForPlaylistItem(1);
            assert.isFalse(needPlay);
            needPlay = testObj.needPlayAdForPlaylistItem(2);
            assert.isTrue(needPlay);
        });

        it('nextListItemHandler test - plays ad for next item in playlist', function (done) {
            var orig = player.playlist;
            player.playlist = {
                currentIndex: function () { return 1; },
                autoadvance: function () {
                    player.playlist = orig;
                    done();
                }
            };
            testObj.setFrequencyRules({playlistClips: 2});
            testObj.nextListItemHandler();
            player.trigger('loadedmetadata');
        });

        it('playAd test - invokes VastRenderer', function (done) {
            var renderer = testObj.setVastRenderer(player);
            var stub1 = sinon.stub(renderer, 'playAd', function (xml, options, firstVideoPreroll, mobilePrerollNeedClick, prerollNeedClickToPlay, eventCallback) {
                stub1.restore();
                assert.equal(xml, '<VAST>...</VAST>');
                assert.isTrue(firstVideoPreroll);
                done();
            });
            testObj.options({});
            var adData = {status: 2, adTag: '<VAST>...</VAST>', options: {}, adTime: 0};
            testObj.playAd(adData);
        });

        it('getAdData test - returns object which represents ad in ad list', function (done) {
            var adList = [{status: 0, adTag: null, options: {}, adTime: 0}];
            testObj.setArrAdList(adList);
            testObj.getAdData(0, function (adData) {
                assert.isNull(adData);
                done();
            });
        });

        it('markerReached test - prepares data for playAd function and invoked playAd function', function () {
            var adList = [{status: 0, adTag: 'xml', options: {}, adTime: 0}];
            testObj.setArrAdList(adList);
            var renderer = testObj.setVastRenderer(player);
            var stub1 = sinon.stub(renderer, 'playAd', function (xml, options, firstVideoPreroll, mobilePrerollNeedClick, prerollNeedClickToPlay, eventCallback) {
                stub1.restore();
            });
            testObj.markerReached({time: 0});
            assert.equal(adList[0].status, 3);
        });

        it('checkPrepareTime test - if it is a time requests xml from prebid.js', function (done) {
            var comm = testObj.getCommunicator();
            var stub1 = sinon.stub(comm, 'doPrebid', function (options, callback) {
                stub1.restore();
                callback('fake vast xml');
            });
            var adList = [{status: 0, adTag: null, options: {}, adTime: 0}];
            testObj.setArrAdList(adList);
            testObj.setDuration(100);
            testObj.checkPrepareTime();
            setTimeout(function () {
                assert.equal(adList[0].adTag, 'fake vast xml');
                done();
            }, 500);
        });

        it('optionsHavePreroll test - checks if ad list has preroll', function () {
            testObj.setOptions([{timeOffset: 'start'}]);
            var hasPreroll = testObj.optionsHavePreroll();
            assert.isTrue(hasPreroll);
        });

        it('play test - prepares data to render array of Ads', function (done) {
            var adList = [];
            testObj.setArrAdList(adList);
            spy = sinon.spy(player, 'on');
            adListManager.play(player, [{}]);
            player.trigger('loadedmetadata');
            setTimeout(function () {
                assert.equal(spy.callCount, 1);
                done();
            }, 1000);
        });
    });
});
