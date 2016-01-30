var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static('public'));

var handlebars = require('express-handlebars')
         .create({defaultLayout:'main'});
app.engine('handlebars',handlebars.engine);
app.set('view engine', 'handlebars');

var fs = require('fs');
var csv2 = require('csv2');
var objectify = require('objectify-arrays');
var multer  = require('multer');
var upload = multer({dest: 'uploads/'});

var directions = require('./directions');
var credentials = require('./credentials');

// auth
var auth = require('basic-auth');
app.use(function(req, res, next) {
    var user = auth(req);

    if (user === undefined 
    	|| user['name'] !== credentials.authUser 
    	|| user['pass'] !== credentials.authPw) {
	        res.statusCode = 401;
	        res.setHeader('WWW-Authenticate', 'Basic realm="MyRealmName"');
	        res.end('Unauthorized');
    } else {
        next();
    }
});

// show form
app.get('/', function (req,res){
	res.render('form');
});

// form handler
app.post('/process', upload.single('csvfile'), function (req, res, next) {
  // req.file is the uploaded file
  // req.body holds the text fields
  
  var origin = req.body.origin;
  var destination = req.body.destination;
  var waypoints = [];
  var personInfo = [];
  // convert to array of objects
  fs.createReadStream(req.file.path)
    .pipe(csv2())
    .pipe(objectify())
    .on('data', function (data) { // read each object one at a time, as they stream in
        // build string for gmaps ---> waypoints array
        waypoints.push(data.address + ", " + data.city + ',' + data.state);
        // store the person name to use at end ---> names array
        personInfo.push({name: data.name, apt: data.apt, phone: data.phone});

      })
    .on('error', function(err){
    	console.log("GOT ERROR!");
    	console.log(err);
    })
    .on('end', function (d){
    	// Send it to API processor/parser 
    	directions(origin,destination,waypoints,personInfo)
    		.then(function(output){ 
    			// Get result back from parser and render it to the view 
    			res.render('directions',output);
    			//clean up
    			fs.unlink(req.file.path);
    		}); 

    });
  
});

// use body parser to process ajax request
app.use(require('body-parser').urlencoded({extended:true}));

// ajax post to save data from results
app.post('/save',function(req,res){
	//console.log(req.body.stops);
	var content = JSON.stringify(req.body.stops);
	var fname = Date.now();
	fs.writeFile('datastore/' + fname + ".json", content, function(err) {
	    if(err) {
	        return console.log(err);
	    }
	}); 
	res.json({'status':'ok','id':fname});
});

app.get('/route/:id',function(req,res){
	var filename = 'datastore/' + req.params.id + '.json';
	var content = fs.readFileSync(filename, 'utf8', function(err,data){
		if (err){
			console.log(err);
		}
	});
	//console.log(JSON.parse(content));
	var context = {};
	context.addresses = JSON.parse(content);
	res.render('route',context);
	
});


// 404
app.use(function (req,res,next) {
	res.status(404);
	res.render('404');
});
app.use(function (err, req, res, next) {
	console.error(err.stack);
	res.status(500);
	res.render('500');
});


app.listen(app.get('port'),function(){
	console.log('Express started on port ' +
				app.get('port') +
				". Press Ctrl-C to terminate");

});