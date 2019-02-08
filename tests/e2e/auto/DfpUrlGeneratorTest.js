var DfpUrlGenerator = require('../../../src/DfpUrlGenerator.js');

describe('DfpUrlGenerator unit test', function() {
	var dfpUrlGenerator = new DfpUrlGenerator();
	var testObj = dfpUrlGenerator.test();

    beforeEach(function () {
		console.log(this.currentTest.title);
    });

	it('DfpUrlGenerator formatQS test - creates query parameters string from object', function () {
        var query = {
			par1: 'a',
			par2: ['b', 'c', 'd'],
			par3: 'e'
		};
		var str = testObj.formatQS(query);
		assert.equal(str, 'par1=a&par2[]=b&par2[]=c&par2[]=d&par3=e');
    });

	it('DfpUrlGenerator deepAccess test - access of deep object path', function () {
        var query = {
			par1: 'a',
			par2: ['b', 'c', 'd'],
			par3: 'e'
		};
		var str = testObj.deepAccess(query, 'par2.1');
		assert.equal(str, 'c');
    });

	it('DfpUrlGenerator buildUrl test - build url from object', function () {
        var obj = {
			protocol: '',
			hostname: 'www.msn.com',
			port: '8888',
			pathname: '/appnexus',
			search: {
				par1: 1,
				par2: 2
			},
			hash: 'section1'
		};
		var str = testObj.buildUrl(obj);
		assert.equal(str, 'http://www.msn.com:8888/appnexus?par1=1&par2=2#section1');
    });

	it('DfpUrlGenerator parseSizesInput test - parses array of sizes', function () {
        var obj = [640, 480];
		var ret = testObj.parseSizesInput(obj);
		assert.equal(ret.length, 1);
		assert.equal(ret[0], '640x480');
    });

	it('DfpUrlGenerator parseQS test - parse query string to an object', function () {
        var qs = 'par1=a&par2[]=b&par2[]=c&par2[]=d&par3=e';
		var ret = testObj.parseQS(qs);
		assert.equal(JSON.stringify(ret), '{"par1":"a","par2":["b","c","d"],"par3":"e"}');
    });

	it('DfpUrlGenerator parse test - parse url to an object', function () {
        var url = 'http://www.msn.com:8888/appnexus?par1=1&par2=2#section1';
		var ret = testObj.parse(url, {noDecodeWholeURL: true});
		assert.equal(JSON.stringify(ret),
			'{"href":"http://www.msn.com:8888/appnexus?par1=1&par2=2#section1","protocol":"http","hostname":"www.msn.com","port":8888,"pathname":"/appnexus","search":{"par1":"1","par2":"2"},"hash":"section1","host":"www.msn.com:8888"}');
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
