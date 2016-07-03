$(document).ready(function(){

  $("#cover").on("click",function(){
     if($(".slideshow.active").next(".slideshow").is("div")){
          $(".slideshow.active").removeClass("active").next(".slideshow").addClass("active");
      }
      else{
          $(".slideshow.active").removeClass("active");
          $(this).children(".slideshow").first().addClass("active");
      }
  });

  setInterval(function(){$("#cover").trigger("click");},5000);
  $(window).load(function(){
    $("#cover").css("height",window.innerHeight+"px");
  });


  $(window).on("scroll",function(){
    if ($(window).scrollTop()+1 > $("#cover").innerHeight())
    {$("body > nav").addClass("page");}
    else{
      $("body > nav").removeClass("page");
    }
  });


  $("nav > a").on("click",function(e){
    e.preventDefault();
    $('html,body').animate({
 scrollTop : $("#"+$(this).data("href")).offset().top},'slow');
  });


  //Socket management
    var socket = io.connect('/');


    socket.on("authReady",function(){
      //recover code from URL and auth socket
      if(document.location.toString().indexOf('?') !== -1) {
        var query = document.location.toString().replace(/^.*?\?/, '').replace(/#.*$/, '').split('&');
        for(var i=0, l=query.length; i<l; i++) {

           aux = decodeURIComponent(query[i]).split('=');
                 if(aux[0] == "code"){
                   code = aux[1];
                   socket.emit('auth', { code: aux[1] });
                 }
          }
          delete aux;
      }
      else{
        askForCode();
      }
    });

    socket.on('authSuccess',addUploadPicture);
    socket.on('announcements', function(data) {
        console.log('Got announcement:', data.message);
    });
    socket.on('userCount', function(data) {
        console.log('Update number of user:', data.clients);
    });
    socket.on('newCover', function(data) {
        console.log('Update cover pic:', data.cover);
    });
    socket.on('newPicture', function(data) {
        console.log('Add pic:', data.picture);
        $item = $('<figure class="grid-item"><img src="/thumbs/'+data.picture+'" data-who="'+data.who+'" data-time="'+data.time+'"></figure>');
      $(".grid").prepend( $item );
    });
    socket.on('loadPicture', function(data) {
      console.log(data);
      for(i=0;i<data.length;i++){
        console.log('Add pic:', data[i].picture);
        $item = $('<figure class="grid-item"><img src="/thumbs/'+data[i].picture+'" data-who="'+data[i].who+'" data-time="'+data[i].time+'"></figure>');
        $(".grid").append( $item );
      }
    });





    function addUploadPicture(){
      $uploadPicture = $('<form class="uploadPicture" method="post" action="/upload/picture"><label for="uploadPicture" class="button"><i class="fa fa-camera" aria-hidden="true"></i>Prendre une photo</label><input type="file" name="picture" id="uploadPicture"  accept="image/*;capture=camera" capture class="hidden"></form>');
      $(".uploadPicture").remove();
      $("section#photos").children("article.coeurcoeurcoeur").after($uploadPicture);
      $('#uploadPicture').on('change', function(){
        var files = $(this).get(0).files;
        if (files.length > 0){
          // One or more files selected, process the file upload
            var formData = new FormData();
            // loop through all the selected files
            for (var i = 0; i < files.length; i++) {
              var file = files[i];
              // add the files to formData object for the data payload
              formData.append('uploads[]', file, file.name);
            }
            $.ajax({
            url: '/upload/picture',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data){
                console.log('upload successful!');
            }
          });
        }
      });
    }
    function askForCode(){
      $askForCode = $('<div class="uploadPicture"><p class="button" id="clickForCode"><i class="fa fa-lock" aria-hidden="true"></i> Déverouiller</p></div>');
      $(".uploadPicture").remove();
      $("section#photos").children("article.coeurcoeurcoeur").after($askForCode);
      $("#clickForCode").on("click",function(){
        $popupCode = $('<div id="blackout"></div><div id="popupMax"><div id="popup"></div></div>');
        $('body').append($popupCode);
      });

    }

});
