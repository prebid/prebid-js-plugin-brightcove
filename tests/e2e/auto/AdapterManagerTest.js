var _adapterManager = require('../../../src/AdapterManager.js');

describe('AdapterManager unit test', function () {
    var adapterManager, testObj;

    var adapter = {
        start: function (player, callbacks) {
            setTimeout(function () {
                callbacks.enablePrebid(false);
            }, 100);
        }
    };
    window.adapter1 = adapter;

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        adapterManager = new _adapterManager({adapters: {fakeAdapter: '//video-demo.adnxs.com/fakeAdapter.js'}});
        testObj = adapterManager.test();
        testObj.setAdapter('adapter1');
        done();
    });

    it('init test - adapters initialization', function (done) {
        var title = this.test.title;
        adapterManager.init(function () {
            assert.isTrue(true, title + ' success.');
            done();
        });
    });

    it('run test - test enablePrebid callback', function (done) {
        var title = this.test.title;
        adapterManager.run(null, {
            enablePrebid: function (enabled) {
                assert.isFalse(enabled, title + ' failed. Expected - false');
                done();
            }
        });
    });
});
