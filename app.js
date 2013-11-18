var exp = require('express');
var client = require('./redis_client');
var fs = require('fs');
var getPlaces = require('./get_places');
var hbs = require('hbs');

var app = exp();
app.set('view engine', 'stache');
app.engine('stache', hbs.__express);
app.set('views', __dirname + '/views');
app.use(exp.static(__dirname + '/public'));

var PORT = process.env.PORT || 3000;

hbs.registerPartial('place', fs.readFileSync(app.get('views') + '/place.stache', 'utf8'));

app.get('/', function(req, res){
  getPlaces('new', function (places) {
    res.render('places', {
      places: places,
      length: places.length
    });
  });
});

app.get('/saved', function(req, res){
  getPlaces('saved', function (places) {
    res.render('places', {
      places: places,
      length: places.length
    });
  });
});

app.get('/remove/:id', function(req, res) {
  client.SREM('new', req.param('id'), function (err, resp) {
    res.redirect('/');
  });
});

app.get('/unsave/:id', function(req, res) {
  client.SREM('saved', req.param('id'), function (err, resp) {
    res.redirect('/saved');
  });
});

app.get('/save/:id', function(req, res) {
  client.SADD('saved', req.param('id'), function (err, resp) {
    res.redirect('/saved');
  });
});

app.listen(PORT);
console.log('Listening on port ' + PORT);
