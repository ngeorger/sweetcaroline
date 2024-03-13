/**
 * Admin page javascript
 */
(function( $ ) {
	'use strict';

	var $window = $( window ),
	    $document = $( document ),
	    $body = $( 'body' );
	
	$(function() {

		/**
		 * Admin Fields
		 */

		// Upload control
		$body.on( 'click', '.cakecious-admin-upload-control-button', function( e ) {
			e.preventDefault();

			var $button = $( this ),
			    $control = $button.closest( '.cakecious-admin-upload-control' ),
			    $input = $control.find( 'input' ),
			    frame = $control.data( 'wpmedia' );

			// Check if media lirbrary frame is already declared.
			if ( frame ) {
				frame.open();
				return;
			}

			// Declare media library frame.
			var frameOptions = {
				title: $control.attr( 'data-title' ),
				button: {
					text: $control.attr( 'data-button' ),
				},
				multiple: false,
			};

			if ( '' !== $control.attr( 'data-library' ) ) {
				frameOptions.library = {
					type: $control.attr( 'data-library' ).split( ',' ),
				};
			}

			frame = wp.media.frames.file_frame = wp.media( frameOptions );

			// Handle Choose button
			frame.on( 'select', function() {
				var file = frame.state().get( 'selection' ).first().toJSON();
				$input.val( file.url );
			});

			frame.open();

			$control.data( 'wpmedia', frame );
		});

		if ( $.fn.select2 ) {
			$( '.cakecious-admin-multiselect-control' ).select2();
		}

		// Color control
		if ( $.fn.wpColorPicker ) {
			$( '.cakecious-admin-color-control' ).find( 'input' ).wpColorPicker();
		}

		// Dependency fields
		$body.on( 'change', '.cakecious-admin-dependent-field', function() {
			var $field = $( this ),
			    $settings = $( '[data-dependency="' + $field.attr( 'name' ) + '"]' ),
			    value = this.value;

			$settings.hide();
			$settings.each(function() {
				var $setting = $( this ),
				    requirements = $setting.attr( 'data-value' ).split( ',' ),
				    found;

				found = -1 < requirements.indexOf( value ) ? true : false;

				switch ( $setting.attr( 'data-operator' ) ) {
					case '!=':
						if ( ! found ) $setting.show();
						break;

					default:
						if ( found ) $setting.show();
						break;
				}
			});
		});
		$( '.cakecious-admin-dependent-field' ).trigger( 'change' );

		/**
		 * Metabox tabs
		 */

		$( '.cakecious-admin-metabox' ).each(function() {
			var $metabox = $( this ),
			    $navigation = $metabox.find( '.cakecious-admin-metabox-nav' ),
			    $panels = $metabox.find( '.cakecious-admin-metabox-panels' );

			$navigation.on( 'click', '.cakecious-admin-metabox-nav-item a', function( e ) {
				e.preventDefault();

				var $link = $( this ),
				    $target = $panels.children( $link.attr( 'href' ) );

				if ( $target && ! $target.hasClass( 'active' ) ) {
					$navigation.children( '.cakecious-admin-metabox-nav-item.active' ).removeClass( 'active' );
					$link.parent( '.cakecious-admin-metabox-nav-item' ).addClass( 'active' );

					$panels.children( '.cakecious-admin-metabox-panel.active' ).removeClass( 'active' );
					$target.addClass( 'active' );
				}
			});

			$metabox.trigger( 'cakecious-admin-metabox.ready', this );
		});

		/**
		 * Rating notice close button
		 */

		$( '.cakecious-rating-notice' ).on( 'click', '.cakecious-rating-notice-close', function( e ) {
			var $link = $( this ),
			    $notice = $link.closest( '.cakecious-rating-notice' ),
			    repeat = $link.attr( 'data-cakecious-rating-notice-repeat' );

			// Run AJAX to set data after closing the notice.
			$.ajax({
				method: 'POST',
				dataType: 'JSON',
				url: ajaxurl,
				data: {
					action: 'cakecious_rating_notice_close',
					repeat_after: repeat,
				},
			});

			// Always remove the notice on current page.
			$notice.fadeTo( 100, 0, function() {
				$notice.slideUp( 100, function() {
					$notice.remove();
				});
			});
		});

		/**
		 * Install "Cakecious Sites Import" plugin.
		 */

		$( '.cakecious-admin-install-sites-import-plugin-button' ).on( 'click', function( e ) {
			var $button = $( this );

			$button.prop( 'disabled', 'disabled' );
			$button.addClass( 'disabled' );
			$button.html( CakeciousAdminData.strings.installing );

			return $.ajax({
				method: 'POST',
				dataType: 'JSON',
				url: ajaxurl + '?do=cakecious_install_sites_import_plugin',
				cache: false,
				data: {
					action: 'cakecious_install_sites_import_plugin',
					plugin_slug: 'cakecious-sites-import',
					_ajax_nonce: CakeciousAdminData.ajax_nonce,
				},
			})
			.done(function( response, status, XHR ) {
				if ( response.success ) {
					$button.html( CakeciousAdminData.strings.redirecting_to_demo_list );

					window.location = CakeciousAdminData.sitesImportPageURL;
				} else {
					alert( CakeciousAdminData.strings.error_installing_plugin );
				}
			});
		});
	});
	
})( jQuery );