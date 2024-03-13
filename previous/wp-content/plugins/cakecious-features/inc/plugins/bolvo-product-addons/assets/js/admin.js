jQuery( function( $ ) {
	'use strict';

	var blv_cust_p_admin = {
		getAddonOptions: function() {
			var data = {
				security:  blv_cust_p_params.nonce.get_addon_options,
				action: 'blv_cust_p_get_addon_options',
			};

			return $.ajax( {
				type:    'POST',
				data:    data,
				url:     blv_cust_p_params.ajax_url
			} );
		},

		getAddonField: function() {
			var data = {
				security:  blv_cust_p_params.nonce.get_addon_field,
				action: 'blv_cust_p_get_addon_field',
			};

			return $.ajax( {
				type:    'POST',
				data:    data,
				url:     blv_cust_p_params.ajax_url
			} );
		},

		refresh: function() {
			var addons = $( '.blv-cust-p-addon' ).length;

			if ( 0 < addons ) {
				$( '.blv-cust-p-toolbar' ).addClass( 'blv-cust-p-has-addons' );
				$( '.blv-cust-p-addons' ).addClass( 'blv-cust-p-has-addons' );
			} else {
				$( '.blv-cust-p-toolbar' ).removeClass( 'blv-cust-p-has-addons' );
				$( '.blv-cust-p-addons' ).removeClass( 'blv-cust-p-has-addons' );
			}

			$( document.body ).trigger( 'init_tooltips' );
		},

		expandAllFields: function() {
			$( '#product_addons_data .blv-cust-p-addon' ).removeClass( 'closed' ).addClass( 'open' );
		},

		closeAllFields: function() {
			$( '#product_addons_data .blv-cust-p-addon' ).removeClass( 'open' ).addClass( 'closed' );
		},

		addonRowIndexes: function() {
			$( '.blv-cust-p-addons .blv-cust-p-addon' ).each( function( index, el ) {
				$( '.blv-cust-p-addon-position', el ).val( parseInt( $( el ).index( '.blv-cust-p-addons .blv-cust-p-addon' ) ) );
			} );
		},

		runFieldSortable: function() {
			$( '.blv-cust-p-addons' ).sortable( {
				items: '.blv-cust-p-addon',
				cursor: 'move',
				axis: 'y',
				handle: '.blv-cust-p-addon-header',
				scrollSensitivity: 40,
				helper: function( e, ui ) {
					return ui;
				},
				start: function( event, ui ) {
					ui.item.css( 'border-style', 'dashed' ).css( 'border-color', 'orange' );
				},
				stop: function( event, ui ) {
					ui.item.removeAttr( 'style' );
					blv_cust_p_admin.addonRowIndexes();
				}
			} );
		},

		runOptionSortable: function() {
			$( '.blv-cust-p-addon-content-options-container' ).sortable( {
				items: '.blv-cust-p-addon-option-row',
				cursor: 'move',
				axis: 'y',
				handle: '.blv-cust-p-addon-sort-handle',
				scrollSensitivity: 40,
				helper: function( e, ui ) {
					return ui;
				},
				start: function( event, ui ) {
					ui.item.css( 'border-style', 'dashed' ).css( 'border-width', '1px' ).css( 'border-color', 'orange' );
				},
				stop: function( event, ui ) {
					ui.item.removeAttr( 'style' );
					blv_cust_p_admin.addonRowIndexes();
				}
			} );
		},

		validateSettings: function( context ) {
			$( '.blv-cust-p-error-message' ).remove();
			$( '.updated' ).remove();

			var shouldReturn     = true,
				removeErrorBorder = true;

			// Loop through all addons to validate them.
			$( '.blv-cust-p-addons' ).find( '.blv-cust-p-addon' ).each( function( i ) {
				if ( 0 === $( this ).find( '.blv-cust-p-addon-content-name' ).val().length ) {
					$( this ).addClass( 'blv-cust-p-error' ).find( '.blv-cust-p-addon-content-name' ).addClass( 'blv-cust-p-error' );

					shouldReturn     = false;
					removeErrorBorder = false;
				} else {
					$( this ).find( '.blv-cust-p-addon-content-name' ).removeClass( 'blv-cust-p-error' );
				}

				var type = $( this ).find( '.blv-cust-p-addon-type-select' ).val();

				$( this ).find( '.blv-cust-p-addon-option-row' ).each( function() {
					if ( ( 'multiple_choice' === type || 'checkbox' === type ) && 0 === $( this ).find( '.blv-cust-p-addon-content-label input' ).val().length ) {

						$( this ).find( '.blv-cust-p-addon-content-label input' ).addClass( 'blv-cust-p-error' );
						$( this ).parents( '.blv-cust-p-addon' ).eq( 0 ).addClass( 'blv-cust-p-error' );

						shouldReturn     = false;
						removeErrorBorder = false;
					} else {
						$( this ).find( '.blv-cust-p-addon-content-label input' ).removeClass( 'blv-cust-p-error' );
					}
				} );

				if ( removeErrorBorder ) {
					$( this ).removeClass( 'blv-cust-p-error' );
				}
			} );

			if ( false === shouldReturn ) {
				var errorMessage = $( '<div class="notice notice-error blv-cust-p-error-message"><p>' + blv_cust_p_params.i18n.required_fields + '</p></div>' );

				if ( 'product' === context ) {
					$( '.blv-cust-p-addons' ).before( errorMessage );
				} else if ( 'global' === context ) {
					$( '.global-addons-form' ).before( errorMessage );
				}

				$( 'html, body' ).animate( {
					scrollTop: ( $( '.blv-cust-p-error-message' ).offset().top - 200 )
				}, 600 );
			}

			return shouldReturn;
		},

		init: function() {
			$( '.post-type-product' ).on( 'click', '#publishing-action input[name="save"]', function() {
				return blv_cust_p_admin.validateSettings( 'product' );
			} );

			$( '.product_page_addons' ).on( 'click', 'input[type="submit"]', function() {
				return blv_cust_p_admin.validateSettings( 'global' );
			} );

			$( '#product_addons_data' )
				.on( 'change', '.blv-cust-p-addon-content-name', function() {
					if ( $( this ).val() ) {
						$( this ).closest( '.blv-cust-p-addon' ).find( '.blv-cust-p-addon-name' ).text( $( this ).val() );
					} else {
						$( this ).closest( '.blv-cust-p-addon' ).find( '.blv-cust-p-addon-name' ).text( '' );
					}
				} )
				.on( 'keyup', '.blv-cust-p-addon-content-name, .blv-cust-p-addon-content-label input', function() {
					$( this ).removeClass( 'blv-cust-p-error' );
					$( '.blv-cust-p-error-message' ).remove();
				} )
				.on( 'change', 'select.blv-cust-p-addon-type-select', function( event ) {
					var selectedValue = $( this ).val(),
						parent        = $( this ).parents( '.blv-cust-p-addon' ),
						selectedName  = event.target.selectedOptions[0].innerHTML,
						restrictionName;

					// Update selected type label.
					parent.find( '.blv-cust-p-addon-header .blv-cust-p-addon-type' ).html( selectedName );

					// Default show title format select.
					parent.find( '.blv-cust-p-addon-main-settings-2 .blv-cust-p-col1' ).removeClass( 'full' );
					parent.find( '.blv-cust-p-addon-main-settings-2 .blv-cust-p-col2' ).removeClass( 'hide' ).addClass( 'show' );

					// Default hide images column.
					parent.find( '.blv-cust-p-addon-content-image' ).removeClass( 'show' ).addClass( 'hide' );
					parent.find( '.blv-cust-p-addon-content-label' ).addClass( 'full' );

					// Default restriction adjustment type.
					parent.find( '.blv-cust-p-addon-restrictions-select' ).removeClass( 'show' ).addClass( 'hide' );

					// Default hide display type select column.
					parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-1' ).removeClass( 'show' ).addClass( 'hide' );
					parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-2' ).removeClass( 'show' ).addClass( 'hide' );
					parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col1' ).addClass( 'full' );

					// Default options rows to be hidden.
					parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'show' ).addClass( 'hide' );
					parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'hide' ).addClass( 'show' );

					// Show required field checkbox.
					parent.find( '.blv-cust-p-addon-required-setting' ).removeClass( 'hide' ).addClass( 'show' );

					switch ( selectedValue ) {
						case 'multiple_choice':
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-1' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col1' ).removeClass( 'full' );

							parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'show' ).addClass( 'hide' );

							if ( 'images' === parent.find( '.blv-cust-p-addon-display-select' ).val() ) {
								parent.find( '.blv-cust-p-addon-content-image' ).removeClass( 'hide' ).addClass( 'show' );
								parent.find( '.blv-cust-p-addon-content-label' ).removeClass( 'full' );
							}
							break;
						case 'checkbox':
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-1' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col1' ).addClass( 'full' );
							parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-content-image' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-content-label' ).addClass( 'full' );
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'show' ).addClass( 'hide' );
							break;
						case 'custom_price':
							restrictionName = blv_cust_p_params.i18n.limit_price_range;
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-1' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col1' ).addClass( 'full' );
							parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-select' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'hide' ).addClass( 'show' );
							break;
						case 'input_multiplier':
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'hide' ).addClass( 'show' );
							restrictionName = blv_cust_p_params.i18n.limit_quantity_range;
							break;
						case 'custom_text':
							restrictionName = blv_cust_p_params.i18n.limit_character_length;

							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-2' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-select' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'hide' ).addClass( 'show' );

							if ( 'email' === parent.find( '.blv-cust-p-addon-restrictions-select' ).val() ) {
								parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'show' ).addClass( 'hide' );
							}
							break;
						case 'custom_textarea':
							restrictionName = blv_cust_p_params.i18n.limit_character_length;
							parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'hide' ).addClass( 'show' );
							break;
						case 'file_upload':
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'hide' ).addClass( 'show' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'show' ).addClass( 'hide' );
							break;
						case 'heading':
							parent.find( '.blv-cust-p-addon-required-setting' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-adjust-price-container' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-main-settings-2 .blv-cust-p-col1' ).addClass( 'full' );
							parent.find( '.blv-cust-p-addon-main-settings-2 .blv-cust-p-col2' ).removeClass( 'show' ).addClass( 'hide' );
							break;
						default:
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-1' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col2-2' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-main-settings-1 .blv-cust-p-col1' ).addClass( 'full' );

							parent.find( '.blv-cust-p-addon-content-option-rows' ).removeClass( 'show' ).addClass( 'hide' );
							parent.find( '.blv-cust-p-addon-content-non-option-rows' ).removeClass( 'hide' ).addClass( 'show' );
							restrictionName = blv_cust_p_params.i18n.restrictions;
							parent.find( '.blv-cust-p-addon-restrictions-container' ).removeClass( 'show' ).addClass( 'hide' );
							break;
					}

					parent.find( '.blv-cust-p-addon-restriction-name' ).html( restrictionName );

					// Count the number of options.  If one (or less), disable the remove option buttons
					var removeAddOnOptionButtons = $( this ).closest( '.blv-cust-p-addon' ).find( '.blv-cust-p-remove-option' );
					if ( 2 > removeAddOnOptionButtons.length ) {
						removeAddOnOptionButtons.attr( 'disabled', 'disabled' );
					} else {
						removeAddOnOptionButtons.removeAttr( 'disabled' );
					}
				} )
				.on( 'change', '.blv-cust-p-addon-display-select', function() {
					var selectedValue = $( this ).val(),
						parent        = $( this ).parents( '.blv-cust-p-addon' );

					if ( 'images' === selectedValue ) {
						parent.find( '.blv-cust-p-addon-content-image' ).removeClass( 'hide' ).addClass( 'show' );
						parent.find( '.blv-cust-p-addon-content-label' ).removeClass( 'full' );
					} else {
						parent.find( '.blv-cust-p-addon-content-image' ).removeClass( 'show' ).addClass( 'hide' );
						parent.find( '.blv-cust-p-addon-content-label' ).addClass( 'full' );
					}
				} )
				.on( 'click', 'button.blv-cust-p-add-option', function() {

					var loop   = $( this ).closest( '.blv-cust-p-addon' ).index( '.blv-cust-p-addon' ),
						parent = $( this ).parents( '.blv-cust-p-addon-content-option-rows' ).find( '.blv-cust-p-addon-content-options-container' );

					$.when( blv_cust_p_admin.getAddonOptions() ).then( function( html ) {
						var html = html.html;

						html = html.replace( /{loop}/g, loop );

						var selectedType = $( this ).parents( '.blv-cust-p-addon' ).find( '.blv-cust-p-addon-display-select' ).val();

						if ( 'images' === selectedType ) {
							html = html.replace( /blv-cust-p-addon-content-image hide/g, 'blv-cust-p-addon-content-image show' );
							html = html.replace( /blv-cust-p-addon-content-label full/g, 'blv-cust-p-addon-content-label' );
						}

						$( html ).appendTo( parent );

						$( 'select.blv-cust-p-addon-type-select' ).change();
					} );

					return false;
				} )
				.on( 'click', '.blv-cust-p-add-field', function() {
					var loop = $( '.blv-cust-p-addons .blv-cust-p-addon' ).length;

					$.when( blv_cust_p_admin.getAddonField() ).then( function( html ) {
						var html = html.html;

						html = html.replace( /{loop}/g, loop );

						// Replace class closed with open so it is expanded when added.
						html = html.replace( /closed/g, 'open' );

						$( '.blv-cust-p-addons' ).append( html );

						$( 'select.blv-cust-p-addon-type-select' ).change();

						blv_cust_p_admin.refresh();
						blv_cust_p_admin.runOptionSortable();

						// Show/hide special classes which may be in field html.
						var product_type    = $( 'select#product-type' ).val();
						$( '.hide_if_' + product_type ).hide();
						$( '.show_if_' + product_type ).show();
					} );

					return false;
				} )
				.on( 'click', '.blv-cust-p-remove-addon', function() {
					$( '.blv-cust-p-error-message' ).remove();

					var answer = confirm( blv_cust_p_params.i18n.confirm_remove_addon );

					if ( answer ) {
						var addon = $( this ).closest( '.blv-cust-p-addon' );
						$( addon ).find( 'input' ).val( '' );
						$( addon ).remove();
					}

					$( '.blv-cust-p-addons .blv-cust-p-addon' ).each( function( index, el ) {
						var this_index = index;

						$( this ).find( '.product_addon_position' ).val( this_index );
						$( this ).find( 'select, input, textarea' ).prop( 'name', function( i, val ) {
							var field_name = val.replace( /\[[0-9]+\]/g, '[' + this_index + ']' );

							return field_name;
						} );
					} );

					blv_cust_p_admin.refresh();

					return false;
				} )
				.on( 'click', '.blv-cust-p-remove-option', function() {
					var answer = confirm( blv_cust_p_params.i18n.confirm_remove_option );

					if ( answer ) {
						var typeSelect = $( this ).parents( '.blv-cust-p-addon-content' ).find( 'select.blv-cust-p-addon-type-select' );

						$( this ).parents( '.blv-cust-p-addon-option-row' ).remove();

						typeSelect.change();
					}

					return false;

				} )
				.on( 'click', '.blv-cust-p-expand-all', function( e ) {
					e.preventDefault();
					blv_cust_p_admin.expandAllFields();
				} )
				.on( 'click', '.blv-cust-p-close-all', function( e ) {
					e.preventDefault();
					blv_cust_p_admin.closeAllFields();
				} )
				.on( 'click', '.blv-cust-p-addon-header', function( e ) {
					e.preventDefault();
					var element = $( this ).parents( '.blv-cust-p-addon' );

					if ( element.hasClass( 'open' ) ) {
						element.removeClass( 'open' ).addClass( 'closed' );
					} else {
						element.removeClass( 'closed' ).addClass( 'open' );
					}
				} )
				.on( 'click', '.blv-cust-p-addon-description-enable', function() {
					if ( $( this ).is( ':checked' ) ) {
						$( this ).parents( '.blv-cust-p-addons-secondary-settings' ).find( '.blv-cust-p-addon-description' ).removeClass( 'hide' ).addClass( 'show' );
					} else {
						$( this ).parents( '.blv-cust-p-addons-secondary-settings' ).find( '.blv-cust-p-addon-description' ).removeClass( 'show' ).addClass( 'hide' );
					}
				} )
				.on( 'change', '.blv-cust-p-addon-option-price-type', function() {
					var selectedValue = $( this ).val();

					switch ( selectedValue ) {
						case 'flat_fee':
						case 'quantity_based':
							$( this ).parents( '.blv-cust-p-addon-content-price-type' ).removeClass( 'full' ).next( '.blv-cust-p-addon-content-price' ).eq(0).removeClass( 'hide' ).addClass( 'show' );
							break;
					}
				} )
				.on( 'click', '.blv-cust-p-addon-add-image', function() {
					var parent = $( this ).parent(),
						mediaFrame;

					// create the media frame
					mediaFrame = wp.media.frames.mediaFrame = wp.media( {

						title: blv_cust_p_params.i18n.add_image_swatch,

						button: {
							text: blv_cust_p_params.i18n.add_image
						},

						// only images
						library: {
							type: 'image'
						},

						multiple: false
					} );

					// After a file has been selected.
					mediaFrame.on( 'select', function() {
						var selection = mediaFrame.state().get( 'selection' );

						selection.map( function( attachment ) {

							attachment = attachment.toJSON();

							if ( attachment.id ) {
								var url = attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url;

								parent.find( '.blv-cust-p-addon-option-image-id' ).val( attachment.id );
								parent.find( '.blv-cust-p-addon-image-swatch img' ).prop( 'src', url );
								parent.find( '.blv-cust-p-addon-image-swatch' ).removeClass( 'hide' ).addClass( 'show' );
								parent.find( '.blv-cust-p-addon-add-image' ).removeClass( 'show' ).addClass( 'hide' );
								parent.find( '.dashicons-plus' ).removeClass( 'show' ).addClass( 'hide' );
							}
						} );
					} );

					// Open the modal frame.
					mediaFrame.open();
				} )
				.on( 'click', '.blv-cust-p-addon-image-swatch', function( e ) {
					e.preventDefault();

					var parent = $( this ).parent();

					parent.find( '.blv-cust-p-addon-option-image-id' ).val( '' );
					parent.find( '.blv-cust-p-addon-image-swatch img' ).prop( 'src', '' );
					parent.find( '.blv-cust-p-addon-image-swatch' ).removeClass( 'show' ).addClass( 'hide' );
					parent.find( '.blv-cust-p-addon-add-image' ).removeClass( 'hide' ).addClass( 'show' );
					parent.find( '.dashicons-plus' ).removeClass( 'hide' ).addClass( 'show' );
				} )
				.on( 'click', '.blv-cust-p-addon-restrictions', function() {
					if ( $( this ).is( ':checked' ) ) {
						$( this ).parents( '.blv-cust-p-addon-restrictions-container' ).find( '.blv-cust-p-addon-restrictions-settings' ).removeClass( 'hide' ).addClass( 'show' );
					} else {
						$( this ).parents( '.blv-cust-p-addon-restrictions-container' ).find( '.blv-cust-p-addon-restrictions-settings' ).removeClass( 'show' ).addClass( 'hide' );
					}
				} )
				.on( 'change', '.blv-cust-p-addon-restrictions-select', function() {
					var selectedValue = $( this ).val(),
						parent        = $( this ).parents( '.blv-cust-p-addon-restrictions-settings' );

					if ( 'email' === selectedValue ) {
						parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'show' ).addClass( 'hide' );
					} else {
						parent.find( '.blv-cust-p-addon-min-max' ).removeClass( 'hide' ).addClass( 'show' );
					}
				} )
				.on( 'click', '.blv-cust-p-addon-adjust-price', function() {
					if ( $( this ).is( ':checked' ) ) {
						$( this ).parents( '.blv-cust-p-addon-adjust-price-container' ).find( '.blv-cust-p-addon-adjust-price-settings' ).removeClass( 'hide' ).addClass( 'show' );
					} else {
						$( this ).parents( '.blv-cust-p-addon-adjust-price-container' ).find( '.blv-cust-p-addon-adjust-price-settings' ).removeClass( 'show' ).addClass( 'hide' );
					}
				} )
				.find( 'select.blv-cust-p-addon-type-select' ).change();

			// Import / Export
			$( '#product_addons_data' ).on( 'click', '.blv-cust-p-export-addons', function() {

				$( '#product_addons_data textarea.blv-cust-p-import-field' ).hide();
				$( '#product_addons_data textarea.blv-cust-p-export-field' ).slideToggle( '300', function() {
					$( this ).select();
				} );

				return false;
			} );

			$( '#product_addons_data' ).on( 'click', '.blv-cust-p-import-addons', function() {

				$( '#product_addons_data textarea.blv-cust-p-export-field' ).hide();
				$( '#product_addons_data textarea.blv-cust-p-import-field' ).slideToggle( '300', function() {
					$( this ).val('');
				} );

				return false;
			} );

			blv_cust_p_admin.runFieldSortable();
			blv_cust_p_admin.runOptionSortable();

			// Show / hide expand/close
			var total_add_ons = $( '.blv-cust-p-addons .blv-cust-p-addon' ).length;
			if ( total_add_ons > 1 ) {
				$( '.blv-cust-p-toolbar' ).show();
			}
		}
	};

	blv_cust_p_admin.init();
} );
