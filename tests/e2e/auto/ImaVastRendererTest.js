var _imaVastRenderer = require('../../../src/ImaVastRenderer.js');
var BcPrebidVast = require('../../../src/BcPrebidLoader.js');

describe('ImaVastRenderer unit test', function () {
    var player, imaVastRenderer, testObj;

    before(function (done) {
        setTimeout(function () {
            BcPrebidVast.init();
            player = BcPrebidVast.test().player;
            imaVastRenderer = new _imaVastRenderer(player);
            testObj = imaVastRenderer.test();
            done();
        }, 1500);
    });

    after(function (done) {
        testObj = null;
        imaVastRenderer = null;
        done();
    });

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        done();
    });

    it('ImpVastRenderer onEvent test - test ima3error event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.adError');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ima3error');
    });

    it('ImpVastRenderer onEvent test - test ads-ended event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.contentEnd');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ads-ended');
    });

    it('ImpVastRenderer onEvent test - test ads-ad-skipped event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.adSkip');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ads-ad-skipped');
    });

    it('ImpVastRenderer onEvent test - test ima3-ad-error event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.adError');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ima3-ad-error');
    });

    it('ImpVastRenderer onEvent test - test ima3-complete event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'adFinished');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ima3-complete');
    });

    it('ImpVastRenderer onEvent test - test ima3-hardtimeout event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.adsCancel');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ima3-hardtimeout');
    });

    it('ImpVastRenderer onEvent test - test ad-hard-timeout event', function (done) {
        testObj.setEventCallback(function (event) {
            if (event.type !== 'trace.message') {
                assert.equal(event.type, 'vast.adsCancel');
                done();
            }
        });
        testObj.addListeners();
        player.trigger('ad-hard-timeout');
    });

    it('ImpVastRenderer playAd test - requests render ad', function (done) {
        var playSave = player.play;
        player.ima3 = {
            adrequest: function (xml) {
                player.play = playSave;
                assert.equal(xml, 'http://bla-bla');
                done();
            }
        };
        player.play = function () {
            return new Promise(function (resolve, reject) {
                resolve();
            });
        };
        imaVastRenderer.playAd('http://bla-bla', {}, null, null, null, function () {});
        setTimeout(function () {
            delete player.ima3;
            player.play = playSave;
        }, 400);
    });

});
