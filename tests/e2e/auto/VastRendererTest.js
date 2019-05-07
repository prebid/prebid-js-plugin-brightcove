var _vastRenderer = require('../../../src/VastRenderer.js');
var BcPrebidVast = require('./../../../src/BcPrebidLoader.js');

describe('VastRenderer unit test', function () {
    before(function (done) {
        setTimeout(function () {
            BcPrebidVast.init();
            done();
        }, 1500);
    });

    var player, vastRenderer, testObj;

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        player = BcPrebidVast.test().player;
        vastRenderer = new _vastRenderer(player);
        testObj = vastRenderer.test();
        done();
    });

    afterEach(function (done) {
        testObj = null;
        vastRenderer = null;
        done();
    });

    it('setPlaybackMethodData test - sets autoplay and muted options base on player status', function () {
        testObj.setOptions({});
        testObj.setPlaybackMethodData();
        var opts = testObj.options();
        assert.equal(opts.initialPlayback, 'auto');
        assert.equal(opts.initialAudio, 'on');
    });

    it('getMobileSafariVersion test - get browser version', function () {
        var ver = testObj.getMobileSafariVersion();
        assert.isNull(ver);
    });

    it('playAd test - play fake ad xml (preroll, need click)', function (done) {
        player.vastClient = function (params) {
            assert.equal(params.adTagUrl, 'http://bla_bla');
            done();
        };
        vastRenderer.playAd('http://bla_bla', {}, true, true, true, function () {});
        player.trigger('loadeddata');
    });

    it('playAd test - play fake ad xml (preroll, autoplay)', function (done) {
        player.vastClient = function (params) {
            assert.equal(params.adTagUrl, 'http://bla_bla');
            done();
        };
        vastRenderer.playAd('http://bla_bla', {}, true, false, false, function () {});
        player.trigger('loadeddata');
        setTimeout(function () {
            player.trigger('play');
        }, 300);
    });
});
