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
    if ($(window).scrollTop()+$("body > nav").innerHeight()+1 > $("#cover").innerHeight())
    {$("body > nav").addClass("page");}
    else{
      $("body > nav").removeClass("page");
    }
  });


  $("nav > a,nav > div > a.lien").on("click",function(e){
    e.preventDefault();
    $('html,body').animate({
 scrollTop : $("#"+$(this).data("href")).offset().top - $("body > nav").height()},'slow');
  });
  $("#hamburger").on("click",function(){
    $("nav").toggleClass("hidden");
  });


  //Socket management
    var socket = io.connect('/');
    var adminRights = false;


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

    socket.on('authSuccess',function(data){
      rsvp(data,socket);
      logedIn();
      if(data.admin =! undefined && data.admin == 1){
        adminRights = true;
        console.log("admin Opérationnel")
      }
    });
    socket.on('authDenied',askForCode);
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
        $item = $('<figure class="grid-item"><img src="/thumbs/'+data.picture+'" data-id="'+data.id_pic+'" data-who="'+data.who+'" data-time="'+data.time+'"></figure>');
      $(".grid").prepend( $item );
    });
    socket.on('loadPicture', function(data) {
      for(i=0;i<data.length;i++){
        console.log('Add pic:', data[i].picture);
        $item = $('<figure class="grid-item"><img src="/thumbs/'+data[i].picture+'" data-id="'+data[i].id_pic+'" data-who="'+data[i].who+'" data-time="'+data[i].time+'"></figure>');
        $(".grid").append( $item );
      }
    });
    socket.on('loadAllPicture', function(data) {
      $(".grid").removeClass("max6").children(".grid-item:gt(5)").remove();
      $("#loadAllPicture").remove();
      for(i=0;i<data.length;i++){
        console.log('Add pic:', data[i].picture);
        $item = $('<figure class="grid-item"><img src="/thumbs/'+data[i].picture+'" data-who="'+data[i].who+'" data-time="'+data[i].time+'"></figure>');
        $(".grid").append( $item );
      }
    });

    $("#loadAllPicture").on("click",function(){
      $(this).children("i.fa").addClass("faa-spin animated");
      socket.emit('loadAllImage');
    });




    function logedIn(){
      $("#blackout,#popupMax").remove();
      addUploadPicture();
    }
    function addUploadPicture(){
      $uploadPicture = $('<form class="uploadPicture" method="post" action="/upload/picture"><label for="uploadPicture" class="button"><i class="fa fa-camera" aria-hidden="true"></i>Prendre une photo</label><input type="file" name="picture" id="uploadPicture"  accept="image/*;capture=camera" capture class="hidden"></form>');
      $(".uploadPicture").remove();
      $(".unlockCode").remove();
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
    function rsvp(data,socket){
        $rsvp = $("#rsvp");
        $rsvp.append("<p>Merci de nous aider à planifier cette magnifique journée en nous laissant savoir si vous serez de la partie</p>");
        for(i=0;i<data.people.length;i++){
          console.log(data.people[i]);
          $personQc = $personFr = undefined;
          if(data.people[i].qc !== -1){
            $personQc = $('<p>Sera présent à la cérémonie le 8 juin 2017 au Belvédère de Wakefield, Qc, Canada: <br><span class="ouiQc rsvpSpan" data-value="2" data-where="qc" data-id="'+data.people[i].id+'"><i class="fa fa-square-o" aria-hidden="true"></i> Oui</span> / <span class="nonQc rsvpSpan" data-value="0" data-where="qc" data-id="'+data.people[i].id+'"><i class="fa fa-square-o" aria-hidden="true"></i> Non</span></p>');
            if(data.people[i].qc == 2){
              $personQc.children(".ouiQc").addClass("selected").children("i.fa").addClass("fa-check-square-o").removeClass("fa-square-o");
            }
            else if(data.people[i].qc === 0){
              $personQc.children(".nonQc").addClass("selected").children("i.fa").addClass("fa-check-square-o").removeClass("fa-square-o");
            }
          }
          if(data.people[i].fr !== -1){
           $personFr = $('<p>Sera présent au barbecue le 17 juin 2017 à Béon, Yonne, France: <br><span class="ouiFr rsvpSpan" data-value="2" data-where="fr" data-id="'+data.people[i].id+'"><i class="fa fa-square-o" aria-hidden="true"></i> Oui</span> / <span class="nonFr rsvpSpan" data-value="0" data-where="fr" data-id="'+data.people[i].id+'"><i class="fa fa-square-o" aria-hidden="true"></i> Non</span></p>');
           if(data.people[i].fr == 2){
             $personFr.children(".ouiFr").addClass("selected").children("i.fa").addClass("fa-check-square-o").removeClass("fa-square-o");
           }
           else if(data.people[i].fr === 0){
             $personFr.children(".nonFr").addClass("selected").children("i.fa").addClass("fa-check-square-o").removeClass("fa-square-o");
           }
         }
         $carton = $('<div class="carton"><h3>'+data.people[i].name+'</h3></div>');
         $carton.append($personQc);
         $carton.append($personFr);
         $carton.append('<p>Allergies alimentaires dont nous devrions être au courrant:<p>');
         $carton.append('<textarea class="allergies" data-id="'+data.people[i].id+'" placeholder="Écrivez ici les allergies alimentaires dont nous devrions être au courant pour vous préparer un menu alternatif en cas de besoin.">'+data.people[i].allergies+'</textarea>');
         $rsvp.append($carton);
        }
        $(".rsvpSpan").on("click",function(){
          $(this).parent().children(".rsvpSpan").removeClass("selected").children("i.fa").removeClass("fa-check-square-o").addClass("fa-square-o");
          $(this).addClass("selected").children("i.fa").addClass("fa-check-square-o").removeClass("fa-square-o");
          socket.emit('rsvp',{where:$(this).data("where"),value:$(this).data("value"),id:$(this).data("id")});
          //console.log($(this).data("where")+$(this).data("value")+$(this).data("id"));
        });
        $(".allergies").on("focusout",function(){
          socket.emit('allergies',{id:$(this).data("id"),allergies:$(this).val()});
        });
    }
    function askForCode(){
      $askForCode = $('<div class="unlockCode"><p class="button clickForCode faa-parent animated-hover"><i class="fa fa-lock faa-vertical" aria-hidden="true"></i> Déverouiller</p></div>');
      $(".uploadPicture").remove();
      $(".unlockCode").remove();
      $("section#photos,section#livredor,section#confirmer").children("article.coeurcoeurcoeur").after($askForCode);
      $("#rsvp").append($askForCode);
      $(".clickForCode").hover(function(){
        console.log("hovering");
        $(this).children("i.fa").removeClass("fa-lock").addClass("fa-unlock-alt");
      },function(){
        $(this).children("i.fa").removeClass("fa-unlock-alt").addClass("fa-lock");
      });
      $(".clickForCode").on("click",function(){
        $popupCode = $('<div id="blackout"></div><div id="popupMax"><div id="popup"><i class="fa fa-times" aria-hidden="true" id="closeModal"></i><h1>Entrez le code reçu par courriel</h1><input type="text" placeholder="MonSuperCode" name="code"><p id="sendCode"><i class="fa fa-cog" aria-hidden="true"></i> Déverouiller</p></div></div>');
        $('body').append($popupCode);
        $("#closeModal").on("click",function(){
          console.log("remove popup");
          $("#blackout").remove();
          $("#popupMax").remove();
        });
        $("#blackout").on("click",function(){
          $("#closeModal").trigger("click");
        });
        $("#sendCode").on("click",function(){
          $(this).children("i.fa").addClass("faa-spin animated");
          console.log($(this).prev("input").val());
          socket.emit('auth', { code: $(this).prev("input").val() });
          socket.on("authDenied",function(){
            $("#sendCode").html('<i class="fa fa-exclamation-triangle faa-ring animated" aria-hidden="true"></i> Oups, réessayer');
          });
        });
      });

    }

});
