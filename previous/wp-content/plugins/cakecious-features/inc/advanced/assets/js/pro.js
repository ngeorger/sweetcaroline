(function() {
	'use strict';

	window.cakeciousPro = {

		$canvas: document.getElementById( 'canvas' ),
		$page: document.getElementById( 'page' ),

		/**
		 * Function to init sticky headers.
		 */
		initStickyHeaders: function() {
			var $desktopSection = document.querySelector( '.cakecious-header-main .cakecious-header-sticky' ),
			    $mobileSection = document.querySelector( '.cakecious-header-mobile .cakecious-header-sticky' ),
			    
			    lastScroll = 0,
			    lastPageHeight = 0,
			    isScrolling = false;
				
			var updateSticky = function( e ) {
				// Detect and get the active header.
				var $section, config;

				if ( cakeciousConfig.breakpoints.desktop <= window.innerWidth ) {
					$section = $desktopSection;
					config = cakeciousProConfig.stickyHeader;
				} else {
					$section = $mobileSection;
					config = cakeciousProConfig.stickyMobileHeader;
				}

				// Abort if there is no available sticky header section found.
				if ( ! $section ) {
					return;
				}

				// Abort if there is no configuration found.
				if ( ! config ) {
					return;
				}

				// Abort if sticky header section is not visible.
				if ( ! cakeciousHelper.isVisible( $section ) ) {
					return;
				}

				if ( isScrolling ) {
					return;
				} else {
					isScrolling = true;
				}

				// Get window scroll position.
				var pageOffset = cakeciousHelper.getOffset( window.cakeciousPro.$page ).top,
				    windowScroll = window.pageYOffset;

				// Get some variables.
				var $bar = $section.querySelector( '.cakecious-section-inner' ),
				    barNormalHeight = parseFloat( config.normalHeight ),
				    barStickyHeight = parseFloat( config.stickyHeight ),
				    barWidth = $section.classList.contains( 'cakecious-section-contained' ) ? Math.min( $section.offsetWidth, parseFloat( config.containedWidth ) ) : $section.offsetWidth,
				    barLeft = cakeciousHelper.getOffset( $section ).left + ( ( $section.offsetWidth - barWidth ) / 2 ),
				    
				    display = config.stickyDisplay,
				    sectionScrollOffset = cakeciousHelper.getOffset( $section ).top - pageOffset,

				    $logo = $bar.querySelector( '.cakecious-sticky-logo' ),
				    logoNormalWidth, logoStickyWidth, $logoImage;

				// Detect and get the logo.
				if ( $logo ) {
					logoNormalWidth = parseFloat( config.logoNormalWidth );
					logoStickyWidth = parseFloat( config.logoStickyWidth );
					$logoImage = $logo.querySelector( '.cakecious-logo-image' );
				}

				// Detect sticky behavior.
				switch ( display ) {
					case 'on-scroll-up':
						// Page height change.
						if ( lastPageHeight !== window.cakeciousPro.$page.offsetHeight ) {
							// Reset to normal state.
							$section.classList.remove( 'cakecious-sticky' );
							$section.classList.remove( 'cakecious-sticky-in-view' );
							$bar.style.cssText = '';
						}
						// Scrolled down.
						else if ( windowScroll > lastScroll ) {
							if ( $section.classList.contains( 'cakecious-sticky' ) ) {
								$section.classList.remove( 'cakecious-sticky' );
								$bar.style.top = ( lastScroll + pageOffset - cakeciousHelper.getOffset( $section ).top ).toString() + 'px';
								$bar.style.left = 0;
								$bar.style.position = 'absolute';
								$bar.style.width = '100%';
								$bar.style.height = barStickyHeight.toString() + 'px';

								if ( $logoImage ) {
									$logoImage.style.width = logoStickyWidth.toString() + 'px';
								}
							}

							if ( $section.classList.contains( 'cakecious-sticky-in-view' ) ) {
								if ( windowScroll > cakeciousHelper.getOffset( $bar ).top + barStickyHeight ) {
									$section.classList.remove( 'cakecious-sticky-in-view' );
								}
							}
						}
						// Scrolled up.
						else if ( windowScroll < lastScroll ) {
							if ( $section.classList.contains( 'cakecious-sticky' ) ) {
								if ( windowScroll <= sectionScrollOffset ) {
									$section.classList.remove( 'cakecious-sticky' );
									$section.classList.remove( 'cakecious-sticky-in-view' );
									$bar.style.top = null;
									$bar.style.left = null;
									$bar.style.position = null;
									$bar.style.height = null;
									$bar.style.width = null;

									if ( $logoImage ) {
										$logoImage.style.width = null;
									}
								}
								else if ( windowScroll < sectionScrollOffset + ( barNormalHeight - barStickyHeight ) ) {
									var barCurrentHeight = Math.max( barStickyHeight, barNormalHeight - ( windowScroll - sectionScrollOffset ) );

									$bar.style.height = barCurrentHeight.toString() + 'px';

									if ( $logoImage ) {
										var progress = barNormalHeight !== barStickyHeight ? ( barNormalHeight - barCurrentHeight ) / ( barNormalHeight - barStickyHeight ) : 1,
										    logoCurrentWidth = logoNormalWidth - ( progress * ( logoNormalWidth - logoStickyWidth ) );

										$logoImage.style.width = logoCurrentWidth.toString() + 'px';
									}
								}
							}
							else if ( $section.classList.contains( 'cakecious-sticky-in-view' ) ) {
								if ( windowScroll < cakeciousHelper.getOffset( $bar ).top - pageOffset ) {
									$section.classList.add( 'cakecious-sticky' );
									$bar.style.top = pageOffset.toString() + 'px';
									$bar.style.left = barLeft.toString() + 'px';
									$bar.style.position = null;
									$bar.style.width = barWidth.toString() + 'px';
									$bar.style.height = barStickyHeight.toString() + 'px';

									if ( $logoImage ) {
										$logoImage.style.width = logoStickyWidth.toString() + 'px';
									}
								}
							}
							else {
								if ( windowScroll > sectionScrollOffset + barNormalHeight ) {
									$section.classList.add( 'cakecious-sticky-in-view' );
									$bar.style.top = ( windowScroll - barStickyHeight - sectionScrollOffset ).toString() + 'px';
									$bar.style.left = 0;
									$bar.style.position = 'absolute';
									$bar.style.width = '100%';
									$bar.style.height = barStickyHeight.toString() + 'px';

									if ( $logoImage ) {
										$logoImage.style.width = logoStickyWidth.toString() + 'px';
									}
								}									
							}
						}
						break;

					case 'fixed':
						// Inside sticky area.
						if ( windowScroll > sectionScrollOffset ) {
							var barCurrentHeight = Math.max( barStickyHeight, barNormalHeight - ( windowScroll - sectionScrollOffset ) );

							$section.classList.add( 'cakecious-sticky' );
							$section.classList.add( 'cakecious-sticky-in-view' );
							$bar.style.top = pageOffset.toString() + 'px';
							$bar.style.left = barLeft.toString() + 'px';
							$bar.style.width = barWidth.toString() + 'px';
							$bar.style.height = barCurrentHeight.toString() + 'px';

							if ( $logoImage ) {
								var progress = barNormalHeight !== barStickyHeight ? ( barNormalHeight - barCurrentHeight ) / ( barNormalHeight - barStickyHeight ) : 1,
								    logoCurrentWidth = logoNormalWidth - ( progress * ( logoNormalWidth - logoStickyWidth ) );

								$logoImage.style.width = logoCurrentWidth.toString() + 'px';
							}
						}
						// Outside sticky area.
						else {
							// Remove sticky mode if the section is sticky.
							if ( $section.classList.contains( 'cakecious-sticky' ) ) {
								$section.classList.remove( 'cakecious-sticky' );
								$section.classList.remove( 'cakecious-sticky-in-view' );
								$bar.style.top = null;
								$bar.style.height = null;
								$bar.style.left = null;
								$bar.style.width = null;

								if ( $logoImage ) {
									$logoImage.style.width = null;
								}
							}
						}
						break;
				}

				// Update the "last run" information.
				lastScroll = windowScroll;
				lastPageHeight = window.cakeciousPro.$page.offsetHeight;
				isScrolling = false;
			};

			if ( $desktopSection || $mobileSection ) {
				window.addEventListener( 'resize', updateSticky, false );
				window.addEventListener( 'scroll', updateSticky, false );
				window.addEventListener( 'load', updateSticky, false );
				updateSticky();
			}
		},

		/**
		 * Function to init sticky sidebar.
		 */
		initStickySidebar: function() {
			var $sidebar = document.querySelector( '#secondary.cakecious-sidebar-sticky' );

			// Abort if there is no sticky header found in the page.
			if ( ! $sidebar ) {
				return;
			}

			// Define elements and variables
			var $el = $sidebar.querySelector( '.sidebar-inner' ),
			    stickySpacingTop = 0,
			    stickySpacingBottom = 0,
			    anchor = 'top',

			    lastScroll = 0;

			// Set values from localize script.
			if ( 'undefined' !== typeof cakeciousProConfig.stickySidebar ) {
				stickySpacingTop = parseFloat( cakeciousProConfig.stickySidebar.spacingTop ) || 0;
				stickySpacingBottom = parseFloat( cakeciousProConfig.stickySidebar.spacingBottom ) || 0;
				anchor = cakeciousProConfig.stickySidebar.anchor || 'top';
			}

			// Main function to update sticky position.
			var updateSticky = function( e ) {
				// Reset inline styles.
				resetStyles();

				// Abort if it's in responsive mode (small screen), because Sticky Sidebar only works on Desktop view
				if ( window.innerWidth < cakeciousConfig.breakpoints.desktop ) {
					return;
				}

				// Define variables.
				var yStart, yStop;

				// Get window scroll position.
				var pageOffset = cakeciousHelper.getOffset( window.cakeciousPro.$page ).top,
				    windowScroll = window.pageYOffset;

				// Calculate total top offset from window's top 
				var totalStickyOffsetTop = pageOffset + stickySpacingTop;
				
				// If sticky header (desktop) is found on the page, add sticky header height to total top offset.
				if ( cakeciousProConfig.stickyHeader ) {
					totalStickyOffsetTop = totalStickyOffsetTop + cakeciousProConfig.stickyHeader.stickyHeight;
				}

				// Set width.
				$el.style.width = $sidebar.offsetWidth + 'px';

				// If sidebar + offset is shorter than screen height, always use "top" anchor.
				if ( cakeciousHelper.getOffset( $el ).top + $el.offsetHeight < window.innerHeight ) {
					anchor = 'top';
				}

				switch ( anchor ) {
					case 'bottom':
						// Set the top offset where the sticky mode will start.
						yStart = cakeciousHelper.getOffset( $el ).top + $el.offsetHeight - window.innerHeight + stickySpacingBottom;

						// Set the top offset where the sticky mode will stop.
						yStop = cakeciousHelper.getOffset( $sidebar ).top + $sidebar.offsetHeight - window.innerHeight + stickySpacingBottom;

						console.log( yStart );

						if ( windowScroll >= yStart ) {
							$sidebar.classList.add( 'cakecious-sticky' );

							if ( windowScroll >= yStop ) {
								$el.style.position = 'absolute';
								$el.style.bottom = 0;
							} else {
								$el.style.position = 'fixed';
								$el.style.bottom = stickySpacingBottom + 'px';
							}
						} else {
							$sidebar.classList.remove( 'cakecious-sticky' );
						}
						break;

					case 'top':
					default:
						// Set the top offset where the sticky mode will start.
						yStart = cakeciousHelper.getOffset( $sidebar ).top - totalStickyOffsetTop;

						// Set the top offset where the sticky mode will stop.
						yStop = cakeciousHelper.getOffset( $sidebar ).top + $sidebar.offsetHeight - $el.offsetHeight - totalStickyOffsetTop;

						if ( windowScroll >= yStart ) {
							$sidebar.classList.add( 'cakecious-sticky' );

							if ( windowScroll >= yStop ) {
								$el.style.position = 'absolute';
								$el.style.bottom = 0;
							} else {
								$el.style.position = 'fixed';
								$el.style.top = totalStickyOffsetTop + 'px';
							}
						} else {
							$sidebar.classList.remove( 'cakecious-sticky' );
						}
						break;
				}
			}

			// Function to reset sidebar inner styles.
			var resetStyles = function() {
				$el.style.position = null;
				$el.style.width = null;
				$el.style.top = null;
				$el.style.bottom = null;
			}

			// Define event triggers.
			window.addEventListener( 'resize', updateSticky, false );
			window.addEventListener( 'scroll', updateSticky, false );
			window.addEventListener( 'load', updateSticky, false );
			updateSticky();
		},

		/**
		 * Function to init featured posts.
		 */
		initFeaturedPosts: function() {
			var $featuredPosts = document.getElementById( 'cakecious-featured-posts' );

			if ( ! $featuredPosts ) {
				return;
			}

			// Slider and carousel (using tiny slider)
			if ( $featuredPosts.classList.contains( 'cakecious-featured-posts-tiny-slider' ) ) {
				// Abort if tiny slider is not enqueued.
				if ( 'undefined' === typeof tns ) {
					return;
				}

				// Abort if there is no JS configuration found.
				if ( 'undefined' === typeof cakeciousProConfig.blogFeaturedPosts.tinySlider ) {
					return;
				}

				var args = JSON.parse( cakeciousProConfig.blogFeaturedPosts.tinySlider );

				args.container = $featuredPosts.querySelector( '.cakecious-featured-posts-list' );
				args.controlsContainer = $featuredPosts.querySelector( '.cakecious-featured-posts-navigation' );
				args.nav = false;
				args.speed = 250;
				args.autoplayButtonOutput = false;

				var $featuredPostsSlider = tns( args );
			}
		},

		/**
		 * Function that calls all init functions.
		 */
		initAll: function() {
			window.cakeciousPro.initStickyHeaders();
			window.cakeciousPro.initStickySidebar();
			window.cakeciousPro.initFeaturedPosts();
		},
	}

	document.addEventListener( 'DOMContentLoaded', window.cakeciousPro.initAll, false );

})();