// add player to the tests
var vid = document.createElement('VIDEO');
vid.id = 'test_player';
vid['data-video-id'] = '5664543481001';
vid['data-account'] = '5530036758001';
vid['data-player'] = 'HJMTvh2YZ';
vid['data-embed'] = 'default';
vid.setAttribute('data-application-id', true);
vid.class = 'video-js';
vid.setAttribute('controls', true);
vid.setAttribute('autoplay', true);
vid.width = '600';
vid.height = '337.5';
document.body.insertBefore(vid, document.body.firstChild);

var vjs_scr = document.createElement('script');
vjs_scr.src = '//players.brightcove.net/5530036758001/HJMTvh2YZ_default/index.min.js';
vjs_scr.onload = function() {
    console.log('VIDEOJS PLAYER IS LOADED');
};
document.body.appendChild(vjs_scr);
