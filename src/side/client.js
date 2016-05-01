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
  $("#cover").css("height",$("#cover").innerHeight());
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
});
