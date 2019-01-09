var PrebidCommunicator = require('./../../../src/PrebidCommunicator.js');
var bcPrebidVast = require('./../../../src/BcPrebidVast.js');

describe('PrebidCommunicator unit test', function() {
    var Mock;
	var mockObject;
	var sinonStub;
	var BcPrebidVast = new bcPrebidVast({});
	var localPBJS = BcPrebidVast.test().localPBJS;

    beforeEach(function (done) {
		console.log(this.currentTest.title);
		localPBJS.pbjs = {
			que: [],
			requestBids: function(obj) {}
		};
        Mock = function () {
            this.options = {
            		prebidPath: '//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js',
            		biddersSpec: {
            	        code: 'my-video-tag',
            	        sizes: [640, 480],
            	        mediaTypes: {
            	        	video: {
            	                context: 'instream',
            	                mimes: ['video/mp4', 'application/javascript'],
            	                // add 7 and 8 to include vast 4
            	                protocols: [1, 2, 3, 4, 5, 6, 7, 8],
            	                playbackmethod: [1, 2],
            	                api: [1, 2]
            	            }
            	        },
            	        bids: [
            	            {
            	                bidder: 'appnexus',
            	                params: {
            	                    video: {
            	                        skippable: true,
            	                        playback_method: ['auto_play_sound_off']
            	                    }
            	                }
            	            }
            	        ]
            		},
            		prebidConfigOptions: {
            			cache: {
            				url: 'https://prebid.adnxs.com/pbc/v1/cache'
            			},
            			enableSendAllBids: true
            		},
            		prebidTimeout: 700,
            		enablePrebidCache: true
            };
        };
		mockObject = new Mock();
		if (!localPBJS.bc_pbjs) {
			BcPrebidVast.test().loadPrebidScript(mockObject.options, false);
		}
		var waitPbjs = setInterval(function() {
			if (localPBJS.bc_pbjs) {
				clearInterval(waitPbjs);
				waitPbjs = null;
				sinonStub = sinon.stub(localPBJS.bc_pbjs, 'requestBids', function(obj) {
					var response = {
						'my-video-tag': {
							bids: [
								{cpm: 1,
								 currency: 'USD',
								 statusMessage: 'Bid available',
								 vastUrl: 'http://bla_bla'}
							]
						}
					};
					setTimeout(function() {
						obj.bidsBackHandler(response);
					}, 0);
				});
				done();
			}
		}, 50);
     });

    afterEach(function () {
		if (sinonStub) {
			sinonStub.restore();
			sinonStub = null;
		}
	});

	it('PrebidCommunicator doPrebid test - no DFP and no Ad Server', function (done) {
        var options = mockObject.options;
		options.biddersSpec.bids[0].params.placementId = 11653264;
		options.doPrebid = BcPrebidVast.test().doPrebid;
		var communicator = new PrebidCommunicator();
        communicator.doPrebid(options, function(url) {
			assert.equal(url, 'http://bla_bla');
        	done();
        });
    });

	it('PrebidCommunicator doPrebid test - DFP (params)', function (done) {
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
    });
});
