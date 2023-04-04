/**
 * Theme Customizer custom controls handlers
 */
(function( exports, $ ) {
	'use strict';

	var $window = $( window ),
	    $document = $( document ),
	    $body = $( 'body' );

	if ( undefined == getUrlParameter ) {
		var getUrlParameter = function( name, url ) {
			url = decodeURI( url );
			name = name.replace( /[\[]/, '\\[' ).replace( /[\]]/, '\\]' );

			var regex = new RegExp( '[\\?&]' + name + '=([^&#]*)' ),
			    results = regex.exec( url );

			return results === null ? '' : decodeURIComponent( results[1].replace( /\+/g, ' ' ) );
		};
	}

	/**
	 * Improve input type number behavior for better UX
	 */
	// Trigger change on all number input fields when "enter" key is pressed.
	var inputNumberValidation = function( e ) {
		var input = e.target;

		if ( '' === input.value ) {
			$( input ).trigger( 'change' );
			return;
		}
		
		// Validate maximum value.
		if ( '' !== input.max ) {
			input.value = Math.min( Number( input.value ), Number( input.max ) );
		}

		// Validate minimum value.
		if ( '' !== input.min ) {
			input.value = Math.max( Number( input.value ), Number( input.min ) );
		}

		$( input ).trigger( 'change' );
	}

	$( '#customize-controls' ).on( 'blur', 'input[type="number"]', inputNumberValidation );
	$( '#customize-controls' ).on( 'keyup', 'input[type="number"]', function( e ) {
		if ( 13 == e.which ) {
			inputNumberValidation( e );
		}
	});
	// Disable mousewheel scroll when input is in focus.
	$( '#customize-controls' ).on( 'focus', 'input[type="number"]', function( e ) {
		$( this ).on( 'mousewheel.disableScroll', function ( e ) { e.preventDefault(); });
	});
	$( '#customize-controls' ).on( 'blur', 'input[type="number"]', function( e ) {
		$( this ).off( 'mousewheel.disableScroll' );
	});

	/**
	 * Contentless sections like: cakecious-section-spacer, cakecious-section-pro-teaser, cakecious-section-pro-link
	 */
	wp.customize.sectionConstructor['cakecious-section-pro-teaser'] =
	wp.customize.sectionConstructor['cakecious-section-pro-link'] =
	wp.customize.sectionConstructor['cakecious-section-pro-locked'] =
	wp.customize.sectionConstructor['cakecious-section-spacer'] = wp.customize.Section.extend({
		// No events for this type of section.
		attachEvents: function () {},
		// Always make the section active.
		isContextuallyActive: function () {
			return true;
		}
	});

	/**
	 * Cakecious base control
	 * 
	 * ref:
	 * - https://github.com/aristath/kirki/blob/develop/controls/js/src/dynamic-control.js
	 * - https://github.com/xwp/wp-customize-posts/blob/develop/js/customize-dynamic-control.js
	 */
	wp.customize.CakeciousControl = wp.customize.Control.extend({
		initialize: function( id, options ) {
			var control = this,
			    args    = options || {};

			args.params = args.params || {};
			if ( ! args.params.type ) {
				args.params.type = 'cakecious-base';
			}
			if ( ! args.params.content ) {
				args.params.content = jQuery( '<li></li>' );
				args.params.content.attr( 'id', 'customize-control-' + id.replace( /]/g, '' ).replace( /\[/g, '-' ) );
				args.params.content.attr( 'class', 'customize-control customize-control-' + args.params.type );
			}

			control.propertyElements = [];
			wp.customize.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * Add bidirectional data binding links between inputs and the setting(s).
		 *
		 * This is copied from wp.customize.Control.prototype.initialize(). It
		 * should be changed in Core to be applied once the control is embedded.
		 *
		 * @private
		 * @returns {null}
		 */
		_setUpSettingRootLinks: function() {
			var control = this,
				nodes   = control.container.find( '[data-customize-setting-link]' );

			nodes.each(function() {
				var node = jQuery( this );

				wp.customize( node.data( 'customizeSettingLink' ), function( setting ) {
					var element = new wp.customize.Element( node );
					control.elements.push( element );
					element.sync( setting );
					element.set( setting() );
				});
			});
		},

		/**
		 * Add bidirectional data binding links between inputs and the setting properties.
		 *
		 * @private
		 * @returns {null}
		 */
		_setUpSettingPropertyLinks: function() {
			var control = this,
				nodes;

			if ( ! control.setting ) {
				return;
			}

			nodes = control.container.find( '[data-customize-setting-property-link]' );

			nodes.each(function() {
				var node = jQuery( this ),
					element,
					propertyName = node.data( 'customizeSettingPropertyLink' );

				element = new wp.customize.Element( node );
				control.propertyElements.push( element );
				element.set( control.setting()[ propertyName ] );

				element.bind(function( newPropertyValue ) {
					var newSetting = control.setting();
					if ( newPropertyValue === newSetting[ propertyName ] ) {
						return;
					}
					newSetting = _.clone( newSetting );
					newSetting[ propertyName ] = newPropertyValue;
					control.setting.set( newSetting );
				});
				control.setting.bind(function( newValue ) {
					if ( newValue[ propertyName ] !== element.get() ) {
						element.set( newValue[ propertyName ] );
					}
				});
			});
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this;

			control._setUpSettingRootLinks();
			control._setUpSettingPropertyLinks();

			wp.customize.Control.prototype.ready.call( control );

			control.deferred.embedded.done(function() {});
		},

		/**
		 * Embed the control in the document.
		 *
		 * Override the embed() method to do nothing,
		 * so that the control isn't embedded on load,
		 * unless the containing section is already expanded.
		 *
		 * @returns {null}
		 */
		embed: function() {
			var control   = this,
				sectionId = control.section();

			if ( ! sectionId ) {
				return;
			}

			wp.customize.section( sectionId, function( section ) {
				if ( section.expanded() || wp.customize.settings.autofocus.control === control.id ) {
					control.actuallyEmbed();
				} else {
					section.expanded.bind(function( expanded ) {
						if ( expanded ) {
							control.actuallyEmbed();
						}
					});
				}
			});
		},

		/**
		 * Deferred embedding of control when actually
		 *
		 * This function is called in Section.onChangeExpanded() so the control
		 * will only get embedded when the Section is first expanded.
		 *
		 * @returns {null}
		 */
		actuallyEmbed: function() {
			var control = this;
			if ( 'resolved' === control.deferred.embedded.state() ) {
				return;
			}
			control.renderContent();
			control.deferred.embedded.resolve(); // This triggers control.ready().

			// Fire event after control is initialized.
			control.container.trigger( 'init' );
		},

		/**
		 * This is not working with autofocus.
		 *
		 * @param {object} [args] Args.
		 * @returns {null}
		 */
		focus: function( args ) {
			var control = this;
			control.actuallyEmbed();
			wp.customize.Control.prototype.focus.call( control, args );
		},
	});
	wp.customize.controlConstructor['cakecious-base'] = wp.customize.CakeciousControl;

	/**
	 * Cakecious color control
	 */
	wp.customize.controlConstructor['cakecious-color'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this,
				$picker = control.container.find( '.color-picker' );

			$picker.alphaColorPicker({
				change: function() {
					control.setting.set( $picker.wpColorPicker( 'color' ) );
				},
				clear: function() {
					control.setting.set( '' );
				},
			});
		}
	});

	/**
	 * Cakecious shadow control
	 */
	wp.customize.controlConstructor['cakecious-shadow'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			// Shortcut so that we don't have to use _.bind every time we add a callback.
			_.bindAll( control, 'updateValue' );

			control.container.find( '.cakecious-shadow-color .color-picker' ).alphaColorPicker({
				change: control.updateValue,
				clear: control.updateValue,
			});

			control.container.on( 'change blur', '.cakecious-shadow-input', control.updateValue );
		},

		updateValue: function( e ) {
			var values = this.container.find( 'input.cakecious-shadow-input' ).map(function( i, el ) {
				var $input = $( el );

				if ( $input.hasClass( 'color-picker' ) ) {
					return '' === $input.wpColorPicker( 'color' ) ? 'rgba(0,0,0,0)' : $input.wpColorPicker( 'color' );
				} else if ( $input.is( 'input' ) ) {
					return '' === $input.val() ? '0' : $input.val().toString() + 'px';
				} else {
					return $input.val();
				}
			}).get();

			values.push( this.container.find( 'select.cakecious-shadow-input' ).val() );

			this.setting( values.join( ' ' ) );
		},
	});

	/**
	 * Cakecious dimension control
	 */
	wp.customize.controlConstructor['cakecious-dimension'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			// Shortcut so that we don't have to use _.bind every time we add a callback.
			_.bindAll( control, 'onChangeUnit', 'onChangeNumber' );

			control.container.on( 'change', '.cakecious-dimension-unit', control.onChangeUnit );
			control.container.on( 'change blur', '.cakecious-dimension-input', control.onChangeNumber );
		},

		onChangeUnit: function( e ) {
			var $unit = $( e.target ),
			    $scope = $( e.target ).closest( '.cakecious-dimension-fieldset' ),
			    $input = $scope.find( '.cakecious-dimension-input' );

			$input.attr( 'min', this.params.units[ $unit.val() ].min );
			$input.attr( 'max', this.params.units[ $unit.val() ].max );
			$input.attr( 'step', this.params.units[ $unit.val() ].step );

			this.settings[ $scope.attr( 'data-settingkey' ) ].set( '' );
		},

		onChangeNumber: function( e ) {
			var $input = $( e.target ),
			    $scope = $( e.target ).closest( '.cakecious-dimension-fieldset' ),
			    $unit = $scope.find( '.cakecious-dimension-unit' );

			this.settings[ $scope.attr( 'data-settingkey' ) ].set( '' === $input.val() ? '' : $input.val().toString() + $unit.val().toString() );
		},
	});

	/**
	 * Cakecious slider control
	 */
	wp.customize.controlConstructor['cakecious-slider'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			// Shortcut so that we don't have to use _.bind every time we add a callback.
			_.bindAll( control, 'onChangeUnit', 'onChangeNumber', 'onChangeSlider' );

			control.container.on( 'change', '.cakecious-slider-unit', control.onChangeUnit );
			control.container.on( 'change blur', '.cakecious-slider-input', control.onChangeNumber );
			control.container.on( 'input', '.cakecious-slider-range', control.onChangeSlider );
		},

		onChangeUnit: function( e ) {
			var $unit = $( e.target ),
			    $scope = $( e.target ).closest( '.cakecious-slider-fieldset' ),
			    $input = $scope.find( '.cakecious-slider-input' ),
			    $range = $scope.find( '.cakecious-slider-range' ),
			    $value = $scope.find( '.cakecious-slider-value' );

			$input.attr( 'min', this.params.units[ $unit.val() ].min );
			$input.attr( 'max', this.params.units[ $unit.val() ].max );
			$input.attr( 'step', this.params.units[ $unit.val() ].step );

			$range.attr( 'min', this.params.units[ $unit.val() ].min );
			$range.attr( 'max', this.params.units[ $unit.val() ].max );
			$range.attr( 'step', this.params.units[ $unit.val() ].step );

			$value.val( '' ).trigger( 'change' );
		},

		onChangeNumber: function( e ) {
			var $input = $( e.target ),
			    $scope = $( e.target ).closest( '.cakecious-slider-fieldset' ),
			    $unit = $scope.find( '.cakecious-slider-unit' ),
			    $range = $scope.find( '.cakecious-slider-range' ),
			    $value = $scope.find( '.cakecious-slider-value' );

			$range.val( $input.val() );
			
			var value = '' === $input.val() ? '' : $input.val().toString() + $unit.val().toString();

			$value.val( value ).trigger( 'change' );
		},

		onChangeSlider: function( e ) {
			var $range = $( e.target ),
			    $scope = $( e.target ).closest( '.cakecious-slider-fieldset' ),
			    $unit = $scope.find( '.cakecious-slider-unit' ),
			    $input = $scope.find( '.cakecious-slider-input' ),
			    $value = $scope.find( '.cakecious-slider-value' );

			$input.val( $range.val() );
			
			var value = '' === $input.val() ? '' : $input.val().toString() + $unit.val().toString();

			$value.val( value ).trigger( 'change' );
		},
	});
	
	/**
	 * Cakecious dimensions control
	 */
	wp.customize.controlConstructor['cakecious-dimensions'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			control.container.find( '.cakecious-dimensions-fieldset' ).each(function( i, el ) {
				var $el = $( el ),
				    $unit = $el.find( '.cakecious-dimensions-unit' ),
				    $link = $el.find( '.cakecious-dimensions-link' ),
				    $unlink = $el.find( '.cakecious-dimensions-unlink' ),
				    $inputs = $el.find( '.cakecious-dimensions-input' ),
				    $value = $el.find( '.cakecious-dimensions-value' );

				$unit.on( 'change', function( e ) {
					var $option = $unit.find( 'option[value="' + this.value + '"]' );

					$inputs.attr( 'min', $option.attr( 'data-min' ) );
					$inputs.attr( 'max', $option.attr( 'data-max' ) );
					$inputs.attr( 'step', $option.attr( 'data-step' ) );

					$inputs.val( '' ).trigger( 'change' );
				});

				$link.on( 'click', function( e ) {
					e.preventDefault();
					
					$el.attr( 'data-linked', 'true' );
					$inputs.val( $inputs.first().val() ).trigger( 'change' );
					$inputs.first().focus();
				});

				$unlink.on( 'click', function( e ) {
					e.preventDefault();
					
					$el.attr( 'data-linked', 'false' );
					$inputs.first().focus();
				});

				$inputs.on( 'keyup mouseup', function( e ) {
					if ( 'true' == $el.attr( 'data-linked' ) ) {
						$inputs.not( this ).val( this.value ).trigger( 'change' );
					}
				});

				$inputs.on( 'change blur', function( e ) {
					var values = [],
					    unit = $unit.val().toString(),
					    isEmpty = true,
					    value;

					$inputs.each(function() {
						if ( '' === this.value ) {
							values.push( '0' + unit );
						} else {
							values.push( this.value.toString() + unit );
							isEmpty = false;
						}
					});

					if ( isEmpty ) {
						value = '   ';
					} else {
						value = values.join( ' ' );
					}

					$value.val( value ).trigger( 'change' );
				});
			});
		}
	});
	
	/**
	 * Cakecious typography control
	 */
	 wp.customize.controlConstructor['cakecious-typography'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			control.container.find( '.cakecious-typography-size' ).each(function( i, el ) {
				var $el = $( el ),
				    $unit = $el.find( '.cakecious-typography-size-unit' ),
				    $input = $el.find( '.cakecious-typography-size-input' ),
				    $value = $el.find( '.cakecious-typography-size-value' );

				var setNumberAttrs = function( unit ) {
					var $option = $unit.find( 'option[value="' + unit + '"]' );

					$input.attr( 'min', $option.attr( 'data-min' ) );
					$input.attr( 'max', $option.attr( 'data-max' ) );
					$input.attr( 'step', $option.attr( 'data-step' ) );
				};

				$unit.on( 'change', function( e ) {
					setNumberAttrs( this.value );
					
					$input.val( '' ).trigger( 'change' );
				});
				setNumberAttrs( $unit.val() );

				$input.on( 'change blur', function( e ) {
					var value = '' === this.value ? '' : this.value.toString() + $unit.val().toString();

					$value.val( value ).trigger( 'change' );
				});
			});
		},
	});
	
	/**
	 * Cakecious background control
	 */
	 wp.customize.controlConstructor['cakecious-background'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			// Shortcut so that we don't have to use _.bind every time we add a callback.
			_.bindAll( control, 'openMediaLibrary', 'removeImage', 'onOpenMediaLibrary', 'onSelectMediaLibrary' );

			control.container.on( 'click keydown', '.upload-button', control.openMediaLibrary );
			control.container.on( 'click keydown', '.thumbnail-image img', control.openMediaLibrary );
			control.container.on( 'click keydown', '.remove-button', control.removeImage );
		},

		openMediaLibrary: function( e ) {
			if ( wp.customize.utils.isKeydownButNotEnterEvent( e ) ) {
				return;
			}

			e.preventDefault();

			if ( ! this.mediaLibrary ) {
				this.initMediaLibrary();
			}

			this.mediaLibrary.open();
		},

		initMediaLibrary: function() {
			this.mediaLibrary = wp.media({
				states: [
					new wp.media.controller.Library({
						library: wp.media.query({ type: 'image' }),
						multiple: false,
						date: false,
					}),
				],
			});

			// When a file is selected, run a callback.
			this.mediaLibrary.on( 'select', this.onSelectMediaLibrary );

			this.mediaLibrary.on( 'open', this.onOpenMediaLibrary );
		},

		onOpenMediaLibrary: function( e ) {
			if ( this.params.attachment ) {
				var attachment = wp.media.attachment( this.params.attachment.id );

				attachment.fetch();

				this.mediaLibrary.state().get( 'selection' ).add( [ attachment ] );
			}
		},

		onSelectMediaLibrary: function( e ) {
			var attachment = this.mediaLibrary.state().get( 'selection' ).first().toJSON();

			this.params.attachment = attachment;

			// Set the Customizer setting; the callback takes care of rendering.
			this.settings.image.set( attachment.url );

			this.renderContent();
		},

		removeImage: function( e ) {
			if ( wp.customize.utils.isKeydownButNotEnterEvent( e ) ) {
				return;
			}

			e.preventDefault();

			this.params.attachment = {};
			this.settings.image.set( '' );
			this.renderContent(); // Not bound to setting change when emptying.
		},
	});
	
	/**
	 * Cakecious multiple checkboxes control
	 */
	wp.customize.controlConstructor['cakecious-multicheck'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this,
			    $checkboxes = control.container.find( '.cakecious-multicheck-input' );

			$checkboxes.on( 'change', function( e ) {
				var value = [];

				$checkboxes.each(function() {
					if ( this.checked ) {
						value.push( this.value );
					}
				});

				control.setting.set( value );
			});
		}
	});
	
	/**
	 * Cakecious radio image control
	 */
	wp.customize.controlConstructor['cakecious-radioimage'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this,
			    $inputs = control.container.find( '.cakecious-radioimage-input' );

			$inputs.on( 'change', function( e ) {
				control.setting.set( this.value );
			});
		}
	});

	/**
	 * Cakecious sortable control
	 */
	wp.customize.controlConstructor['cakecious-sortable'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this,
			    $sortable = control.container[0].querySelector( '.cakecious-sortable' ),
			    $checkboxes = control.container[0].querySelectorAll( 'input[type="checkbox"]' );

			// Shortcut so that we don't have to use _.bind every time we add a callback.
			_.bindAll( control, 'updateValue' );

			control.sortable = $sortable;

			sortable( '#' + $sortable.id, {
				handle: '.cakecious-sortable-item-handle',
				forcePlaceholderSize: true,
				itemSerializer: function( serializedItem, sortableContainer ) {
					return {
						checked: serializedItem.node.querySelector( 'input' ).checked,
						value: serializedItem.node.dataset.value,
					};
				}
			});

			$sortable.addEventListener( 'sortupdate', control.updateValue, false );

			$checkboxes.forEach(function( $checkbox ) {
				$checkbox.addEventListener( 'change', control.updateValue, false );
			});
		},

		updateValue: function( e ) {
			// Get all items.
			var serialized = sortable( '#' + this.sortable.id, 'serialize' );
			
			// Filter only checked items.
			var checkedItems = serialized[0].items.filter( function( item ) {
				return item.checked;
			});

			// Build value.
			var value = [];
			for ( var i = 0; i < checkedItems.length; i++ ) {
				value.push( checkedItems[i].value );
			}

			this.setting.set( value );
		},
	});
	
	/**
	 * Cakecious builder control
	 */
	wp.customize.controlConstructor['cakecious-builder'] = wp.customize.CakeciousControl.extend({
		ready: function() {
			var control = this;

			control.builder = control.container.find( '.cakecious-builder' );
			control.builderLocations = control.builder.find( '.cakecious-builder-location' );
			control.builderInactive = control.builder.find( '.cakecious-builder-inactive' );

			// Core function to update setting's value.
			control.updateValue = function( location ) {
				if ( '__inactive' === location ) return;

				var $locationPanel = control.builderLocations.filter( '[data-location="' + location + '"]' ),
				    $elements = $locationPanel.find( '.cakecious-builder-element' ),
				    value = [];

				$elements.each(function() {
					value.push( $( this ).attr( 'data-value' ) );
				});

				if ( null !== control.settings ) {
					control.settings[ location ].set( value );
				} else {
					control.setting.set( value );
				}
			};

			// Show / hide add button.
			control.showHideAddButton = function() {
				var $addButton = control.builder.find( '.cakecious-builder-element-add' );

				if ( 0 === control.builderInactive.find( '.cakecious-builder-element' ).length ) {
					$addButton.hide();
				} else {
					$addButton.show();
				}
			}
			control.showHideAddButton();

			// Trigger click event on all span with tabindex using keyboard.
			control.container.on( 'keyup', '[tabindex]', function( e ) {
				if ( 13 == e.which || 32 == e.which ) {
					$( this ).trigger( 'click' );
				}
			});

			// Expand inactive panel.
			control.container.on( 'click', '.cakecious-builder-element-add', function( e ) {
				e.preventDefault();

				var $this = $( this ),
				    $location = $this.closest( '.cakecious-builder-location' ),
				    $wrapper = $this.closest( '.cakecious-builder-locations' );

				if ( control.builderInactive.prev().get(0) == $location.get(0) && control.builderInactive.hasClass( 'show' ) ) {
					control.builderInactive.removeClass( 'show' ).appendTo( $wrapper );
				} else {
					control.builderInactive.addClass( 'show' ).insertAfter( $location );
				}
			});

			// Add element to nearby location.
			control.container.on( 'click', '.cakecious-builder-inactive .cakecious-builder-element', function( e ) {
				e.preventDefault();

				if ( control.builderInactive.hasClass( 'show' ) ) {
					var $element = $( this ),
					    $location = control.builderInactive.prev( '.cakecious-builder-location' );

					$element.appendTo( $location.children( '.cakecious-builder-sortable-panel' ) );
					control.builderInactive.removeClass( 'show' );

					control.updateValue( $location.attr( 'data-location' ) );
					control.showHideAddButton();
				}
			});

			// Delete element from location.
			control.container.on( 'click', '.cakecious-builder-element-delete', function( e ) {
				e.preventDefault();

				var $element = $( this ).parent( '.cakecious-builder-element' ),
				    $location = $element.closest( '.cakecious-builder-location' );

				$element.prependTo( control.builderInactive.children( '.cakecious-builder-sortable-panel' ) );
				control.updateValue( $location.attr( 'data-location' ) );
				control.showHideAddButton();
			});

			// Initialize sortable.
			control.container.find( '.cakecious-builder-sortable-panel' ).sortable({
				items: '.cakecious-builder-element:not(.cakecious-builder-element-disabled)',
				connectWith: '.cakecious-builder-sortable-panel[data-connect="' + control.builder.attr( 'data-name' ) + '"]',
				containment: control.container,
				update: function( e, ui ) {
					control.updateValue( $( e.target ).parent().attr( 'data-location' ) );
					control.showHideAddButton();
				},

				receive: function( e, ui ) {
					var limitations = $( ui.item ).attr( 'data-limitations' ).split( ',' );

					if ( 0 <= limitations.indexOf( $( this ).parent().attr( 'data-location' ) ) ) {
						$( ui.sender ).sortable( 'cancel' );
					}
				},
				start: function( e, ui ) {
					var limitations = $( ui.item ).attr( 'data-limitations' ).split( ',' );

					for ( var i = 0; i < limitations.length; ++i ) {
						var $target = control.builderLocations.filter( '[data-location="' + limitations[ i ] + '"]' );
						if ( undefined === $target ) continue;

						$target.addClass( 'disabled' );
					}
				},
				stop: function( e, ui ) {
					control.builderLocations.removeClass( 'disabled' );
					control.builderInactive.removeClass( 'disabled' );
				}
			})
			.disableSelection();
		}
	});

	/**
	 * API on ready event handlers
	 *
	 * All handlers need to be inside the 'ready' state.
	 */
	wp.customize.bind( 'ready', function() {

		/**
		 * Cakecious responsive control
		 */

		// Set handler when custom responsive toggle is clicked.
		$( '#customize-controls' ).on( 'click', '.cakecious-responsive-switcher-button', function( e ) {
			e.preventDefault();

			wp.customize.previewedDevice.set( $( this ).attr( 'data-device' ) );
		});

		// Set all custom responsive toggles and fieldsets.
		var setCustomResponsiveElementsDisplay = function() {
			var device = wp.customize.previewedDevice.get(),
			    $buttons = $( 'span.cakecious-responsive-switcher-button' ),
			    $tabs = $( '.cakecious-responsive-switcher-button.nav-tab' ),
			    $panels = $( '.cakecious-responsive-fieldset' );

			$panels.removeClass( 'active' ).filter( '.preview-' + device ).addClass( 'active' );
			$buttons.removeClass( 'active' ).filter( '.preview-' + device ).addClass( 'active' );
			$tabs.removeClass( 'nav-tab-active' ).filter( '.preview-' + device ).addClass( 'nav-tab-active' );
		}

		// Refresh all responsive elements when previewedDevice is changed.
		wp.customize.previewedDevice.bind( setCustomResponsiveElementsDisplay );

		// Refresh all responsive elements when any section is expanded.
		// This is required to set responsive elements on newly added controls inside the section.
		wp.customize.section.each(function ( section ) {
			section.expanded.bind( setCustomResponsiveElementsDisplay );
		});

		/**
		 * Event handler for links to set preview URL.
		 */
		$( '#customize-controls' ).on( 'click', '.cakecious-customize-set-preview-url', function( e ) {
			e.preventDefault();

			var $this = $( this ),
			    href = $this.attr( 'href' ),
			    url = getUrlParameter( 'url', href );

			if ( url !== wp.customize.previewer.previewUrl() ) {
				wp.customize.previewer.previewUrl( url );
			}
		});

		/**
		 * Event handler for links to jump to a certain control / section.
		 */
		$( '#customize-controls' ).on( 'click', '.cakecious-customize-goto-control', function( e ) {
			e.preventDefault();

			var $this = $( this ),
			    href = $this.attr( 'href' ),
			    targetControl = getUrlParameter( 'autofocus[control]', href ),
			    targetSection = getUrlParameter( 'autofocus[section]', href ),
			    targetPanel= getUrlParameter( 'autofocus[panel]', href );

			if ( targetControl ) {
				wp.customize.control( targetControl ).focus();
			}
			else if ( targetSection ) {
				wp.customize.section( targetSection ).focus();
			}
			else if ( targetPanel ) {
				wp.customize.panel( targetPanel ).focus();
			}
		});

		if ( cakeciousCustomizerControlsData && cakeciousCustomizerControlsData.contexts ) {
			_.each( cakeciousCustomizerControlsData.contexts, function( elementRules, elementID ) {
				var elementType = 0 == elementID.indexOf( 'cakecious_section' ) ? 'section' : 'control';

				wp.customize[ elementType ]( elementID, function( elementObj ) {
					_.each( elementRules, function( rule, i ) {
						var ruleSettingObj = '__device' === rule.setting ? wp.customize.previewedDevice : wp.customize( rule.setting );

						var setVisibility = function( checkedValue ) {
							var displayed = false;

							if ( undefined == rule.operator || '=' == rule.operator ) {
								rule.operator = '==';
							}

							switch ( rule.operator ) {
								case '>':
									displayed = checkedValue > rule.value; 
									break;

								case '<':
									displayed = checkedValue < rule.value; 
									break;

								case '>=':
									displayed = checkedValue >= rule.value; 
									break;

								case '<=':
									displayed = checkedValue <= rule.value; 
									break;

								case 'in':
									displayed = 0 <= rule.value.indexOf( checkedValue );
									break;

								case 'not_in':
									displayed = 0 > rule.value.indexOf( checkedValue );
									break;

								case 'contain':
									displayed = 0 <= checkedValue.indexOf( rule.value );
									break;

								case 'not_contain':
									displayed = 0 > checkedValue.indexOf( rule.value );
									break;

								case '!=':
									displayed = checkedValue != rule.value;
									break;

								case 'empty':
									displayed = 0 == checkedValue.length;
									break;

								case '!empty':
									displayed = 0 < checkedValue.length;
									break;

								default:
									displayed = checkedValue == rule.value;
									break;
							}

							var container = elementObj.container;
							if ( 'section' === elementType ) {
								container = elementObj.headContainer;
							}

							if ( displayed ) {
								container.show();
								container.removeClass( 'cakecious-context-hidden' );
							} else {
								container.hide();
								container.addClass( 'cakecious-context-hidden' );

								if ( 'section' === elementType && elementObj.expanded() ) {
									elementObj.collapse();
								}
							}
						}

						if ( undefined !== ruleSettingObj ) {
							if ( '__device' !== rule.setting ) {
								setVisibility( ruleSettingObj.get() );
							}

							// Bind the setting for future use.
							ruleSettingObj.bind( setVisibility );
						}
					});
				});
			});
		}

		/**
		 * Resize Preview Frame when show / hide Builder.
		 */
		var resizePreviewer = function() {
			var $section = $( '.control-section.cakecious-builder-active' );

			if ( 1324 <= window.innerWidth && $body.hasClass( 'cakecious-has-builder-active' ) && 0 < $section.length && ! $section.hasClass( 'cakecious-hide' ) ) {
				wp.customize.previewer.container.css({ "bottom" : $section.outerHeight() + 'px' });
			} else {
				wp.customize.previewer.container.css({ "bottom" : "" });
			}
		}
		$window.on( 'resize', resizePreviewer );
		wp.customize.previewedDevice.bind(function( device ) {
			setTimeout(function() {
				resizePreviewer();
			}, 250 );
		});

		/**
		 * Page Settings
		 */
		var initPagePreviewBinding = function() {
			var lastPreviewURL = '';
			
			_.each( cakeciousCustomizerControlsData.previewContexts, function( url, key ) {
				wp.customize.section( key, function( section ) {
					section.expanded.bind( function( isExpanded ) {
						if ( isExpanded ) {
							lastPreviewURL = wp.customize.previewer.previewUrl.get();
							wp.customize.previewer.previewUrl.set( url );
						} else {
							wp.customize.previewer.previewUrl.set( lastPreviewURL );
						}
					} );
				} );
			});
		}
		initPagePreviewBinding();

		/**
		 * Init Header & Footer Builder
		 */
		var initHeaderFooterBuilder = function( panel ) {
			var section = 'cakecious_panel_header' === panel.id ? wp.customize.section( 'cakecious_section_header_builder' ) : wp.customize.section( 'cakecious_section_footer_builder' ),
			    $section = section.contentContainer;

			// If Header panel is expanded, add class to the body tag (for CSS styling).
			panel.expanded.bind(function( isExpanded ) {
				_.each( section.controls(), function( control ) {
					if ( 'resolved' === control.deferred.embedded.state() ) {
						return;
					}
					control.renderContent();
					control.deferred.embedded.resolve(); // This triggers control.ready().
					
					// Fire event after control is initialized.
					control.container.trigger( 'init' );
				});

				if ( isExpanded ) {
					$body.addClass( 'cakecious-has-builder-active' );
					$section.addClass( 'cakecious-builder-active' );
				} else {
					$body.removeClass( 'cakecious-has-builder-active' );
					$section.removeClass( 'cakecious-builder-active' );
				}

				resizePreviewer();
			});

			// Attach callback to builder toggle.
			$section.on( 'click', '.cakecious-builder-toggle', function( e ) {
				e.preventDefault();
				$section.toggleClass( 'cakecious-hide' );

				resizePreviewer();
			});

			$section.find( '.cakecious-builder-sortable-panel' ).on( 'sortover', function( e, ui ) {
				resizePreviewer();
			});

			var moveHeaderFooterBuilder = function() {
				if ( 1324 <= window.innerWidth ) {
					$section.insertAfter( $( '.wp-full-overlay-sidebar-content' ) );
					
					if ( section.expanded() ) {
						section.collapse();
					}
				} else {
					$section.appendTo( $( '#customize-theme-controls' ) );
				}
			}
			wp.customize.bind( 'pane-contents-reflowed', moveHeaderFooterBuilder );
			$window.on( 'resize', moveHeaderFooterBuilder );
		};
		wp.customize.panel( 'cakecious_panel_header', initHeaderFooterBuilder );
		wp.customize.panel( 'cakecious_panel_footer', initHeaderFooterBuilder );
		
		wp.customize.control( 'footer_elements' ).container.on( 'init', setCustomResponsiveElementsDisplay );

		/**
		 * Init Header Elements Locations Grouping
		 */
		var initHeaderFooterBuilderElements = function( e ) {
			var $control = $( this ),
			    controlKey = $control.find( '.customize-control-content' ).attr( 'data-name' );

			if ( ! cakeciousCustomizerControlsData.headerFooterBuilderStructures[ controlKey ] ) {
				return;
			}

			var mode = 0 <= $control.attr( 'id' ).indexOf( 'header' ) ? 'header' : 'footer',
			    $groupWrapper = $control.find( '.cakecious-builder-locations' ).addClass( 'cakecious-builder-groups' );
			    // verticalSelector = '.cakecious-builder-location-vertical_top, .cakecious-builder-location-vertical_middle, .cakecious-builder-location-vertical_bottom, .cakecious-builder-location-mobile_vertical_top',
			    // $verticalLocations = $control.find( verticalSelector ),
			    // $horizontalLocations = $control.find( '.cakecious-builder-location' ).not( verticalSelector );

			_.each( cakeciousCustomizerControlsData.headerFooterBuilderStructures[ controlKey ], function( areas, groupType ) {
				var groupClassNames = 'vertical' === groupType ? 'cakecious-builder-group cakecious-builder-group-vertical cakecious-builder-layout-block' : 'cakecious-builder-group cakecious-builder-group-horizontal cakecious-builder-layout-inline',
				    $group = $( document.createElement( 'div' ) ).addClass( groupClassNames );

				_.each( areas, function( areaData, areaKey ) {
					var $area = $( document.createElement( 'div' ) ).addClass( 'cakecious-builder-area' ).attr( 'data-key', areaKey ),
					    $areaLabel = $( document.createElement( 'span' ) ).addClass( 'cakecious-builder-area-label' ).html( areaData.label ),
					    $areaLocations = $( document.createElement( 'div' ) ).addClass( 'cakecious-builder-area-locations' );

					_.each( areaData.locations, function( locationID ) {
						var $location = $control.find( '[data-location="' + locationID + '"]' );

						if ( $location ) {
							$location.appendTo( $areaLocations );
						}
					});

					if ( 0 < $areaLocations.children().length ) {
						$area.appendTo( $group );
						$areaLabel.appendTo( $area );
						$areaLocations.appendTo( $area );
					}
				});

				if ( 0 < $group.children().length ) {
					$group.appendTo( $groupWrapper );
				}
			});

			// Element on click jump to element options.
			$control.on( 'click', '.cakecious-builder-location .cakecious-builder-element > span', function( e ) {
				e.preventDefault();

				var $element = $( this ).parent( '.cakecious-builder-element' ),
				    targetKey = 'heading_' + mode + '_' + $element.attr( 'data-value' ).replace( '-', '_' ),
				    targetControl = wp.customize.control( targetKey );

				if ( targetControl ) targetControl.focus();
			});

			// Group edit button on click jump to group section.
			$control.on( 'click', '.cakecious-builder-area-label', function( e ) {
				e.preventDefault();

				var targetKey = 'cakecious_section_' + mode + '_' + $( this ).parent().attr( 'data-key' ).replace( '-', '_' ),
				    targetSection = wp.customize.section( targetKey );

				if ( targetSection ) targetSection.focus();
			});
		};
		wp.customize.control( 'header_elements' ).container.on( 'init', initHeaderFooterBuilderElements );
		wp.customize.control( 'header_mobile_elements' ).container.on( 'init', initHeaderFooterBuilderElements );
		wp.customize.control( 'footer_elements' ).container.on( 'init', initHeaderFooterBuilderElements );

	});
})( wp, jQuery );