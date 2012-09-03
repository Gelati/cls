var exp = require('express');
var fs = require('fs');
var Handlebars = require('handlebars');

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var redis = require('redis');
  var client = redis.createClient(rtg.port, rtg.hostname);

  client.auth(rtg.auth.split(":")[1]);
} else {
  var redis = require("redis"),
    client = redis.createClient();
}

var tpl = fs.readFileSync('./place.stache', 'utf8');
var template = Handlebars.compile(tpl);

var places = {};

function getPlaces(cb) {
  var loaded = -1;
  var tot = 0;

  function addLoaded() {
    loaded += 1;
    if (loaded >= tot) {
      cb(places);
    }
  }

  client.SMEMBERS('places', function (err, replies) {

    tot = replies.length;
    addLoaded();

    replies.forEach(function(uid) {
      if (places[uid]) addLoaded();
      client.hgetall(uid, function (err, obj) {
        obj.photos = (obj.photos) ? obj.photos.split(',') : [];
        places[uid] = obj;
        addLoaded();
      });
    });
  });
}

// returns an array
function sortit(data) {
  var out = [];
  for(var i in data) if (data.hasOwnProperty(i)) {
    out.push(data[i]);
  }
  out.sort(function(a, b) {
    if (a.added && !b.added) return true;
    if (b.added && !a.added) return false;
    return (b.added > a.added);
  });
  return out;
}

var app = exp();

app.get('/', function(req, res){
  getPlaces(function (data) {
    var out = [], page = '', places = sortit(data);
    places.forEach(function(place) {
      out.push(template(place));
    });
    page = '<h1>' + out.length + ' places found</h1>';
    page += out.join('');
    res.send(page);
  });
});

app.listen(process.env.PORT);
console.log('Listening on port ' + process.env.PORT);

