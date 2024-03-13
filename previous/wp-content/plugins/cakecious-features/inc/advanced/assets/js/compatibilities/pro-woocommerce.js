(function() {
	'use strict';

	window.cakeciousProWooCommerce = {

		/**
		 * Function to init floating checkout button on cart page.
		 */
		initCartFloatingCheckoutButton: function() {
			var $section = document.querySelector( '.woocommerce-cart .cakecious-cart-mobile-sticky-checkout' );

			if ( ! $section ) {
				return;
			}

			var $bar = $section.querySelector( '.cakecious-cart-mobile-sticky-checkout-inner' ),
			    $button = $bar.querySelector( '.checkout-button' ),
			    $page = document.getElementById( 'page' ),
			    isScrolling = false;

			var updateStickyCheckoutButton = function() {
				if ( isScrolling ) {
					return;
				} else {
					isScrolling = true;
				}

				var windowScrollOffset = window.pageYOffset + window.innerHeight,
				    sectionScrollOffset = cakeciousHelper.getOffset( $section ).top;

				if ( windowScrollOffset < sectionScrollOffset ) {
					$bar.classList.add( 'cakecious-show' );
				} else {
					$bar.classList.remove( 'cakecious-show' );
				}

				isScrolling = false;
			}

			window.addEventListener( 'resize', updateStickyCheckoutButton, false );
			window.addEventListener( 'scroll', updateStickyCheckoutButton, false );
			window.addEventListener( 'load', updateStickyCheckoutButton, false );
			updateStickyCheckoutButton();
		},

		/**
		 * Function to init quick view.
		 */
		initQuickView: function() {
			var $popup = document.querySelector( '#product-quick-view' );

			if ( ! $popup ) {
				return;
			}
			
			var $content = $popup.querySelector( '.cakecious-product-quick-view-content' );

			// Toggle quick view.
			var handleQuickViewToggle = function( e ) {
				// Check target element.
				var $this = e.target.closest( 'ul.products li.product .cakecious-product-quick-view-button' );
				if ( ! $this ) return;

				var request = new XMLHttpRequest(),
					params = {
						action: 'cakecious_woocommerce_render_product_quick_view',
						product_id: $this.getAttribute( 'data-product_id' ),
					},
					queryString = Object.keys( params ).map( function( key ) {
						return key + '=' + params[ key ];
					}).join( '&' );

				request.open( 'GET', cakeciousProConfig.ajaxURL + '?' + queryString, true );
				request.addEventListener( 'load', function() {
					// Success!
					if ( request.status >= 200 && request.status < 400 ) {
						$content.innerHTML = request.responseText;

						var $gallery = $content.querySelector( '.woocommerce-product-gallery' );

						// Disable links
						var $links = Array.prototype.slice.call( $gallery.querySelectorAll( '.woocommerce-product-gallery__image > a' ) );
						$links.forEach(function( $link ) {
							$link.outerHTML = $link.innerHTML;
						});

						if ( 1 < $links.length && jQuery.fn.flexslider ) {
							jQuery( $gallery ).flexslider({
								selector: '.woocommerce-product-gallery__wrapper > .woocommerce-product-gallery__image',
								start: function( slider ) {
									// Show gallery
									$gallery.style.opacity = 1;

									// Show popup
									$popup.classList.add( 'cakecious-loaded' );
								},
								// default configurations from wc_single_product_params
								rtl: false,
								animation: 'slide',
								smoothHeight: false,
								directionNav: false,
								controlNav: true,
								slideshow: false,
								animationSpeed: 500,
								animationLoop: false,
								allowOneSlide: false,
							});
						} else {
							// Show gallery
							$gallery.style.opacity = 1;

							// Show popup
							$popup.classList.add( 'cakecious-loaded' );
						}

						// Initialize AJAX add to cart.
						cakeciousProWooCommerce.initAJAXAddToCart( $popup );

						// Initialize variations form (use jQuery).
						jQuery( '.variations_form' ).each( function() {
							jQuery( this ).wc_variation_form();
						});
					}
				});
				request.send();
			}
			document.addEventListener( 'click', handleQuickViewToggle, false );
			document.addEventListener( 'touchend', handleQuickViewToggle, false );

			// Close quick view.
			var handleQuickViewClose = function( e ) {
				// Check target element.
				var $this = e.target.closest( '.cakecious-product-quick-view .cakecious-popup-close' );
				if ( ! $this ) return;

				setTimeout(function(){
					$content.innerHTML = '';
					$popup.classList.remove( 'cakecious-loaded' );
				}, 500 );
			}
			document.addEventListener( 'click', handleQuickViewClose, false );
			document.addEventListener( 'touchend', handleQuickViewClose, false );

			// Double tap on mobile
			var handleFeaturedImageOnMobile = function( e ) {
				// Check target element.
				var $this = e.target.closest( '.cakecious-product-thumbnail a' );
				if ( ! $this ) return;

				// Get the wrapper.
				var $wrapper = $this.closest( '.cakecious-product-thumbnail-with-quick-view' );
				if ( ! $wrapper ) return;

				// Get the trigger button.
				var $button = $wrapper.querySelector( '.cakecious-product-quick-view-button' );
				if ( ! $button ) return;

				if ( $this !== document.activeElement && $button !== document.activeElement ) {
					document.activeElement.blur();
					$button.focus();

					e.preventDefault();
				}
			}
			document.addEventListener( 'touchend', handleFeaturedImageOnMobile, false );
		},

		/**
		 * Function to init AJAX Add to Cart.
		 */
		initAJAXAddToCart: function( $scope ) {
			if ( typeof wc_add_to_cart_params === 'undefined' ) {
				return;
			}

			$scope = ( typeof $scope !== 'undefined' ) ? $scope : document;

			var $forms = Array.prototype.slice.call( $scope.querySelectorAll( '.cakecious-product-add-to-cart.cakecious-ajax-add-to-cart-form form' ) );
			$forms.forEach(function( $form ) {
				if ( 'get' === $form.method.toLowerCase() ) {
					return;
				}

				var $button = $form.querySelector( '.single_add_to_cart_button' );

				if ( ! $button ) {
					return;
				}

				$form.addEventListener( 'submit', function( e ) {
					e.preventDefault();

					// Set button to loading state.
					$button.classList.remove( 'added' );
					$button.classList.add( 'loading' );

					// Setup our key value pair data.
					var dataPairs = {};

					// Loop through each field in the form.
					for ( var j = 0; j < $form.elements.length; j++ ) {
						var $field = $form.elements[j];

						// Don't process fields without a name and disabled fields.
						if ( ! $field.name || $field.disabled ) continue;

						// If a multi-select, get all selections.
						if ( 'select-multiple' === $field.type ) {
							for ( var k = 0; k < $field.options.length; k++ ) {
								if ( ! $field.options[k].selected ) continue;
								dataPairs[ $field.name ] = $field.options[k].value;
							}
						}

						// If a checkbox or radiobutton, check if it's selected.
						else if ( 'checkbox' === $field.type || 'radio' === $field.type ) {
							if ( $field.checked ) {
								dataPairs[ $field.name ] = $field.value;
							}
						}

						// Other fields.
						else {
							dataPairs[ $field.name ] = $field.value;
						}

					}

					// If variation_id is found, use variation ID.
					if ( 'undefined' !== typeof dataPairs['variation_id'] ) {
						dataPairs['product_id'] = dataPairs['variation_id'];
						delete dataPairs['variation_id'];
						delete dataPairs['add-to-cart'];
					}

					// If add-to-cart is found and no product_id is found, use the add-to-cart field value as product_id.
					else if ( 'undefined' !== typeof dataPairs['add-to-cart'] && 'undefined' === typeof dataPairs['product_id'] ) {
						dataPairs['product_id'] = dataPairs['add-to-cart'];
						delete dataPairs['add-to-cart'];
					}

					// Convert data key value pairs to query string.
					var data = Object.keys( dataPairs ).map( function( key ) {
						return key + '=' + dataPairs[key];
					}).join( '&' );

					// Trigger jQuery's "adding_to_cart" event.
					jQuery( document.body ).trigger( 'adding_to_cart', [ $button, data ] );

					// Setup the AJAX request.
					var request = new XMLHttpRequest();
					request.open( 'POST', wc_add_to_cart_params.wc_ajax_url.toString().replace( '%%endpoint%%', 'add_to_cart' ), true );
					request.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded' );

					// Set event handler when request is loaded.
					request.addEventListener( 'load', function() {
						$button.classList.add( 'added' );
						$button.classList.remove( 'loading' );

						// Get response.
						if ( request.status >= 200 && request.status < 400 ) {
							var response = JSON.parse( request.responseText );

							// If error occured, reload the page.
							if ( response.error && response.product_url ) {
								window.location = response.product_url;
								return;
							}

							// If redirect to cart option is enabled, redirect to cart page.
							if ( 'yes' === wc_add_to_cart_params.cart_redirect_after_add && 1 != wc_add_to_cart_params.is_cart ) {
								window.location = wc_add_to_cart_params.cart_url;
								return;
							}

							// Trigger jQuery's "added_to_cart" event.
							jQuery( document.body ).trigger( 'added_to_cart', [ response.fragments, response.cart_hash, jQuery( $button ) ] );
						}
					}, false );

					// Send the request.
					request.send( encodeURI( data ) );
				}, false );
			});
		},

		/**
		 * Function to init callback when AJAX Add to Cart succeed.
		 */
		initAJAXAddedToCartHighlight: function() {
			if ( document.body.classList.contains( 'cakecious-ajax-added-to-cart-open-header-cart' ) ) {
				jQuery( document.body ).on( 'wc_fragments_loaded', function() {
					var $headerCartToggle = document.querySelector( '.cakecious-header-shopping-cart .cakecious-toggle' );

					if ( ! $headerCartToggle ) {
						return;
					}

					if ( ! document.body.classList.contains( 'cakecious-has-popup-active' ) ) {
						$headerCartToggle.click();
					}
				});
			}
		},

		/**
		 * Function that calls all init functions.
		 */
		initAll: function() {
			window.cakeciousProWooCommerce.initCartFloatingCheckoutButton();
			window.cakeciousProWooCommerce.initQuickView();
			window.cakeciousProWooCommerce.initAJAXAddToCart();
			window.cakeciousProWooCommerce.initAJAXAddedToCartHighlight();
		},
	}

	document.addEventListener( 'DOMContentLoaded', window.cakeciousProWooCommerce.initAll, false );

})();