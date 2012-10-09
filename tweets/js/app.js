map = null;
frames = [];

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

var now, elapsed;
var n = (new Date()).getTime();


function start() {

  (function animloop(){

    requestAnimFrame(animloop);

    now     = (new Date()).getTime();
    elapsed	= Math.round((now - n) / 1000);


    try {
      map.panBy([.1, 0]);
    } catch(e) { }

    if (elapsed > 10) {

      setTimeout(function() {
        console.log('sending…');
        parent.postMessage("DONE!", "*");
      }, 3000);



    }

  })();


}

function initialize() {

  map = new L.Map('map_canvas', { zoomControl: false }).setView(new L.LatLng(41.31082388091818, -92.98828125), 4);

  var mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/saleiva.map-ri1pkhit/{z}/{x}/{y}.png',
  mapbox = new L.TileLayer(mapboxUrl, {maxZoom: 17, attribution:""});
  map.addLayer(mapbox,true);

  mapbox.on("load", function() {
    console.log('start');
    start();
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
