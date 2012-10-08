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

function start() {

(function animloop(){

  requestAnimFrame(animloop);

  try {
    map.panBy([.2, 0]);
    map.invalidateSize();
    //$(".map").css("height", $(".map").css("height"));
  } catch(e) {

  }




})();


}


$(function() {

  start();
});
