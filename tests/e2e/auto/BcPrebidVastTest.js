var bcPrebidVast = require('./../../../src/BcPrebidVast.js');

describe('BcPrebidVast unit test', function() {
    var Mock;
	var mockObject;
	var sinonStub;
	var BcPrebidVast = new bcPrebidVast({});

	before(function(done) {
		setTimeout(function() {
			done();
		}, 1500);
	});

	beforeEach(function (done) {
		console.log(this.currentTest.title);
		window.pbjs = {
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
            	                    // "placementId": 8845778,
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
        done();
    });

    afterEach(function () {
		if (sinonStub) {
			sinonStub.restore();
			sinonStub = null;
		}
	});

	it('doPrebid test - success bidding for 1 bidder', function (done) {
		this.timeout(5000);
		BcPrebidVast.test().loadPrebidScript(mockObject.options, false);
		setTimeout(function() {
			var localPBJS = BcPrebidVast.test().localPBJS;
			var options = mockObject.options;
			options.biddersSpec.bids[0].params.placementId = 11653264;
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
			BcPrebidVast.test().doPrebid(options, function(bids) {
				   var arrBids = (bids && bids[options.biddersSpec.code]) ? bids[options.biddersSpec.code].bids : [];
				assert.strictEqual(arrBids.length, 1, 'failed - expected 1 bid');
				assert.strictEqual(arrBids[0].vastUrl && arrBids[0].vastUrl.length > 0, true, 'failed - empty vastUrl property');
				done();
			});
		}, 2000);
    });

	it('specifyBidderAliases test - specify alias for appnexus bidder', function (done) {
		var pbjs = {
			aliasBidder: function(bidder, alias) {
				assert.equal(bidder, 'appnexus', 'expected appnexus bidder');
				assert.equal(alias, 'appnexus2', 'expected appnexus2 alias');
				done();
			}
		};
		var bidderAlias = [
			{
				bidderName: 'appnexus',
				name: 'appnexus2'
			}
		];
		BcPrebidVast.test().specifyBidderAliases(bidderAlias, pbjs);
	});

	it('prepareBidderSettins test - converts bidder settings values from string arrays to functions', function () {
		mockObject.options.bidderSettings = {
			standard: {
				adserverTargeting: [
					{
						key: 'hb_pb',
						val: [
							'valueIsFunction',
							'function (bidResponse) {',
							'  return "10.00";',
							'}'
						]
					}
				]
			}
		};
		BcPrebidVast.test().prepareBidderSettings(mockObject.options);
		var value = mockObject.options.bidderSettings.standard.adserverTargeting[0].val();
		assert.equal(value, '10.00', 'failed - expected 10.00, got ' + value);
	});

	it('loadMolPlugin test - loads MailOnline Plugin on a page (in an iFrame)', function (done) {
		BcPrebidVast.test().loadMolPlugin(function(succ) {
			assert.isTrue(succ);
			done();
		});
	});

	it('insertHiddenIframe test - creates an empty iframe and attaches it to the DOM', function () {
		var frame = BcPrebidVast.test().insertHiddenIframe('testFrame');

		assert.ok(frame, 'failed - expected frame to be truthy, got ' + frame);
		assert.ok(frame.parentNode, 'failed - expected frame.parentNode to be truthy, got ' + frame.parentNode);
		assert.equal(frame.id, 'testFrame', 'failed - expected iFrame.id to be \'testFrame\', got ' + frame.id);
	});

    it('loadMolPlugin test - loads MailOnline Plugin on a page (in an iFrame)', function (done) {
		BcPrebidVast.test().loadMolPlugin(function(succ) {
			assert.isTrue(succ);
			done();
		});
	});

	it('getAdRendererFromAdOptions test - getting ad renderer name from ad options', function () {
		var title = this.test.title;

		var rendObj = BcPrebidVast.test().getAdRendererFromAdOptions({adRenderer: 'mailonline'});
		assert(rendObj.adRenderer == 'mailonline', title + ' failed for MOL renderer');
		assert.isTrue(rendObj.userSet, title + ' failed. Need break.');

		rendObj = BcPrebidVast.test().getAdRendererFromAdOptions({dfpParameters: {}});
		assert(rendObj.adRenderer == 'ima', title + ' failed for IMA renderer');
		assert.isTrue(!rendObj.userSet, title + ' failed. Does not need break.')

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
