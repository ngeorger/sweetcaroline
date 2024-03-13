/**
 * Admin page javascript
 */
(function( $ ) {
	'use strict';

	var $window = $( window ),
	    $document = $( document ),
	    $body = $( 'body' );
	
	$(function() {

		// Repeater control
		// https://github.com/DubFriend/jquery.repeater/
		if ( $.fn.repeater ) {
			$( '.cakecious-admin-repeater-control' ).each(function() {
				var $repeater = $( this ),
				    options = $repeater.attr( 'data-config' );

				try {
					options = JSON.parse( options );
				} catch (e) {
					options = {};
				}

				$.extend( options, {
					ready: function() {
						$repeater.trigger( 'cakecious-admin-repeater.ready', this );
					},
					show: function() {
						$( this ).show();

						// Add a hook for custom callbacks.
						$repeater.trigger( 'cakecious-admin-repeater.itemAdded', this );
					},
				});

				$repeater.repeater( options );
			});
		}

	});
	
})( jQuery );