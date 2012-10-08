
var
play         = true,
conflictmaps,
removeLayers = false,
map          = null,
layers       = {},
overlay      = null,
playButton   = null,
progressLine = null;
counters     = {};

totalCivilians = 0;
totalChildren = 0;

cloudFrontURL = "http://d2c5ry9dy1ewvi.cloudfront.net";
vizzURL       = "http://vizz2.cartodb.com";

var config = {
  username: 'viz2',

  query: "SELECT event at time zone 'EDT' AS timestamp, ST_AsGeoJson(the_geom) AS position, toll, " +
    "toll_acc, cartodb_id AS id, child_deaths, child_deaths_acc " +
    "FROM syrianspring ORDER BY event ASC",

  map: {
    id: 'map',
    lat:  34.6,
    lng:  36.5,
    zoom: 7,
    baseTemplate:       'http://{S}tiles.mapbox.com/v3/cartodb.map-byl8dnag/{Z}/{X}/{Y}.png',
    intersectsTemplate: cloudFrontURL + '/tiles/syria_intersects/{Z}/{X}/{Y}.png',
    totalTemplate:      cloudFrontURL + '/tiles/syrianspring_aggregated_toll_layer/{Z}/{X}/{Y}.png',
    childTemplate:      cloudFrontURL + '/tiles/syrianspring_aggregated_childs_layer/{Z}/{X}/{Y}.png'
  },
  graph: {
    width: 164,
    height: 120
  }
};

var CartoDB = Backbone.CartoDB({ path: ""});

var ConflictMap = CartoDB.CartoDBModel.extend({

  ANIMATION_TIME: 3600*4*100000,

  getPos: function() {

    var coords = $.parseJSON(this.get('position')).coordinates;

    return new MM.Location(coords[1], coords[0]);

  },

  isActive: function(t) {

    var dt = t - this.time.getTime();

    return dt > 0 && dt < this.ANIMATION_TIME;

  },

  scaleAt: function(t) {
    var dt = t - this.time.getTime();
    var interpol_time = this.ANIMATION_TIME;
    if (dt > 0 && dt < interpol_time) {
      var tt = this.scale*dt/interpol_time;
      var r = 1 + 15*Math.log(tt+1)*0.7;
      return r;
    }
    return 0;
  },

  opacity: function(t) {
    var
    dt            = t - this.time.getTime(),
    interpol_time = this.ANIMATION_TIME*1.2;

    if (dt > 0 && dt < interpol_time) {
      var a = (1 - dt/interpol_time);
      return Math.max(0, a*a) * 0.5;
    }
    return 0;
  }

});

var ConflictMaps = CartoDB.CartoDBCollection.extend({

  initialize: function(vehicle) {
    _.bindAll(this, 'transform');
    this.bind('reset', this.transform);
  },

  // Transform the data and prepare some needs interpolations
  transform: function() {
    this.each(function(m) {
      m.time = new Date(m.get('timestamp'));
    });

    this.each(function(m) {
      m.scale = parseFloat(m.get('toll'));
    });
  },

  getDeathToll: function(t) {
    var
    toll     = [],
    inactive = [];

    this.each(function(m) {
      toll.push([new Date(m.get('timestamp')).getTime(), m.get('toll'), m.get('child_deaths')]);
    });

    return toll;
  },

  getActiveStatus: function(t) {
    var
    active   = [],
    inactive = [];

    for (var i = 0; i < this.models.length; i++) {
      var m = this.models[i];

      if (m.isActive(t)) {
        active.push({ 'id': m.id , 'data': m });
      } else {
        inactive.push({ 'id': m.id , 'data': m });
      }

    }

    return {'active':active,'inactive':inactive};
  },

  model: ConflictMap,
  sql: config.query

});


/*
* Animated overlay
*/
function Overlay(map, conflictmaps) {

  this.conflictmaps = conflictmaps;

  this.time = conflictmaps.first().time.getTime();

  // Create container for the graph
  this.div = document.createElement('div');

  this.div.style.position = 'absolute';
  this.div.style.width    =  map.dimensions.x + "px";
  this.div.style.height   = map.dimensions.y + "px";

  map.parent.appendChild(this.div);

  this.svg = d3.select(this.div).append("svg:svg")
  .attr("width",  map.dimensions.x)
  .attr("height", map.dimensions.y);

  var self = this;

  var callback = function(m, a) {
    return self.draw(m);
  };

  this.setTime = function(n){

    if ( self.conflictmaps.last().time.getTime() < self.time ){
      self.time = self.conflictmaps.first().time.getTime();
    } else{
      self.time = self.time+n;
    }

    clock.set(new Date(self.time));
    var dtt = new Date(self.time);
  }

  map.addCallback('drawn', callback);
  this.draw(map);

}

Overlay.prototype = {
  graph: function(divid){

    var
    startTime = this.conflictmaps.first().time.getTime(),
    endTime   = this.conflictmaps.last().time.getTime(),
    data      = this.conflictmaps.getDeathToll(endTime+10000),
    timeStep  = 300;

    var // margins and dimensions
    m = [0, 0, 0, 0],
    w = config.graph.width  - m[1] - m[3],
    h = config.graph.height - m[0] - m[2];

    var
    x = d3.time.scale().domain([startTime, endTime]).range([0, w]),
    y = d3.scale.linear().domain([0, d3.max(data, function(d) { return d[1]; })]).range([h, 0]);

    // create a line function that can convert data[] into x and y points
    var line1 = d3.svg.line()
    // assign the X function to plot our line as we wish
    .x(function(d) {
      // return the X coordinate where we want to plot this datapoint
      return x(d[0]);
    })
    .y(function(d) {
      // return the Y coordinate where we want to plot this datapoint
      return y(d[1]); // use the 1st index of data (for example, get 20 from [20,13])
    })

    var line2 = d3.svg.line()
    // assign the X function to plot our line as we wish
    .x(function(d) {
      // return the X coordinate where we want to plot this datapoint
      return x(d[0]);
    })
    .y(function(d) {
      // return the Y coordinate where we want to plot this datapoint
      return y(d[2]); // use the 2nd index of data (for example, get 13 from [20,13])
    })

    // Add an SVG element with the desired dimensions and margin.
    var graph = d3.select("#" + divid).append("svg:svg")
    .attr("width",  w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
    .append("svg:g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // add lines
    // do this AFTER the axes above so that the line is above the tick-lines
    graph.append("svg:path").attr("d", line1(data)).attr("class", "data1");
    graph.append("svg:path").attr("d", line2(data)).attr("class", "data2");
  },

  draw: function(map) {

    var
    self   = this,
    status = this.conflictmaps.getActiveStatus(this.time);

    var node = this.svg.selectAll("g")
    .remove(status['inactive']);

    var node = this.svg.selectAll("g")
    .data(status['active'], function(d) { return d.id; })
    .attr('transform', function(val) {

      var
      eq = val.data,
      p  = eq.getPos(self.time);

      p = map.coordinatePoint(map.locationCoordinate(p));
      return "translate(" + p.x + "," + p.y +")";

    })
    .enter()
    .append('g')
    .attr('transform', function(val) {

      var
      eq = val.data,
      p  = eq.getPos(self.time);

      p = map.coordinatePoint(map.locationCoordinate(p));

      updateCounters(val.data);

      return "translate(" + p.x + "," + p.y +")";

    });

    node.append("circle")
    .attr('style', "fill: #00f; fill-opacity: 0.5");

    this.svg.selectAll('g').selectAll('circle')
    .attr("r", function(b) {
      return b.data.scaleAt(self.time);
    })

    .attr('style', function(b) {
      var o = b.data.opacity(self.time);
      return "fill: #FF9900; fill-opacity: " + o + "; stroke-opacity: " + o;
    });

    var // calculate the offset
    firstTime = this.conflictmaps.first().time.getTime(),
    lastTime  = this.conflictmaps.last().time.getTime(),
    offset    = Math.ceil(config.graph.width * (self.time - firstTime) / (lastTime - firstTime))

    if (progressLine) progressLine.style.left = offset + "px";
  }
}

var Clock = Class.extend({
  init: function(){
  },
  setId: function(divid){
    this.divid = divid;
  },
  clear: function() {
    //$('#'+torque.clock.divid).html('');
  },
  loading: function() {
    //todo
  },
  setSecond: function(second) {
    $('#'+ this.divid + " .second").html(lpad(second, 2));
  },
  setMinute: function(minute) {
    $('#'+ this.divid + " .minute").html(lpad(minute, 2));
  },
  setHour: function(hour) {
    $('#'+ this.divid + " .hour").html(lpad(hour, 2));
  },
  setDay: function(day) {
    $('#'+ this.divid + " .day").html(lpad(day, 2));
  },
  setMonth: function(month) {
    $('#'+ this.divid + " .month").html(lpad(month + 1, 2));
  },
  setYear: function(year) {
    year = (year.length < 4 ? '0' : '') + year;
    $('#'+ this.divid + " .year").html(lpad(year,4));
  },
  set: function(date) {
    this._moveHand(date);
  },
  _moveHand: function(date) {
    //this.setSecond(date.getSeconds());
    //this.setMinute(date.getMinutes());
    //this.setHour(date.getHours());
    this.setDay(date.getDate());
    this.setMonth(date.getMonth());
    this.setYear(date.getFullYear());
  }
});

function toggleAnimation() {
  play = !play;

  if (removeLayers) {
    map.removeLayerAt(2);
    map.removeLayerAt(2);
    removeLayers = false;
  }

  $("#play").toggleClass("pause");

  if (play) loop();
}

function zoomIn() {
  map.setZoom(map.getZoom() + 1);
}

function zoomOut() {
  map.setZoom(map.getZoom() - 1);
}

function updateCounters(data) {

  var
  tollCount     = data.get("toll_acc");
  childrenCount = data.get("child_deaths_acc");

  //counters.progress.innerHTML  = data.get("toll");

  counters.children.innerHTML  = childrenCount;
  counters.civilians.innerHTML = tollCount;
  counters.total.innerHTML     = childrenCount + tollCount;

}

// Method to build the map
function initMap() {

  var
  src             = document.getElementById('src'),
  subdomains      = [ 'a.', 'b.', 'c.' ],
  location        = new MM.Location(config.map.lat, config.map.lng);

  layers.baseLayer       = new MM.TemplatedLayer(config.map.baseTemplate, subdomains),
  layers.intersectsLayer = new MM.Layer(new MM.TemplatedMapProvider(config.map.intersectsTemplate)),
  layers.totalLayer      = new MM.Layer(new MM.TemplatedMapProvider(config.map.totalTemplate)),
  layers.childLayer      = new MM.Layer(new MM.TemplatedMapProvider(config.map.childTemplate));

  // Create the map with the base layer
  map = new MM.Map(document.getElementById(config.map.id), layers.baseLayer);
  map.setCenterZoom(location, config.map.zoom);

  // Adds the intersection layer
  map.insertLayerAt(1, layers.intersectsLayer);

  conflictmaps = new ConflictMaps();

  // Fetch all data
  conflictmaps.bind('reset', onDataLoaded);
  conflictmaps.fetch();

}

// onDataLoaded callback
function onDataLoaded() {

  overlay  = new Overlay(map, conflictmaps);
  overlay.graph('graph')

  graph = document.getElementById('graph');
  graph.className = "fadeIn";

  counter = document.getElementById('counters');
  counter.className = "fadeIn";

  playButton = document.getElementById('play');
  //playButton.className = "fadeIn";

  counters.civilians = document.getElementById('counter_civilians');
  counters.children  = document.getElementById('counter_children');
  counters.total     = document.getElementById('counter_total');

  //counters.progress  = document.getElementById('progress_count');

  var spinner = document.getElementById('spinner');
  spinner.className = "fadeOut";

}

// Drawing loop
function renderLoop() {

  var of = overlay.time;

  overlay.setTime(35000000);

  if (overlay.time < of) {

    play = false;
    $("#play").removeClass("pause");

    map.insertLayerAt(2, layers.totalLayer);
    map.insertLayerAt(3, layers.childLayer);

    removeLayers = true;

    overlay.time = this.conflictmaps.first().time.getTime();

  }

  overlay.draw(map);
}

function loop() {

  (function animloop(){
    if (play) {
      requestAnimationFrame(animloop);
      renderLoop();
    }
  })();

}

function start() {

  clock = new Clock();
  clock.setId('clock');

  playButton = document.getElementById('play');
  playButton.onclick = function() { toggleAnimation(); }

  $("#play").addClass("pause");


  $("aside").on("mouseenter", function() {
    $("#play").fadeIn(150);
  });

  $("aside").on("mouseleave", function() {
    if (play) {
      $("#play").fadeOut(150);
    }
  });

  progressLine = document.getElementById('progress');
  progressLine.className = "fadeIn";

  loop();
}
start();
