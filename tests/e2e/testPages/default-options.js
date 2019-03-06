var defaultOptions = {
    "prebidPath" : "//acdn.adnxs.com/prebid/not-for-prod/1/prebid.js",
    "prebidPluginPath": "//acdn.adnxs.com/video/plugins/bc/prebid/bc_prebid_vast_plugin.min.js",
    "scriptLoadTimeout": 3000,
    "bidderAliases": [
        {
            "bidderName": "appnexus",
            "name": "alias1_SomeSSP"
        },
        {
            "bidderName": "appnexus",
            "name": "alias2_SomeDSP"
        }
    ],
	"biddersSpec" : {
        "code" : "my-video-tag",
        "sizes" : [640, 480],
        "mediaTypes": {
        	"video": {
                "context": "instream",
                "mimes": ["video/mp4", "application/javascript"],
                "protocols" : [1,2,3,4,5,6,7,8],
                "playbackmethod" : [1, 2],
                "api":[1,2]
            }
        },
        "bids": [
            {
                "bidder": "appnexus",
                "params": {
                    "placementId": 15185489,
                    "video": {
                        "skippable": true,
                        "playback_method": ["auto_play_sound_off"]
                    }
                }
            },
            {
                "bidder": "alias1_SomeSSP",
                "params": {
                    "placementId": 15185489,
                    "video": {
                        "skippable": true,
                        "playback_method": ["auto_play_sound_off"]
                    }
                }
            },
            {
                "bidder": "alias2_SomeDSP",
                "params": {
                    "placementId": 15185489,
                    "video": {
                        "skippable": true,
                        "playback_method": ["auto_play_sound_off"]
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
                        "  return '5.00';",
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
        },
        "appnexus": {
            "adserverTargeting": [
                {
                    "key": "hb_appnexus_key1",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value1';",
                        "}"
                    ]
                },
                {
                    "key": "hb_appnexus_key2",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value2';",
                        "}"
                    ]
                },
                {
                    "key": "hb_appnexus_key3",
                    "val": "value3"
                }
            ]
        },
        "alias1_SomeSSP": {
            "adserverTargeting": [
                {
                    "key": "hb_alias1_key1",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value1';",
                        "}"
                    ]
                },
                {
                    "key": "hb_alias1_key2",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value2';",
                        "}"
                    ]
                },
                {
                    "key": "hb_alias1_key3",
                    "val": "value3"
                }
            ]
        },
        "alias2_SomeDSP": {
            "adserverTargeting": [
                {
                    "key": "hb_alias2_key1",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value1';",
                        "}"
                    ]
                },
                {
                    "key": "hb_alias2_key2",
                    "val": [
                        "valueIsFunction",
                        "function (bidResponse) {",
                        "  return 'value2';",
                        "}"
                    ]
                },
                {
                    "key": "hb_alias2_key3",
                    "val": "value3"
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
			"iu" : "/19968336/encino_prebid_demo_adunit",
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
  	"adText": "Ad",
    "adMarkerStyle": {
		"width": "5px",
        "border-radius": "10%",
        "background-color": "white"
	}
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
