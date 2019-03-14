var BcPrebidVast = require('../../../src/BcPrebidLoader.js');

describe('BcPrebidVast unit test', function() {
	var sinonStub;

	before(function(done) {
		setTimeout(function() {
			done();
		}, 1500);
	});

	beforeEach(function (done) {
		console.log(this.currentTest.title);
        done();
    });

    afterEach(function () {
		if (sinonStub) {
			sinonStub.restore();
			sinonStub = null;
		}
	});

	it('getPluginPath test - returns default prebid plugin path when prebidPluginPath is NOT set in the config', function () {
		var title = this.test.title;
		var defaultPath = '//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

		var path = BcPrebidVast.test().getPluginPath({});
		assert(path == defaultPath, title + ' failed. Expected - ' + defaultPath + ', got - ' + path);
	});

	it('getPluginPath test - returns correct prebid plugin path when prebidPluginPath is set in the config', function () {
		var title = this.test.title;
		var mockConfig = {
			prebidPluginPath: 'http://www.someserver.com/somefile.js',
			someProp: 'someValue'
		};

		var path = BcPrebidVast.test().getPluginPath(mockConfig);
		assert(path == mockConfig.prebidPluginPath, title + ' failed. Expected - http://www.someserver.com/somefile.js, got - ' + path);
	});

	it('getPluginPath test - returns correct prebid plugin path when passed an array with multiple ad configs', function () {
		var title = this.test.title;
		var mockConfig = [{}, {}, {
			prebidPluginPath: 'http://www.someserver.com/somefile.js',
			someProp: 'someValue'
		}, {}];

		var path = BcPrebidVast.test().getPluginPath(mockConfig);
		assert(path == mockConfig[2].prebidPluginPath, title + ' failed. Expected - http://www.someserver.com/somefile.js, got - ' + path);
	});

	it('getPluginPath test - returns correct prebid plugin path when passed an array-like object with multiple ad configs', function () {
		var title = this.test.title;
		var mockConfig = {
			'0': {},
			'1': {},
			'2': {
				prebidPluginPath: 'http://www.someserver.com/somefile.js',
				someProp: 'someValue'
			},
			'3': {}
		};

		var path = BcPrebidVast.test().getPluginPath(mockConfig);
		assert(path == mockConfig[2].prebidPluginPath, title + ' failed. Expected - http://www.someserver.com/somefile.js, got - ' + path);
	});

	it('loadPrebidPlugin test - loads Brightcove Prebid Plugin', function (done) {
		var title = this.test.title;
		var pluginPath = 'http://acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js';

		BcPrebidVast.test().loadPrebidPlugin(pluginPath,
			function(succ) {
				assert.isTrue(succ === true, title + ' failed. Expected - success === true, got - ' + succ);
				done();
			})
	});

	it('getAdRendererFromAdOptions test - getting ad renderer name from ad options', function () {
		var title = this.test.title;

		var rendObj = BcPrebidVast.test().getAdRendererFromAdOptions({adRenderer: 'mailonline'});
		assert(rendObj.adRenderer == 'mailonline', title + ' failed for MOL renderer');
		assert.isTrue(rendObj.needBreak, title + ' failed. Need break.');

		rendObj = BcPrebidVast.test().getAdRendererFromAdOptions({dfpParameters: {}});
		assert(rendObj.adRenderer == 'ima', title + ' failed for IMA renderer');
		assert.isTrue(!rendObj.needBreak, title + ' failed. Does not need break.')

		rendObj = BcPrebidVast.test().getAdRendererFromAdOptions({});
		assert.isNull(rendObj, title + ' failed.')
	});

	it('setAdRenderer test - sets adRenderer option', function () {
		var title = this.test.title;

		var options = [
			{},
			{adRenderer: 'ima'}
		];
		BcPrebidVast.test().setAdRenderer(options);
		assert(options[0].adRenderer == 'ima', title + ' failed. Expected explicit renderer name for array');

		options = {
			'0': {},
			'1': {adRenderer: 'mailonline'}
		};
		BcPrebidVast.test().setAdRenderer(options);
		assert(options[0].adRenderer == 'mailonline', title + ' failed. Expected explicit renderer name');

		options = {
			dfpParameters: {}
		};
		BcPrebidVast.test().setAdRenderer(options);
		assert(options.adRenderer == 'ima', title + ' failed set ad renderer IMA for DFP');
	});
});
