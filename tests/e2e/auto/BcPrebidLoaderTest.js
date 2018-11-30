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

    it('loadPrebidPlugin test - loads MailOnline Plugin', function (done) {
		document.addEventListener('prebidPluginLoadFailed', function() {
			done();
		});
		BcPrebidVast.test().loadPrebidPlugin('http://acdn.adnxs.com/bal_bla.js');
    });

    it('init test - registers Brightcove Prebid Plugin (loader) in videojs', function (done) {
		sinonStub = sinon.stub(videojs, 'registerPlugin', function(name, fnc) {
			assert.equal(name, 'bcPrebidVastPlugin');
			assert.isTrue(typeof fnc == 'function');
			done();
		});
		BcPrebidVast.init();
    });
});
