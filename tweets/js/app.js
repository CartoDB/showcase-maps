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

function start() {

  setTimeout(function() {
    parent.postMessage("start", "*");
  }, 1000);

  (function animloop(){

    requestAnimFrame(animloop);

    try {

      map.panBy([.1, 0]);

    } catch(e) {

    }

  })();


}

function initialize() {

  parent.postMessage("loaded", "*");

  map = new L.Map('map_canvas', { zoomControl: false }).setView(new L.LatLng(41.31082388091818, -92.98828125), 4);

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
