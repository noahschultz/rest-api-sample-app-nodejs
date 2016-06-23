var template_engine = 'dust', 
	domain = 'localhost';

var express = require('express'), 
	routes = require('./routes'),
	http = require('http'),
	store = new express.session.MemoryStore,
	path = require('path'),
	flash = require('connect-flash'),
    fs = require('fs');

var app = express();

// Configuration
try {
    var configJSON = fs.readFileSync(__dirname + "/config.json");
    var config = JSON.parse(configJSON.toString());
} catch(e) {
    console.error("File config.json not found or is invalid: " + e.message);
    process.exit(1);
}
routes.init(config);

if ( template_engine == 'dust' ) {
	var dust = require('dustjs-linkedin'),
		cons = require('consolidate');
	app.engine('dust', cons.dust);
} 
app.configure(function() {
	app.set('template_engine', template_engine);
	app.set('domain', domain);
	app.set('port', config.port || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', template_engine);
	app.use(express.favicon());
	app.use(express.compress());
	app.use(express.logger('dev'));	
	app.use(express.bodyParser());	
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'whatever', store: store }));
	app.use(express.session());
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(flash());	
	app.use(app.router);		
});

app.configure('development', function(){
	app.use(express.errorHandler());
	app.locals.inspect = require('util').inspect;
});


app.get('/', routes.index);

app.get('/signup', routes.signup);
app.post('/signup', routes.completesignup);

app.get('/signin', routes.signin);
app.post('/login', routes.dologin);
app.get('/signout', routes.signout);

app.get('/profile', routes.auth, routes.profile);
app.post('/profile', routes.auth, routes.updateprofile);

app.get('/order', routes.auth, routes.order);
app.get('/orderList', routes.auth, routes.orderList);
app.post('/orderConfirm', routes.auth, routes.orderconfirm);
app.get('/orderExecute', routes.auth, routes.orderExecute);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
