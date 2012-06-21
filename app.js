/*
* Simple Login System
*/
var express = require('express'),
    routes = require('./routes'),
    stylus = require('stylus')
  ;
var app = module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  // para leer los datos que el usuario envia con bodyParser
  app.use(express.bodyParser());
  // cookieParser por que session lo necesita
  app.use(express.cookieParser('Estaesunaprueba'));
  // y el de la magia :)
  // En producción lo mejor es usar un session manager con un db
  app.use(express.session({secret:'estaespruebaynecesariia'}));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Para poder llamar el nombre del usuario en cualquier vista mientras este logeado :)
app.dynamicHelpers({
    currentUser:  function(req){
        if (req.session && req.session.user){
          return req.session.user;
        } else {
            return {}}
    }
 });

// Los usuarios a probar
var users = {
  "alejandromg":"esteesmipassword",
  "edder":"edder1"
}

// checkAuth contiene tres parametros, req,res,next
// next simplemente continua el proceso, pero igualmente se puede
// cancelar en cualquier momento, simplemente con "no ejecutandolo"
// o res.end()
var checkAuth = function(req,res,next){
  if (req.session.user){
    var user = req.session.user.username
      , pass = req.session.user.password;
    // Esto no es necesario, ya que se esta doblemente comprobando que 
    // los datos del usuario son los correctos
    if (users[user] && users[user] === pass ){
      // si son correctos, continuar con la request
      next();
    } else {
      // si no, los datos no son correctos, hijacking?
      res.end('No estas logueado');
    }
  } else {
    // No existe un usuario logueado
    res.end('~ . ~ ::  No estas logueado?');
    //res.end('<a href="/login"> Acceso</a>');
  }
}

//Pagina index para el usario muestrar la seleccion de los diarios

app.get('/',function(req,res){
    res.render('user',{
      layout: 'inicio.jade',
      title: 'Inicio'
    });
});


// Go Index Administrador
/*app.get('/index',function(req,res){
  if (req.session){
    res.render('index',{
      layout: 'inicio.jade',
      title: 'Inicio'
    })
     // nuff said 
   // res.end('<a href="/login"> Acceso</a>');
  } else {
    res.end('notok');
  }
});*/

// Go Login
app.get('/login', function(req,res){
  // Mostrar el formulario para loguearse
    res.render('login',{
    title: 'Login',
    layout: 'inicio.jade'
  });
});

// Go Diario
app.get('/diario', function(req,res){
  res.render('diario',{
  title: 'Diario',
  layout:'inicio.jade'  
  });
});


// Funcion login
app.post('/login', function(req,res){
  // Cuando el formulario es enviado viene en req.body
  var user = req.body.user,
      pass = req.body.pass;
  // checkear si los datos son correctos
  if (users[user] && users[user] === pass ){
    // Popular req.session.user con los datos del usuario actual
    req.session.user = {
      username : user,
      password : pass
    } 
    // redireccionar asi un lugar prohibido ;)
    res.writeHeader(200,{'Content-type':'text/html'});
    res.end('Ahora puedes visitar <a href="/prohibido"> aqui</a>');
  } else {
    // hmm mala autenticación, GTFO dude.
    res.end('GTFO');
  }
});
// funcion salir
app.get('/logout', function(req,res){
  if (req.session.user){
    delete req.session.user
  }
  res.redirect('/login')
})

// Express te permite separar tu respuesta en una serie de pasos
// en este caso, primero debe pasar por checkAuth para poder primero
// mandar el mensaje. 
app.get('/prohibido', checkAuth, function(req,res){
  // Como el usuario esta logueado, podemos acceder a sus datos
  //res.writeHeader(200,{'Content-type':'text/html'});
  //res.end('Bienvenido, '+ req.session.user.username + ' :) ' + '<a href="/logout"> Salir </a>');
  res.render('prohibido',{
  title: 'Prohibido',
  layout: 'inicio.jade'
  });
});

app.listen(3001, function(){
  console.log('Server running on %s', app.address().port);
});