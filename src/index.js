//Create de database
var fs = require("fs");
var file = "database.sqlite3";
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
var checkCode = db.prepare("SELECT id,name FROM invite WHERE code = ?");
var addPicture = db.prepare("INSERT INTO gallery (`picture`,`code`,`time`) VALUES (?,?,?)");




var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use('/side', express.static(__dirname + '/side'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post('/upload/cover', function(req, res) {
  var cover = 'cover.jpg';
  io.sockets.emit('newCover', {cover : cover});
})
app.post('/upload/pictures', function(req, res) {
  res.send('hello world');
  var picture = 'cover.jpg';
  io.sockets.emit('newPicture', {picture : picture});
})

app.post('/upload/picture', function(req, res){
  // create an incoming form object
  var form = new formidable.IncomingForm();
  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;
  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/uploads');
  var allowed = false;
  var who = "";
  var code = "";
  form.on('field', function(name, value) {
    console.log("Enter the verification loop");
      if(name == "code"){
        console.log("code found!");
        checkCode.each(value,function(err,row){
          if(who == ""){
            who = row.name;
          }
          else{
            who += " & "+row.name;
          }
          code = value;
          allowed = true;
        }
      )};
  });
  // every time a file has been uploaded successfully,
  // rename it to a timestamp + random number + it's orignal name
  form.on('file', function(field, file) {
    console.log("start uploading");
    if(allowed){
      console.log(who + " has uploaded a picture");
      fileName = makeid()+(Date.now()/1000)+file.name;
      addPicture.run(fileName,code,Date.now());
      fs.rename(file.path, path.join(form.uploadDir, fileName));
      io.sockets.emit('newPicture', {picture : fileName, who : who, time : Date.now()});
    }
    else{
      console.log(who + " tried to upload a picture but was bounced");
      fs.unlink(file.path);
    }
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});

var clients = 0;
io.on('connection', function(socket) {
    clients++;
    socket.emit('announcements', { message: 'A new user has joined!' });
    io.sockets.emit('userCount', {clients : clients});
    socket.on('event', function(data) {
        console.log('A client sent us this dumb message:', data.message);
    });
    socket.on('disconnect', function(data) {
        clients--;
        io.sockets.emit('userCount', {clients : clients});
        console.log('Client quit :'+clients);
    });
    console.log('New client'+clients);
});

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}



server.listen(80);
