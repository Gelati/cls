var exp = require('express');
var fs = require('fs');
var hbs = require('hbs');

var client = require('./redis_client');
var getPlaces = require('./get_places');

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


// setters for add and remove functionality

app.get('/remove/:id', function(req, res) {
  client.SREM('new', req.param('id'), function (err, resp) {
    res.redirect('back');
  });
});

app.get('/unsave/:id', function(req, res) {
  client.SREM('saved', req.param('id'), function (err, resp) {
    res.redirect('back');
  });
});

app.get('/save/:id', function(req, res) {
  client.SADD('saved', req.param('id'), function (err, resp) {
    res.redirect('back');
  });
});

app.listen(PORT);
console.log('Listening on port ' + PORT);
