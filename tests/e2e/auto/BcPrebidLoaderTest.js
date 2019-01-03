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

  it('loadPrebidPlugin test - loads Brightcove Prebid Plugin', function (done) {
		BcPrebidVast.test().loadPrebidPlugin('http://acdn.adnxs.com/bal_bla.js', function() {}, function() {
			done();
		});
  });
});
