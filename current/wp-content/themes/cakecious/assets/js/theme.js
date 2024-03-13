jQuery(document).ready(function($) {
    (function($) {

    "use strict";


	$('#datetimepicker3').datetimepicker({

	});
	$('#datetimepicker4').datetimepicker({
		format: 'LT'
	});

    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            $('.scrollup').fadeIn();
        } else {
            $('.scrollup').fadeOut();
        }
    });
    $('.scrollup').on("click", function() {
        $("html, body").animate({
            scrollTop: 0
        }, 600);
        return false;
    });


    var nav_offset_top = $('header').height(); 
    /*-------------------------------------------------------------------------------
	  Navbar 
	-------------------------------------------------------------------------------*/

	//* Navbar Fixed  
    function navbarFixed(){
        if ( $('.main_header_area, .main_header_three, .box_header_four').length ){ 
            $(window).scroll(function() {
                var scroll = $(window).scrollTop();   
                if (scroll >= nav_offset_top ) {
                    $(".main_header_area, .main_header_three, .box_header_four").addClass("navbar_fixed");
                } else {
                    $(".main_header_area, .main_header_three, .box_header_four").removeClass("navbar_fixed");
                }
            });
        };
    };
    navbarFixed();
	

    /*----------------------------------------------------*/
    /*  Cake Feature Slider
    /*----------------------------------------------------*/
    function cake_carousel(){
        if ( $('.cake_feature_slider').length ){
            $('.cake_feature_slider').owlCarousel({
                loop:true,
                margin: 30,
                items: 4,
                nav:true,
                autoplay: false,
                smartSpeed: 1500,
                dots:true,
                navContainerClass: 'cake_feature_slider',
                navText: ['<i class="fa fa-angle-left" aria-hidden="true"></i>','<i class="fa fa-angle-right" aria-hidden="true"></i>'],
                responsiveClass: true,
                responsive: {
                    0: {
                        items: 1,
                    },
                    430: {
                        items: 2, 
                    },
                    768: {
                        items: 3, 
                    },
                    992: {
                        items: 4,
                    }
                }
            })
        }
    }
    cake_carousel();
	
    /*----------------------------------------------------*/
    /*  Cake Feature Slider
    /*----------------------------------------------------*/
    function client_say_slider(){
        if ( $('.client_says_slider').length ){
            $('.client_says_slider').owlCarousel({
                loop:true,
                margin: 30,
                items: 1,
                nav:true,
                autoplay: false,
                smartSpeed: 1500,
                dots:false,
                navContainerClass: 'client_says_slider',
                navText: ['<i class="fa fa-angle-left" aria-hidden="true"></i>','<i class="fa fa-angle-right" aria-hidden="true"></i>'],
                responsiveClass: true,
            })
        }
    }
    client_say_slider();
	
    /*----------------------------------------------------*/
    /*  Cake Feature Slider
    /*----------------------------------------------------*/
    function arivals_slider(){
        if ( $('.arivals_slider').length ){
            $('.arivals_slider').owlCarousel({
                loop:true,
                margin: 30,
                items: 2,
                nav:false,
                autoplay: false,
                smartSpeed: 1500,
                dots:true,
                responsiveClass: true,
                responsive: {
                    0: {
                        items: 1,
                    },
                    420: {
                        items: 2,
                    },
                }
            })
        }
    }
    arivals_slider();
    
    /*----------------------------------------------------*/
    /*  Special Recipe Slider
    /*----------------------------------------------------*/
    function recipe_slider(){
        if ( $('.special_recipe_slider').length ){
            $('.special_recipe_slider').owlCarousel({
                loop:true,
                margin: 0,
                items: 1,
                nav:false,
                autoplay: false,
                smartSpeed: 1500,
                dots:true,
                responsiveClass: true,
            })
        }
    }
    recipe_slider();
	
	$(document).ready(function() {
		$('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
			disableOn: 700,
			type: 'iframe',
			mainClass: 'mfp-fade',
			removalDelay: 160,
			preloader: false,

			fixedContentPos: false
		});
	});

	/*----------------------------------------------------*/
    /*  portfolio_isotope
    /*----------------------------------------------------*/
    function grid_gallery(){
        if ( $('.grid_portfolio_area').length ){
            // Activate isotope in container
            $(".grid_portfolio_area").imagesLoaded( function() {
                $(".grid_portfolio_area").isotope({
                    layoutMode: 'masonry',
                    percentPosition:true,
                    columnWidth: 1
        //            masonry: {
        //                columnWidth: '.grid-sizer, .grid-sizer_two',
        //            }            
                }); 
            }); 
        }
    }
    grid_gallery();
    
    /*----------------------------------------------------*/
    /*  Feature slider js
    /*----------------------------------------------------*/
    function portfolio_isotope(){
        if ( $('.portfolio_filter ul li').length ){
            // Add isotope click function
            $(".portfolio_filter ul li").on('click',function(){
                $(".portfolio_filter ul li").removeClass("active");
                $(this).addClass("active");

                var selector = $(this).attr("data-filter");
                $(".grid_portfolio_area").isotope({
                    filter: selector,
                    animationOptions: {
                        duration: 450,
                        easing: "linear",
                        queue: false,
                    }
                });
                return false;
            });
        }
    }
    
    portfolio_isotope();
	
    function countDownTimer () {
        if ($('.countdown-box').length) {

            $('.countdown-box').each(function () {
                var Self = $(this);
                var countDate = Self.data('countdown-time'); // getting date

                Self.countdown(countDate, function(event) {
                    $(this).html('<li> <div class="box"> <h4>'+ event.strftime('%D') +'</h4> <span>Days</span> </div> </li> <li> <div class="box"> <h4>'+ event.strftime('%H') +'</h4> <span>Hours</span> </div> </li> <li> <div class="box"> <h4>'+ event.strftime('%M') +'</h4> <span>Minutes</span> </div> </li> <li> <div class="box"> <h4>'+ event.strftime('%S') +'</h4> <span>Seconds</span> </div> </li> ');
                });
            });

        };
    }
    countDownTimer();

	/*----------------------------------------------------*/
    /*  Search Popup js
    /*----------------------------------------------------*/
	$(document).ready(function() {
        $('.popup-with-zoom-anim').magnificPopup({
            type: 'inline',

            fixedContentPos: false,
            fixedBgPos: true,

            overflowY: 'auto',

            closeBtnInside: true,
            preloader: false,

            midClick: true,
            removalDelay: 300,
            mainClass: 'my-mfp-zoom-in'
        });

        $('.popup-with-move-anim').magnificPopup({
            type: 'inline',

            fixedContentPos: false,
            fixedBgPos: true,

            overflowY: 'auto',

            closeBtnInside: true,
            preloader: false,

            midClick: true,
            removalDelay: 300,
            mainClass: 'my-mfp-slide-bottom'
        });
    });
	
	/*----------------------------------------------------*/
    /*  Simple LightBox js
    /*----------------------------------------------------*/
    $('.imageGallery1 .light').simpleLightbox();

	/*============================*/
	/*  - function on page load */
	/*============================*/
	$(window).load(function(){
		if($('#loader-wrapper').length){
            $('#loader-wrapper').fadeOut();
		};
	});
	
})(jQuery)
});