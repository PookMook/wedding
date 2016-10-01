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
    db.run("CREATE TABLE invite (id_user INTEGER PRIMARY KEY, name TEXT, status INTEGER DEFAULT 0, code TEXT, admin INTEGER DEFAULT 0, qc INTEGER DEFAULT 1, fr INTEGER DEFAULT 1, allergies TEXT)");
    var addAdmin = db.prepare("INSERT INTO invite (`name`, `code`, `admin`, 'qc', 'fr', 'allergies') VALUES (?,?,1,?,?,?)");
    var addGuest = db.prepare("INSERT INTO invite (`name`, `code`, `admin`, 'qc', 'fr', 'allergies') VALUES (?,?,0,?,?,?)");
    //create gallery table for pictures of the wedding
    db.run("CREATE TABLE coverPics (id_cover INTEGER PRIMARY KEY, picture TEXT)");
    //create gallery table for pictures of the wedding
    db.run("CREATE TABLE gallery (id_pic INTEGER PRIMARY KEY, picture TEXT, unpublish INTEGER DEFAULT 0, code TEXT, time INTEGER)");
    //Create guestbook table
    db.run("CREATE TABLE guestbook (id_guest INTEGER PRIMARY KEY, text TEXT, unpublish INTEGER DEFAULT 0, code TEXT, time INTEGER)");
  //insert admin here
      addAdmin.run("Arthur","MyPassword",2,2,"");
      addAdmin.run("Catherine","MyPassword",2,2,"");
  //insert guest here
      addGuest.run("Guest1","LeMotDePass",1,1,"");
  }

  db.each("SELECT id_user AS id,name,code FROM invite", function(err, row) {
    console.log("Invites : " + row.id + ": " + row.name + ": " + row.code);
  });
});

//All prepared statement
var checkCode = db.prepare("SELECT id_user,group_concat(name, ' & ') as name,max(admin) as admin FROM invite WHERE code = ? GROUP BY code");
var peopleInfo = db.prepare("SELECT id_user,name,qc,fr,allergies FROM invite WHERE code = ?");
var updatePeopleInfoQc = db.prepare("UPDATE invite SET qc = ? WHERE id_user = ? AND code = ?");
var updatePeopleInfoFr = db.prepare("UPDATE invite SET fr = ? WHERE id_user = ? AND code = ?");
var updatePeopleInfoAllergies = db.prepare("UPDATE invite SET allergies = ? WHERE id_user = ? AND code = ?");
var addPicture = db.prepare("INSERT INTO gallery (`picture`,`code`,`time`) VALUES (?,?,?)");
var addGuestBook = db.prepare("INSERT INTO guestbook (`text`,`code`,`time`) VALUES (?,?,?)");



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
        fs.rename(file.path, path.join(form.uploadDir, fileName));
        gm(path.join(form.uploadDir, fileName)).resize(580,580,"^").autoOrient().gravity('Center').extent(580, 580).write(path.join(thumbPath,fileName), function (err) {
          if(err){console.log(err);}
          else{
            addPicture.run(fileName,req.session.code,Date.now(),function(err){
                    if(err){}
                    else{console.log("val  "+this.lastID);}
                    io.sockets.emit('newPicture', {picture : fileName, who : req.session.name, time : Date.now(), id_pic : this.lastID});
                  });
          }
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
      socket.handshake.session.people = [];
      peopleInfo.each(socket.handshake.session.code,function(err,person){
        console.log("someone has been found : "+person.name);
        socket.handshake.session.people.push({id:person.id_user,name:person.name,qc:person.qc,fr:person.fr,allergies:person.allergies});
      },function(){
        socket.emit('authSuccess',{admin : socket.handshake.session.admin, name : socket.handshake.session.name, people : socket.handshake.session.people});
        console.log(socket.handshake.session.name+' joined ('+clients+' connected)');
      });
    }
    else{
      console.log('New client ('+clients+' connected)');
      socket.emit('authReady');
    }

    var pictures = [];
      db.each("SELECT g.picture, g.time, group_concat(i.name, ' & ') as who, g.id_pic FROM gallery g JOIN invite i ON i.code = g.code WHERE g.unpublish = 0 GROUP BY g.id_pic ORDER BY g.id_pic DESC LIMIT 6 OFFSET 0",function(err,row){
        pictures.push(row);
      },function(){
        socket.emit('loadPicture',pictures);
    });

    var guestbook = [];
      db.each("SELECT g.id_guest, g.text, g.time, group_concat(i.name, ' & ') as who FROM guestbook g JOIN invite i ON i.code = g.code WHERE g.unpublish = 0 GROUP BY g.id_guest ORDER BY g.id_guest DESC LIMIT 6 OFFSET 0",function(err,row){
        guestbook.push(row);
      },function(){
        socket.emit('loadGuestBook',guestbook);
    });

    socket.on('auth', function(data) {
        var allowed = false;
        checkCode.each(data.code,function(err,row){
          socket.handshake.session.code = data.code;
          socket.handshake.session.name = row.name;
          socket.handshake.session.admin = row.admin;
          socket.handshake.session.people = [];
          allowed = true;
        },function(){
          //Get people infos
          peopleInfo.each(data.code,function(err,person){
            console.log("someone has been found : "+person.name);
            socket.handshake.session.people.push({id:person.id_user,name:person.name,qc:person.qc,fr:person.fr,allergies:person.allergies});
          },function(){
            if(allowed){

              session(socket.handshake, {}, function (err) {
                if (err) { /* handle error */ }
                var session = socket.handshake.session;
                // and save session
                session.save(function (err) { /* handle error */ })
              });

            //todo : chercher toutes les infos sur les rsvp et les ajouter au socket emit
              socket.emit('authSuccess', {admin : socket.handshake.session.admin, name : socket.handshake.session.name, people : socket.handshake.session.people});
              console.log('Auth successfull : ' + socket.handshake.session.name);
            }
            else{
              socket.emit('authDenied');
              console.log('Auth denied!');
            }
          });
        }
        );
    });

    socket.on('unpublish',function(data){
      if(undefined != socket.handshake.session.admin && socket.handshake.session.admin == 1){
        console.log(socket.handshake.session.name +" unpublished the picture" + data.unpublishPicture);
      }
    });

    socket.on('rsvp',function(data){
      //update rsvp :
      if((data.where == "qc" || data.where == "fr") && (data.value === 0 || data.value === 2)){
        //find id_user in people
        for(i=0;i<socket.handshake.session.people.length;i++){
          if(socket.handshake.session.people[i].id === data.id){
            socket.handshake.session.people[i][data.where] = data.value;

            console.log(socket.handshake.session.people[i].name + ' changed status to '+data.value+' for '+data.where);

            //write session
            session(socket.handshake, {}, function (err) {
              if (err) { /* handle error */ }
              var session = socket.handshake.session;
              // and save session
              session.save(function (err) { /* handle error */ })
            });

            //write SQL
            if(data.where == "fr"){
              updatePeopleInfoFr.run(data.value,data.id,socket.handshake.session.code);
            }
            else if(data.where == 'qc'){
              updatePeopleInfoQc.run(data.value,data.id,socket.handshake.session.code);
            }

          }
        }
      }
    });

    socket.on('addGuestBook',function(data){
      if(undefined != socket.handshake.session.code){
      addGuestBook.run(data.text,socket.handshake.session.code,Date.now(),function(err){
              if(err){}
              else{console.log("Nouvelle entrée dans le livre d'or : "+this.lastID);}
              io.sockets.emit('newGuestBook', {text : data.text, who : socket.handshake.session.name, time : Date.now(), id_guest : this.lastID});
            });
      }

    });
    socket.on('allergies',function(data){
      //update rsvp :
        //find id_user in people
        for(i=0;i<socket.handshake.session.people.length;i++){
          if(socket.handshake.session.people[i].id === data.id){
            socket.handshake.session.people[i].allergies = data.allergies;

            console.log(socket.handshake.session.people[i].name + ' changed allergies to '+data.allergies);

            //write session
            session(socket.handshake, {}, function (err) {
              if (err) { /* handle error */ }
              var session = socket.handshake.session;
              // and save session
              session.save(function (err) { /* handle error */ })
            });

            //write SQL
            updatePeopleInfoAllergies.run(data.allergies,data.id,socket.handshake.session.code);
          }
        }
    });

    socket.on('loadAllImage', function(data) {
      var pictures = [];
        db.each("SELECT g.picture, g.time, group_concat(i.name, ' & ') as who, g.id_pic FROM gallery g JOIN invite i ON i.code = g.code WHERE g.unpublish = 0 GROUP BY g.id_pic ORDER BY g.id_pic DESC LIMIT -1 OFFSET 6",function(err,row){
          pictures.push(row);
        },function(){
          socket.emit('loadAllPicture',pictures);
      });
    });

    socket.on('loadAllGuestBook', function(data) {
      var guestbook = [];
        db.each("SELECT g.id_guest,g.text, g.time, group_concat(i.name, ' & ') as who FROM guestbook g JOIN invite i ON i.code = g.code WHERE g.unpublish = 0 GROUP BY g.id_guest ORDER BY g.id_guest DESC LIMIT -1 OFFSET 6",function(err,row){
          guestbook.push(row);
        },function(){
          socket.emit('loadAllGuestBook',guestbook);
      });
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
