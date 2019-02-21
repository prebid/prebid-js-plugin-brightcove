var DfpUrlGenerator = require('../../../src/DfpUrlGenerator.js');

describe('DfpUrlGenerator unit test', function() {
	var dfpUrlGenerator = new DfpUrlGenerator();
	var testObj = dfpUrlGenerator.test();

    beforeEach(function () {
		console.log(this.currentTest.title);
    });

	it('DfpUrlGenerator isEmpty test - return true if the object is "empty"', function () {
        var obj = {};
		var ret = testObj.isEmpty(obj);
		assert.isTrue(ret);
		obj.a = undefined;
		ret = testObj.isEmpty(obj);
		assert.isFalse(ret);
		obj.a = 'data';
		ret = testObj.isEmpty(obj);
		assert.isFalse(ret);
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

	it('DfpUrlGenerator getCustParams test - creates query parameters from custom parameters', function () {
        var cust_params = {
			par1: 'a',
			par2: 'e'
		};
		var opts = {
			params: {
				cust_params: cust_params
			}
		};
		var ret = testObj.getCustParams({}, opts);
		assert.equal(ret, encodeURIComponent('hb_uuid=undefined&hb_cache_id=undefined&par1=a&par2=e'));
	});

	it('DfpUrlGenerator getDescriptionUrl test - gets description url for particular property', function () {
        var components = {
			par1: {
				a: 'b'
			}
		};
		var bids = {
			vastUrl: 'http://a.com/vast.xml'
		};
		var ret = testObj.getDescriptionUrl(bids, components, 'par1');
		assert.equal(ret, encodeURIComponent('http://a.com/vast.xml'));
	});

	it('DfpUrlGenerator buildUrlFromAdserverUrlComponents test - builds url from dfrParameters.url and dfrParameters.bid', function () {
        var dfpParameters = {
			bid: {},
			url: 'http://a.com/b',
			params: {
				cust_params: {
					par1: 'a',
					par2: 'b'
				}
			}
		};
		var components = {
			search: {},
			host: 'a.com'
		}
		var ret = testObj.buildUrlFromAdserverUrlComponents(components, dfpParameters.bid, dfpParameters);
		assert.equal(ret, 'http://a.com?cust_params=' + encodeURIComponent('hb_uuid=undefined&hb_cache_id=undefined&par1=a&par2=b'));
	});

	it('DfpUrlGenerator buildVideoUrl test - builds DFP url', function () {
        var dfpParameters = {
			params: {
				iu: '/1999999/encino_prebid_demo_adunit',
				output: 'vast'
			},
			url: '',
			bid: {}
		};
		var ret = dfpUrlGenerator.buildVideoUrl(dfpParameters, [640, 480]);
		assert.equal(ret.substr(0, 73), 'https://pubads.g.doubleclick.net/gampad/ads?env=vp&gdfp_req=1&output=vast');
		assert.isTrue(ret.indexOf('640x480') > 0);
	});
});
