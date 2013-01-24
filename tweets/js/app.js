var started = false;
var map    = null;

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame    ||
  window.oRequestAnimationFrame      ||
  window.msRequestAnimationFrame     ||
  function( callback ){
    window.setTimeout(callback, 1000 / 60);
  };
})();

var lastTime = 0;
var elapsed = 0;
var d = 0;

function start() {

  setTimeout(function() {
    parent.postMessage("start", "*");
  }, 1000);

  (function animloop(){

   var timeNow = new Date().getTime();


   requestAnimFrame(animloop);
   elapsed = timeNow - lastTime;
   d += elapsed;

    try {
      if (d > 70) {
        d = 0;
        map.panBy([1, 0]);
      }
    } catch(e) {
      console.log(e);
    }

    lastTime = timeNow;

  })();


}

function initialize() {

  parent.postMessage("loaded", "*");

  map = new L.Map('map_canvas', { zoomControl: false }).setView(new L.LatLng(41.31082388091818, -99.98828125), 4);

  var mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/cartodb.map-ljbvg2xz/{z}/{x}/{y}.png',

  mapbox = new L.TileLayer(mapboxUrl, {maxZoom: 17, attribution:""});
  map.addLayer(mapbox,true);

  mapbox.on("load", function() {
    if (!started) {
      started = true;
      start();
    }
  });

  var query="SELECT * FROM election_tweet_copy";

  votes = new L.CartoDBLayer({
    map: map,
    user_name:'osm2',
    table_name: 'election_tweet_copy',
    query: query,
    auto_bound: false
  });

  map.addLayer(votes)

}

$(function() {
  initialize();
});
