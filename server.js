// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'ray'
});
connection.connect();
/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

router.get('/aggregations/:entity', aggregator);
router.get('/aggregations/:entity/:ids', aggregator);
router.get('/aggregations/:entity/:ids/:from', aggregator);
router.get('/aggregations/:entity/:ids/:from/:to', aggregator);

function aggregator(req, res) {
    if (!req.params.entity) {
    	res.json({ error: 'Entity Missing' });
    	return;
    }

    var entityMap = {
    	patients: {name: 'contacts', grouper: 'CreatedOn', iDColumn: 'FK_idSubscription'},
    	appointments: {name: 'appointments', grouper: 'CreatedOn', iDColumn: 'FK_idSubscription'}
    },
    query = 'SELECT count(*), DATE('+
    	entityMap[req.params.entity].grouper +
    	') AS created from ' +
		entityMap[req.params.entity].name;

	if (req.params.from || (req.params.ids && req.params.ids !== 'all') || req.params.from) {
		query += ' WHERE ';
	}
	if (req.params.from) {
		query += entityMap[req.params.entity].grouper + ' >= \''+ new Date(parseInt(req.params.from, 10)).toMysqlFormat() + '\'';
	}
	if (req.params.to) {
		if (req.params.from) {
			query += ' AND '
		}
		query += entityMap[req.params.entity].grouper + ' <= \''+ new Date(parseInt(req.params.to, 10)).toMysqlFormat() + '\'';
	}
	if (req.params.ids && req.params.ids !== 'all') {
		if (req.params.from || req.params.to) {
			query += ' AND '
		}
		query += entityMap[req.params.entity].iDColumn + ' in ('+req.params.from + ')';
	}
	query += ' GROUP BY created;';
	console.log(query);
	connection.query(query, function(err, rows, fields) {
	  if (err) throw err;

	  res.json({data: rows});
	});
	return;
};

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);