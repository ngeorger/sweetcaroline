/**
 * Theme Customizer pane javascripts
 */
(function( exports, $ ) {
	'use strict';

	var $window = $( window ),
	    $document = $( document ),
	    $body = $( 'body' );

	/**
	 * API on ready event handlers
	 *
	 * All handlers need to be inside the 'ready' state.
	 */
	wp.customize.bind( 'ready', function() {
		/**
		 * Adjust Footer Widgets columns width controls
		 */
		var setFooterColumnsWidth = function( value ) {
			for ( var i = 1; i <= 6; i++ ) {
				var control = wp.customize.control( 'footer_widgets_bar_column_' + i + '_width' );

				if ( undefined === control ) {
					continue;
				}

				if ( i <= value ) {
					wp.customize.control( 'footer_widgets_bar_column_' + i + '_width' ).container.css({
						width: ( Math.floor( 100 / parseInt( value ) * 100 ) / 100 ).toString() + '%',
						clear: 'none',
						display: 'list-item',
					});
				} else {
					wp.customize.control( 'footer_widgets_bar_column_' + i + '_width' ).container.css({
						width: null,
						clear: null,
						display: 'none',
					});
				}
			}
		}
		wp.customize( 'footer_widgets_bar' ).bind( setFooterColumnsWidth );
		wp.customize.control( 'footer_elements' ).container.on( 'init', function() {
			setFooterColumnsWidth( wp.customize( 'footer_widgets_bar' ).get() );
		});

		/**
		 * Preloader Screen preview
		 */
		var forcePreviewPreloaderScreen = function() {
			if ( 'undefined' === typeof wp.customize.previewer.preview ) {
				return;
			}

			var $preview_body = wp.customize.previewer.preview.iframe.contents().find( 'body' );

			if ( wp.customize.section( 'cakecious_section_preloader_screen' ).expanded() && wp.customize( 'preloader_screen' ).get() ) {
				$preview_body.addClass( 'cakecious-preloader-screen-preview' );
			} else {
				$preview_body.removeClass( 'cakecious-preloader-screen-preview' );
			}
		}
		wp.customize.section( 'cakecious_section_preloader_screen', function( $section ) {
			$section.expanded.bind( forcePreviewPreloaderScreen );
		});
		wp.customize.previewer.bind( 'preloader-screen-preview', forcePreviewPreloaderScreen );
	});

})( wp, jQuery );