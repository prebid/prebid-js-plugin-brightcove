var DfpUrlGenerator = require('../../../src/DfpUrlGenerator.js');

describe('DfpUrlGenerator unit test', function() {
	var dfpUrlGenerator = new DfpUrlGenerator();

	it('DfpUrlGenerator formatQS test - no DFP and no Ad Server', function (done) {
        var options = mockObject.options;
		options.biddersSpec.bids[0].params.placementId = 11653264;
		options.doPrebid = BcPrebidVast.test().doPrebid;
		var communicator = new PrebidCommunicator();
        communicator.doPrebid(options, function(url) {
			assert.equal(url, 'http://bla_bla');
        	done();
        });
    });

	/* it('PrebidCommunicator doPrebid test - DFP (params)', function (done) {
        var options = mockObject.options;
		options.biddersSpec.bids[0].params.placementId = 11653264;
		options.doPrebid = BcPrebidVast.test().doPrebid;
		options.dfpParameters = {
			params: {
				iu: '/19968336/prebid_cache_video_adunit',
				output: 'vast'
			}
		};
		var sinonStub2 = sinon.stub(localPBJS.bc_pbjs.adServers.dfp, 'buildVideoUrl', function(opts) {
			return 'http://bla_bla';
		});
		var communicator = new PrebidCommunicator();
        communicator.doPrebid(options, function(url) {
			sinonStub2.restore();
			assert.equal(url, 'http://bla_bla');
        	done();
        });
    });

	it('PrebidCommunicator doPrebid test - DFP (url)', function (done) {
        var options = mockObject.options;
		options.biddersSpec.bids[0].params.placementId = 11653264;
		options.doPrebid = BcPrebidVast.test().doPrebid;
		options.dfpParameters = {
			url: 'http://fake_fake'
		};
		var sinonStub2 = sinon.stub(localPBJS.bc_pbjs.adServers.dfp, 'buildVideoUrl', function(opts) {
			return 'http://bla_bla';
		});
		var communicator = new PrebidCommunicator();
        communicator.doPrebid(options, function(url) {
			sinonStub2.restore();
			assert.equal(url, 'http://bla_bla');
        	done();
        });
    });

	it('PrebidCommunicator doPrebid test - Ad Server', function (done) {
        var options = mockObject.options;
		options.biddersSpec.bids[0].params.placementId = 11653264;
		options.doPrebid = BcPrebidVast.test().doPrebid;
		options.adServerCallback = function(arrBids, callback) {
			callback('http://video.devnxs.net/meena/BurstingPipe_http.xml');
		};
		var communicator = new PrebidCommunicator();
        communicator.doPrebid(options, function(url) {
			assert.equal(url, 'http://video.devnxs.net/meena/BurstingPipe_http.xml');
        	done();
        });
    }); */
});
