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
    db.run("CREATE TABLE invite (id INTEGER PRIMARY KEY, name TEXT, status INTEGER DEFAULT 0, code TEXT)");
    var stmt = db.prepare("INSERT INTO invite (`name`, `code`) VALUES (?,?)");

  //insert invite here
      stmt.run("Jean Bérubé","joje872");
      stmt.run("Josée Lauzon","joje872");
      stmt.run("Sylvie Célérier","sylvie521");
      stmt.run("Cyril Juchereau","Cyril92813");
    stmt.finalize();
  }


  db.each("SELECT rowid AS id, name,code FROM invite", function(err, row) {
    console.log("Invites : " + row.id + ": " + row.name + ": " + row.code);
  });
});

db.close();

var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8080, function(){
    console.log('Server running on 8080...');
});
