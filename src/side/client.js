$(document).ready(function(){


  //recover code from URL
  var code;
  if(document.location.toString().indexOf('?') !== -1) {
    var query = document.location.toString().replace(/^.*?\?/, '').replace(/#.*$/, '').split('&');
    for(var i=0, l=query.length; i<l; i++) {

       aux = decodeURIComponent(query[i]).split('=');
             if(aux[0] == "code"){
               code = aux[1];
             }
      }
      delete aux;
}


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
  $("#cover").css("height",window.innerHeight+"px");


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
    socket.emit('event', { message: 'Hey, I have an important message!' });
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
        $item = $('<figure class="grid-item"><img src="/uploads/'+data.picture+'" data-who="'+data.who+'" data-time="'+data.time+'"></figure>');
      $(".grid").prepend( $item );

    });


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
          formData.append('code',code);
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

});
