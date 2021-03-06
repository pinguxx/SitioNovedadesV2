/*
* Simple Login System
*/
var express = require('express'),
    routes = require('./routes'),
    stylus = require('stylus'),
    async  = require('async'),
    fs     = require('fs'),
    //nano conexión con base de datos.
    nano = require('nano')('http://localhost:5984')
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
    res.render('consultar',{
      layout: 'user.jade',       // Plantilla, agregado para la vista de usuario.
      title: 'Inicio',
    });
});

// Go Login
app.get('/login', function(req,res){
  // Mostrar el formulario para loguearse
    res.render('login',{
    title: 'Login',
    layout: 'inicio.jade'
  });
});

// Go Diario 24 junio 2012 checkAuth
app.get('/diario', checkAuth, function(req,res){
  res.render('diario',{
  title: 'Diario',
  layout:'subidas.jade'  
  });
});

// Go Suplementos 11 julio 2012 
app.get('/suplemento', checkAuth, function(req, res){
  res.render('suplemento',{
  title: 'Suplementos',
  layout:'subidas.jade'
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

//funcion subir diario 
app.post('/upload_diario', function(req, res){
 // selecciono la base de datos
  var db = nano.use('diarios');
  
  // tomo los campos del form
  var datos = {
    tipo: req.body.tipo,
    dia: req.body.dia
  };

  // insertar datos en la base de datos
  db.insert(datos, function(err,doc){
    if(!err){
      var errors = [];
      // Ya que express usa formidable por default
      // todos los archivos ya subidos constituyen
      // el objecto req.files
      // Entonces iteramos a través de este objeto
      // Para así habilitar multiples-files al mismo tiempo
      for (var file in req.files) {

        // Current file {curt}
        var curt = req.files[file];
        // A veces se nos filtra un `undefined` 
        // Si hay undefined terminar esta iteración y continuar con la siguiente
        if (!curt) continue;

        // Puse esto dentro de un try/catch 
        // por precaución, no se sabe si el archivo o
        // el pipe van a fallar. Si eso sucede pues atrapar ese error

          // The magic
          // la gran ventaja de pipe es que evita que la memoria utilizada
          // por este proceso sea minimo, ya que pipe evita cargar a memoria
          // el archivo. Si no que lo envia directamente a la bdd
          // curt.path es la dirección "fisica" del archivo subido por formidable
          //
          fs.createReadStream(curt.path).pipe(
            // db.attachment toma los siguientes valores:
            // nombre del documento (en este caso es mandado por couchdb)
            // en el proceso de db.insert();
            // el nombre del archivo (como el usuario lo conoce)
            // null que es el archivo binario, null porque estamos usando pipe
            // y curt.type que es el mime type del documento que se esta subiendo (tambien de formidable)
            // y por último la revisión del documento que se esta insertando
            // Para evitar conflictos (409 errors)
            db.attachment.insert(doc.id, curt.name, null, curt.type,{ rev: doc.rev })
          ).on('error', function(error){
            errors.push(error);
            console.log(error);
            //continue;
          });

      }
      if (errors.length) {
        // informar al usuario de los errores encontrados
        // Posiblemente no el mejor código pero este funciona
        res.writeHeader(409,{'Content-type':'text/html'});
        return res.end('Opsy<br>'+ errors.join('<br>'));
      } else {
        
        function getNames (files) {
          return Object.keys(files).map(function(file){
            return files[file].name;
          })
        }

        return res.redirect('/subido?files=' + getNames(req.files || {}).join(';'));
      }
    }else{
      res.end("Fallo en la insercion de registro en la Base de Datos: \n" + err);
    }
  });
});

// funcion subir suplemento 11 julio 2012

app.post('/upload_suplemento', function(req, res){
 // selecciono la base de datos
  var db = nano.use('suplementos');
  
  // tomo los campos del form
  var datos = {
    tipo: req.body.tipo,
    dia: req.body.dia
  };
  
//db.insert(datos, function(err,doc){
  //   if(!err){
       var errors = [];
  

  function controlFlow (id){
    db.insert(datos,id + '-' + Date.now(), function(err, doc){
      if (!err) {
        var curt = req.files[id];
        console.log(id)
        fs.createReadStream(curt.path).pipe(
          db.attachment.insert(doc.id, curt.name, null, curt.type, { rev : doc.rev })
        ).on('error', function(error){
          errors.push(error);
          console.log(error);
        });
      } else {
        console.dir(err);
      }
    });
  }
  Object.keys(req.files).forEach(function(file){
    if (req.files[file].name) {
      controlFlow.call(this, [file]);
    }
  });

 // res.end('uploading');
// db.insert(datos, function(err,doc){
//     if(!err){
//       var errors = [];

//        if (errors.length) {
//          res.writeHeader(409,{'Content-type':'text/html'});
//          return res.end('Opsy<br>'+ errors.join('<br>'));
//        } else {
        
          function getNames (files) {
            return Object.keys(files).map(function(file){
              return files[file].name;
            })
          }

          return res.redirect('/suplemento_end?files=' + getNames(req.files || {}).join(';'));
//        }
//      }else{
//        res.end("Fallo en la insercion de registro en la Base de Datos: \n" + err);
//      }
//    });
 });
// }


// Subido Suplemento
app.get('/suplemento_end', function(req,res){
  var files = req.query.files.split(';');
  res.render('Ok',{
    title: 'Datos insertados',
    layout: 'subidas.jade',
    files : files
  });
});


// Subido Diario
app.get('/subido', function(req,res){
  var files = req.query.files.split(';');
  res.render('Ok',{
    title: 'Datos insertados',
    layout: 'subidas.jade',
    files : files
  });
});

app.post('/search', function (req, res){
  var date = req.body.date.split('/')
  date = new Date(date[2],date[1] - 1, date[0])
  var db;
  switch (req.body.item) {
    case "suplemento":
      db = nano.use('suplementos')
      break;
    case "diario":
      db = nano.use('diario')
      break;
    default: 
      return res.end('404');
      break
  }
  console.log(req.body)
  req.body.suple = req.body.suple.toLowerCase().replace(/ /g, '')

  db.view('supl', req.body.suple, { key: date.toDateString(), limit: 1}, function (err, data){
    if (err) res.end('error')
    var doc = data.rows[0].value
    res.render('viewer', {
      title: 'viewer',
      layout:false,
      doc: doc,
      url: 'http://localhost:5984/'+req.body.item + '/'+ doc._id + '/' + Object.keys(doc._attachments)[0]
    })
  })
})
app.listen(3001, function(){
  console.log('Server running on %s', app.address().port);
});
