//Create de database
var fs = require("fs");
var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Session = require('express-session');
var SessionStore = require('session-file-store')(Session);
var session = Session({store: new SessionStore({path: __dirname+'/sessions'}), secret: '4vHvphXaMRkw6O77voi5', resave: true, saveUninitialized: true,cookie : {maxAge : 2 * 365 * 24 * 60 * 60 * 1000}});
var gm = require('gm');
/*
var session = require("express-session")({
    store: new FileStore,
    secret: '4vHvphXaMRkw6O77voi5',
    resave: true,
    saveUninitialized: true
  });
  */
var sharedsession = require("express-socket.io-session");


//Create folders
var dir = path.join(__dirname,"/uploads");
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}
var dir = path.join(__dirname,"/thumbs");
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

var file = path.join(__dirname,"database.sqlite3");
var exists = fs.existsSync(file);
if(!exists) {
  console.log("Creating DB file.");
  fs.openSync(file, "w");
}

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  //First start of the app, create tables + infos
  if(!exists) {

    //Create invite table for your guests
    db.run("CREATE TABLE invite (id INTEGER PRIMARY KEY, name TEXT, status INTEGER DEFAULT 0, code TEXT, admin INTEGER DEFAULT 0)");
    var admin = db.prepare("INSERT INTO invite (`name`, `code`, `admin`) VALUES (?,?,?)");
    //create gallery table for pictures of the wedding
    db.run("CREATE TABLE coverPics (id INTEGER PRIMARY KEY, picture TEXT)");
    //create gallery table for pictures of the wedding
    db.run("CREATE TABLE gallery (id INTEGER PRIMARY KEY, picture TEXT, unpublish INTEGER DEFAULT 0, code TEXT, time INTEGER)");
    //Create guestbook table
    db.run("CREATE TABLE guestbook (id INTEGER PRIMARY KEY, text TEXT, unpublish INTEGER DEFAULT 0, code TEXT)");
  //insert admin here
      admin.run("Arthur","MyPassword",1);
      admin.run("Catherine","MyPassword",1);
  }

  db.each("SELECT id AS id,name,code FROM invite", function(err, row) {
    console.log("Invites : " + row.id + ": " + row.name + ": " + row.code);
  });
});

//All prepared statement
var checkCode = db.prepare("SELECT id,group_concat(name, ' & ') as name,max(admin) as admin FROM invite WHERE code = ? GROUP BY code");
var addPicture = db.prepare("INSERT INTO gallery (`picture`,`code`,`time`) VALUES (?,?,?)");

//Add join table for codes
var loadPicture = db.prepare("SELECT picture, code, time FROM gallery ORDER BY id DESC LIMIT 6 OFFSET 0");
var loadAllPicture = db.prepare("SELECT picture, code, time FROM gallery ORDER BY id DESC");


// Attach session
app.use(session);

// Share session with io sockets
io.use(sharedsession(session));

app.use('/side', express.static(__dirname + '/side'));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/thumbs', express.static(__dirname + '/thumbs'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});



app.post('/upload/picture', function(req, res){
  //if user is loged in :
  if(undefined != req.session.code){
    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '/uploads');
    var thumbPath = path.join(__dirname,'/thumbs');

    form.on('file', function(field, file) {
      console.log(req.session.name + " has uploaded a picture");
        fileName = makeid()+(Date.now()/1000)+file.name;
        addPicture.run(fileName,req.session.code,Date.now());
        fs.rename(file.path, path.join(form.uploadDir, fileName));
        gm(path.join(form.uploadDir, fileName)).resize(579,579,"^").autoOrient().gravity('Center').extent(579, 579).write(path.join(thumbPath,fileName), function (err) {
          if(err){console.log(err);}
          else{io.sockets.emit('newPicture', {picture : fileName, who : req.session.name, time : Date.now()});}
        });

    });
    form.on('error', function(err) {
      console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
      res.end('success');
    });

    form.parse(req);

  }
  else{
    res.end('denied');
  }
});

var clients = 0;
io.on('connection', function(socket) {
    clients++;
    io.sockets.emit('userCount', {clients : clients});

    //create the session
    session(socket.handshake, {}, function(err){
      if (err) {}
      socket.handshake.session.touch(function(err){});
    });

    if(undefined != socket.handshake.session.name){
    socket.emit('authSuccess');
    console.log(socket.handshake.session.name+' joined ('+clients+' connected)');
    }
    else{
      console.log('New client ('+clients+' connected)');
      socket.emit('authReady');
    }

    var pictures = [];
      db.each("SELECT picture, code, time FROM gallery ORDER BY id DESC LIMIT 6 OFFSET 0",function(err,row){
        pictures.push(row);
      },function(){
        socket.emit('loadPicture',pictures);
    });

    socket.on('auth', function(data) {
        var allowed = false;
        checkCode.each(data.code,function(err,row){
          socket.handshake.session.code = data.code;
          socket.handshake.session.name = row.name;
          socket.handshake.session.admin = row.admin;
          session(socket.handshake, {}, function (err) {
            if (err) { /* handle error */ }
            var session = socket.handshake.session;
            // and save session
            session.save(function (err) { /* handle error */ })
          });
          allowed = true;
        },function(){
          if(allowed){
            socket.emit('authSuccess');
            console.log('Auth successfull : ' + socket.handshake.session.name);
          }
          else{
            socket.emit('authDenied');
            console.log('Auth denied!');
          }
        });
    });

    socket.on('loadImage', function(data) {
    });

    socket.on('disconnect', function(data) {
        clients--;
        io.sockets.emit('userCount', {clients : clients});
        if(undefined != socket.handshake.session.name){
          console.log(socket.handshake.session.name+' quit ('+clients+' connected)');
        }
        else{
          console.log('Client quit ('+clients+' connected)');
        }
    });
});

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


server.listen(8080);
