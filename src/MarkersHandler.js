/**
 * This code contains portions of videojs.markers.js modified by in this project.
 *
 * Support Timeline Markers module.
 * @module markersHandler
 *
 * Copyright (c) 2013 Samping Chuang
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

var markersHandler = function (vjs, adMarkerStyle) {
	var _vjs = vjs;
	var _player = null;
	var _adMarkerStyle = adMarkerStyle;
	var _videoDuration = 0;

	// default setting
	var defaultSetting = {
		markerStyle: {
			'width': '7px',
			'border-radius': '30%',
			'background-color': 'red'
		},
		markerTip: {
			display: true,
			text: function text(marker) {
				return (marker && marker.text) ? ('Break: ' + marker.text) : '';
			},
			time: function time(marker) {
				return marker.time;
			}
		},
		breakOverlay: {
			display: false,
			displayTime: 3,
			text: function text(marker) {
				return 'Break overlay: ' + marker.overlayText;
			},
			style: {
				'width': '100%',
				'height': '20%',
				'background-color': 'rgba(0,0,0,0.7)',
				'color': 'white',
				'font-size': '17px'
		    }
		},
		onMarkerClick: function onMarkerClick() {},
		onMarkerReached: function onMarkerReached() {},
		markers: []
	};

	// create a non-colliding random number
	function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = ((d + Math.random() * 16) % 16) | 0;
			d = Math.floor(d / 16);
			return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
		});
		return uuid;
	}

	var NULL_INDEX = -1;

	var markers = function(options) {
		var player = _player;

	    /**
	     * register the markers plugin (dependent on jquery)
	     */
	    var setting = _vjs.mergeOptions(defaultSetting, options),
	        markersMap = {},
	        markersList = [],
	        // list of markers sorted by time
			currentMarkerIndex = NULL_INDEX,
	        markerTip = null,
	        breakOverlay = null,
	        overlayIndex = NULL_INDEX;

	    // If an adMarkerStyle object was defined by the publisher in their options, merge that object into setting.markerStyle
		// (Any style the publisher passed in will override the internal hard-coded defaults.)
	    if (_adMarkerStyle) {
	    	setting.markerStyle = _vjs.mergeOptions(setting.markerStyle, _adMarkerStyle);
		}

		function sortMarkersList() {
	      // sort the list by time in asc order
	      markersList.sort(function (a, b) {
	        return setting.markerTip.time(a) - setting.markerTip.time(b);
	      });
	    }

	    function addMarkers(newMarkers) {
	      newMarkers.forEach(function (marker) {
	        marker.key = generateUUID();

	        player.el().querySelector('.vjs-progress-holder').appendChild(createMarkerDiv(marker));

	        // store marker in an internal hash map
	        markersMap[marker.key] = marker;
	        markersList.push(marker);
	      });

	      sortMarkersList();
	    }

	    function getPosition(marker) {
	      return setting.markerTip.time(marker) / _videoDuration * 100;
	    }

	    function createMarkerDiv(marker) {
				// In Brightcove player v5.28.1 property 'dom' not exist
				var dom = !!_vjs.dom ? _vjs.dom : _vjs;
	      var markerDiv = dom.createEl('div', {
	        className: 'vjs-marker ' + (marker.class || '')
	      }, {
	        'data-marker-key': marker.key,
	        'data-marker-time': setting.markerTip.time(marker)
	      });

	      Object.keys(setting.markerStyle).forEach(function (key) {
	        markerDiv.style[key] = setting.markerStyle[key];
	      });
	      var pos = getPosition(marker);
	      if (pos === 100) {
	    	  pos = 99.5;
	      }
	      markerDiv.style.left = pos + '%';
	      try {
		      markerDiv.style.marginLeft = markerDiv.getBoundingClientRect().width / 2 + 'px';
	      }
	      catch (e) {}

	      // bind click event to seek to marker time
	      markerDiv.addEventListener('click', function () {
	        var preventDefault = false;
	        if (typeof setting.onMarkerClick === 'function') {
	          // if return false, prevent default behavior
	          preventDefault = setting.onMarkerClick(marker) === false;
	        }

	        if (!preventDefault) {
	          var key = this.getAttribute('data-marker-key');
	          player.currentTime(setting.markerTip.time(markersMap[key]));
	        }
	      });

	      if (setting.markerTip.display) {
	        registerMarkerTipHandler(markerDiv);
	      }

	      return markerDiv;
	    }

	    function updateMarkers() {
	      // update UI for markers whose time changed
	      markersList.forEach(function (marker) {
	        var markerDiv = player.el().querySelector(".vjs-marker[data-marker-key='" + marker.key + "']");
	        var markerTime = setting.markerTip.time(marker);

	        if (markerDiv.getAttribute('data-marker-time') !== markerTime) {
	          markerDiv.style.left = getPosition(marker) + '%';
	          markerDiv.setAttribute('data-marker-time', markerTime);
	        }
	      });
	      sortMarkersList();
	    }

	    function removeMarkers(indexArray) {
	      // reset overlay
	      if (!!breakOverlay) {
	        overlayIndex = NULL_INDEX;
	        breakOverlay.style.visibility = 'hidden';
	      }
	      currentMarkerIndex = NULL_INDEX;

	      var deleteIndexList = [];
	      indexArray.forEach(function (index) {
	        var marker = markersList[index];
	        if (marker) {
	          // delete from memory
	          delete markersMap[marker.key];
	          deleteIndexList.push(index);

	          // delete from dom
	          var el = player.el().querySelector(".vjs-marker[data-marker-key='" + marker.key + "']");
	          el.parentNode.removeChild(el);
	        }
	      });

	      // clean up markers array
	      deleteIndexList.reverse();
	      deleteIndexList.forEach(function (deleteIndex) {
	        markersList.splice(deleteIndex, 1);
	      });

	      // sort again
	      sortMarkersList();
	    }

	    // attach hover event handler
	    function registerMarkerTipHandler(markerDiv) {
	      markerDiv.addEventListener('mouseover', function () {
	        var marker = markersMap[markerDiv.getAttribute('data-marker-key')];
	        if (!!markerTip) {
	          markerTip.querySelector('.vjs-tip-inner').innerText = setting.markerTip.text(marker);
	          // margin-left needs to minus the padding length to align correctly with the marker
	          markerTip.style.left = getPosition(marker) + '%';
	          markerTip.style.marginLeft = -parseFloat(markerTip.getBoundingClientRect().width / 2) + parseFloat(markerDiv.getBoundingClientRect().width / 4) + 'px';
	          markerTip.style.visibility = 'visible';
	        }
	      });

	      markerDiv.addEventListener('mouseout', function () {
	        if (!!markerTip) {
	          markerTip.style.visibility = 'hidden';
	        }
	      });
	    }

	    function initializeMarkerTip() {
				// In Brightcove player v5.28.1 property 'dom' not exist
				var dom = !!_vjs.dom ? _vjs.dom : _vjs;
	      markerTip = dom.createEl('div', {
	        className: 'vjs-tip',
	        innerHTML: "<div class='vjs-tip-arrow'></div><div class='vjs-tip-inner'></div>"
	      });
	      player.el().querySelector('.vjs-progress-holder').appendChild(markerTip);
	    }

	    // show or hide break overlays
	    function updateBreakOverlay() {
	      if (!setting.breakOverlay.display || currentMarkerIndex < 0) {
	        return;
	      }

	      var currentTime = player.currentTime();
	      var marker = markersList[currentMarkerIndex];
	      var markerTime = setting.markerTip.time(marker);

	      if (currentTime >= markerTime && currentTime <= markerTime + setting.breakOverlay.displayTime) {
	        if (overlayIndex !== currentMarkerIndex) {
	          overlayIndex = currentMarkerIndex;
	          if (breakOverlay) {
	            breakOverlay.querySelector('.vjs-break-overlay-text').innerHTML = setting.breakOverlay.text(marker);
	          }
	        }

	        if (breakOverlay) {
	          breakOverlay.style.visibility = 'visible';
	        }
	      } else {
	        overlayIndex = NULL_INDEX;
	        if (breakOverlay) {
	          breakOverlay.style.visibility = 'hidden';
	        }
	      }
	    }

	    // problem when the next marker is within the overlay display time from the previous marker
	    function initializeOverlay() {
				// In Brightcove player v5.28.1 property 'dom' not exist
				var dom = !!_vjs.dom ? _vjs.dom : _vjs;
	      breakOverlay = dom.createEl('div', {
	        className: 'vjs-break-overlay',
	        innerHTML: "<div class='vjs-break-overlay-text'></div>"
	      });
	      Object.keys(setting.breakOverlay.style).forEach(function (key) {
	        if (breakOverlay) {
	          breakOverlay.style[key] = setting.breakOverlay.style[key];
	        }
	      });
	      player.el().appendChild(breakOverlay);
	      overlayIndex = NULL_INDEX;
	    }

	    function onTimeUpdate() {
	      onUpdateMarker();
	      updateBreakOverlay();
	      if (options.onTimeUpdateAfterMarkerUpdate) {
	    	  options.onTimeUpdateAfterMarkerUpdate();
	      }
	    }

	    function onUpdateMarker() {
	      /*
	        check marker reached in between markers
	        the logic here is that it triggers a new marker reached event only if the player
	        enters a new marker range (e.g. from marker 1 to marker 2). Thus, if player is on marker 1 and user clicked on marker 1 again, no new reached event is triggered)
	      */
	      if (!markersList.length) {
	        return;
	      }

	      var getNextMarkerTime = function getNextMarkerTime(index) {
	        if (index < markersList.length - 1) {
	          return setting.markerTip.time(markersList[index + 1]);
	        }
	        // next marker time of last marker would be end of video time
	        return _videoDuration;
	      };
	      var currentTime = player.currentTime();
	      var newMarkerIndex = NULL_INDEX;

				var nextMarkerTime;

				// post-roll support
				if (Math.abs(player.duration() - currentTime) < 0.1) {
					if (setting.markerTip.time(markersList[markersList.length - 1]) === _videoDuration) {
						if (options.onMarkerReached) {
							options.onMarkerReached(markersList[markersList.length - 1]);
						}
					}
					return;
				}

	      if (currentMarkerIndex !== NULL_INDEX) {
	        // check if staying at same marker
	        nextMarkerTime = getNextMarkerTime(currentMarkerIndex);
	        if (currentTime >= setting.markerTip.time(markersList[currentMarkerIndex]) && currentTime < nextMarkerTime) {
	          return;
	        }

	        // check for ending (at the end current time equals player duration)
	        if (currentMarkerIndex === markersList.length - 1 && currentTime === _videoDuration) {
	          return;
	        }
	      }

	      // check first marker, no marker is selected
	      if (currentTime < setting.markerTip.time(markersList[0])) {
	        newMarkerIndex = NULL_INDEX;
	      } else {
	        // look for new index
	        for (var i = 0; i < markersList.length; i++) {
	          nextMarkerTime = getNextMarkerTime(i);
	          if (currentTime >= setting.markerTip.time(markersList[i]) && currentTime < nextMarkerTime) {
	            newMarkerIndex = i;
	            break;
	          }
	        }
	      }

	      // set new marker index
	      if (newMarkerIndex !== currentMarkerIndex) {
	        // trigger event if index is not null
	        if (newMarkerIndex !== NULL_INDEX && options.onMarkerReached) {
	          options.onMarkerReached(markersList[newMarkerIndex], newMarkerIndex);
	        }
	        currentMarkerIndex = newMarkerIndex;
	      }
	    }

	    // setup the whole thing
	    function initialize() {
				_videoDuration = player.duration();
	      if (setting.markerTip.display) {
	        initializeMarkerTip();
	      }

	      // remove existing markers if already initialized
	      // player.markers.removeAll();
	      addMarkers(options.markers);

	      if (setting.breakOverlay.display) {
	        initializeOverlay();
	      }
	      onTimeUpdate();
	      player.on('timeupdate', onTimeUpdate);
	      player.off('loadedmetadata');
	    }

	    if (setting.metadataLoaded || player.duration() > 0) {
	    	setTimeout(function() {
		    	initialize();
	    	}, 0);
	    }
	    else {
		    // setup the plugin after we loaded video's meta data
		    player.on('loadedmetadata', function () {
		      initialize();
		    });
	    }

	    // exposed plugin API
	    player.markers = {
	      getMarkers: function getMarkers() {
	        return markersList;
	      },
	      next: function next() {
	        // go to the next marker from current timestamp
	        var currentTime = player.currentTime();
	        for (var i = 0; i < markersList.length; i++) {
	          var markerTime = setting.markerTip.time(markersList[i]);
	          if (markerTime > currentTime) {
	            player.currentTime(markerTime);
	            break;
	          }
	        }
	      },
	      prev: function prev() {
	        // go to previous marker
	        var currentTime = player.currentTime();
	        for (var i = markersList.length - 1; i >= 0; i--) {
	          var markerTime = setting.markerTip.time(markersList[i]);
	          // add a threshold
	          if (markerTime + 0.5 < currentTime) {
	            player.currentTime(markerTime);
	            return;
	          }
	        }
	      },
	      add: function add(newMarkers) {
	        // add new markers given an array of index
	        addMarkers(newMarkers);
	      },
	      remove: function remove(indexArray) {
	        // remove markers given an array of index
	        removeMarkers(indexArray);
	      },
	      removeAll: function removeAll() {
	        var indexArray = [];
	        for (var i = 0; i < markersList.length; i++) {
	          indexArray.push(i);
	        }
	        removeMarkers(indexArray);
	      },
	      updateTime: function updateTime() {
	        // notify the plugin to update the UI for changes in marker times
	        updateMarkers();
	      },
	      reset: function reset(newMarkers) {
	        // remove all the existing markers and add new ones
	        player.markers.removeAll();
	        addMarkers(newMarkers);
	      },
	      destroy: function destroy() {
	        // unregister the plugins and clean up even handlers
	        player.markers.removeAll();
	        if (breakOverlay) {
	        	breakOverlay.remove();
	        }
	        if (markerTip) {
	        	markerTip.remove();
	        }
	        player.off('timeupdate', onTimeUpdate);
	        delete player.markers;
	      }
	    };
	};

    this.init = function (player) {
    	_player = player;
			// Brightcove Player v5.28.1 uses 'plugin' function to register plugin
			var regFn = !!_vjs.registerPlugin ? _vjs.registerPlugin : _vjs.plugin;
    	regFn('markersHandler', markers);
    };

    this.markers = function(timeMarkers) {
    	_player.markersHandler(timeMarkers);
    };
};

module.exports = markersHandler;
