var exp = require('express');
var fs = require('fs');
var hbs = require('hbs');
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

var tpl = fs.readFileSync(__dirname + '/views/place.stache', 'utf8');
var template = Handlebars.compile(tpl);

function getPlaces(type, cb) {
  var loaded = -1;
  var tot = 0;
  var places = {};

  function addLoaded() {
    loaded += 1;
    if (loaded >= tot) {
      cb(places);
    }
  }

  client.SMEMBERS(type, function (err, replies) {

    tot = replies.length;
    addLoaded();

    replies.forEach(function(uid) {
      if (places[uid]) addLoaded();
      client.hgetall(uid, function (err, obj) {
	if (obj.added) obj.added = (new Date(obj.added * 1)).toDateString();
        obj.photos = (obj.photos) ? obj.photos.split(',') : [];
	obj.id = uid;
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
  return out.sort(function(a, b) {
    if (!a.added) return 0;
    if (!b.added) return 1;
    return (b.added < a.added);
  });
}

var app = exp();
/*
app.set('view engine', 'stache');
app.engine('stache', require('hbs').__express);
app.set('views', __dirname + '/views');
app.use(exp.static(__dirname + '/public'));
*/


app.get('/', function(req, res){
  getPlaces('new', function (data) {
    var out = [], page = '', places = sortit(data);
    places.forEach(function(place) {
      out.push(template(place));
    });
    page = '<h1>' + out.length + ' places found</h1>';
    page += out.join('');
    res.send(page);
  });
});

app.get('/saved', function(req, res){
  getPlaces('saved', function (data) {
    var out = [], page = '', places = sortit(data);
    places.forEach(function(place) {
      out.push(template(place));
    });
    page = '<h1>' + out.length + ' places saved</h1>';
    page += out.join('');
    res.send(page);
  });
});

app.get('/remove/:id', function(req, res) {
  client.SREM('new', req.param('id'), function (err, resp) {
    res.json({ id : req.param('id'), error : err, resp : resp });
  });
});

app.get('/unsave/:id', function(req, res) {
  client.SREM('saved', req.param('id'), function (err, resp) {
    res.json({ id : req.param('id'), error : err, resp : resp });
  });
});

app.get('/save/:id', function(req, res) {
  client.SADD('saved', req.param('id'), function (err, resp) {
    res.json({ id : req.param('id'), error : err, resp : resp });
  });
});

app.listen(process.env.PORT);
console.log('Listening on port ' + process.env.PORT);

