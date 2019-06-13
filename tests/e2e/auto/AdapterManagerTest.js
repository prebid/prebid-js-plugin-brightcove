var _adapterManager = require('../../../src/AdapterManager.js');

describe('AdapterManager unit test', function () {
    var adapterManager, testObj;

    var adapter = {
        enablePrebidPlugin: function () {
            return false;
        }
    };
    window.test = {fake: {adapter: adapter}};

    beforeEach(function (done) {
        console.log(this.currentTest.title);
        adapterManager = new _adapterManager({adapters: [
            {id: 'test.fake.adapter', url: '//video-demo.adnxs.com/fakeAdapter.js'}
        ]});
        testObj = adapterManager.test();
        testObj.setAdapter('testAdapter', window.test.fake.adapter);
        done();
    });

    it('getWindowVarValue test - get adapter value', function () {
        var title = this.test.title;
        var adapter = testObj.getWindowVarValue('test.fake.adapter');
        assert.isNotNull(adapter, title + ' failed. Expected - object');
    });

    it('init test - adapters initialization', function (done) {
        this.timeout(3000);
        var title = this.test.title;
        adapterManager.init(function () {
            assert.isTrue(true, title + ' success.');
            done();
        });
    });

    it('init test - adapters initialization without url', function (done) {
        var title = this.test.title;
        testObj.setOptions({adapters: [
            {id: 'test.fake.adapter'}
        ]});
        adapterManager.init(function () {
            assert.isTrue(true, title + ' success.');
            done();
        });
    });

    it('isPrebidPluginEnabled test - adapter should return false', function () {
        var title = this.test.title;
        adapterManager.isPrebidPluginEnabled(function (enabled) {
            assert.isFalse(enabled, title + ' failed. Expected - false.');
        });
    });
});
