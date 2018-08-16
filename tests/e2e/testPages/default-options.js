var defaultOptions = {
	"prebidPath" : "//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js",
	"biddersSpec" : {
        "code" : "my-video-tag",
        "sizes" : [640, 480],
        "mediaTypes": {
        	"video": {
                "context": "instream",
                "mimes": ["video/mp4", "application/javascript"],
                // add 7 and 8 to include vast 4
                "protocols" : [1,2,3,4,5,6,7,8],
                "playbackmethod" : [1, 2],
                "api":[1,2]
            }
        },
        "bids": [
            {
                "bidder": 'appnexus',
                "params": {
                    "placementId": 12527596,
                    "video": {
                        "skippable": true,
                        "playback_method": ['auto_play_sound_off']
                    }
                }
            }
        ]
	},
	"bidderSettings": {
		"standard": {
			"adserverTargeting": [
				{
					"key": "hb_bidder",
					"val": [
						"valueIsFunction",
						"function (bidResponse) {",
						"  return bidResponse.bidderCode;",
						"}"
					]
				},
				{
					"key": "hb_adid",
					"val": [
						"valueIsFunction",
						"function (bidResponse) {",
						"  return bidResponse.adId;",
						"}"
					]
				},
				{
					"key": "hb_pb",
					"val": [
						"valueIsFunction",
						"function (bidResponse) {",
						"  return '10.00';",
						"}"
					]
				},
				{
					"key": "hb_size",
					"val": [
						"valueIsFunction",
						"function (bidResponse) {",
						"  return bidResponse.size;",
						"}"
					]
				}
			]
		}
	},
	"prebidConfigOptions" : {
		"cache": {
			"url": "https://prebid.adnxs.com/pbc/v1/cache"
		},
		"enableSendAllBids" : true
	},
	"dfpParameters_" : {
		"params" : {
			"iu" : "/19968336/prebid_cache_video_adunit",
			"iu_": "/19968336/encino_prebid_video_adunit",
			"output" : "vast"
		},
		"url" : "",
		"bid" : {}
	},
	"prebidTimeout": 700,
	"enablePrebidCache": true,
	"skippable": {
		"enabled": true,
      	"videoThreshold": 15,
      	"videoOffset": 5,
      	"skipText": "Video can be skipped in %%TIME%% seconds",
      	"skipButtonText": "SKIP"
	},
	"wrapperLimit": 5,
  	"adStartTimeout" : 3000,
  	"adServerTimeout" : 1000,
  	"timeOffset": "start",
  	"adText": "Ad"
};

function getOptions(cacheName) {
    var data = localStorage.getItem(cacheName ? cacheName : 'pluginPrebidVast1');
    var opts;
    if (data) {
    	opts = JSON.parse(data);
    }
    else {
    	opts = defaultOptions;
    }
    return opts;
}

function saveOptions(opts, cacheName) {
	localStorage.setItem(cacheName ? cacheName : 'pluginPrebidVast1', JSON.stringify(opts));	
}