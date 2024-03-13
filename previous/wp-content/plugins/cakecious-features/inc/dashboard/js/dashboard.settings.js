(function($){
	
	$(document).ready(function($) {
	    
	    $('.nav-tab-wrapper a').on( 'click', function(e) {
	        var clicked = $(this).attr('href');
	        if( clicked.indexOf('#') == -1 )
	        	return true;
	        $('.nav-tab-wrapper a').removeClass('nav-tab-active');
	        $(this).addClass('nav-tab-active').blur();
	        $('.group').hide();
	        $(clicked).fadeIn();
	        
	        if (typeof(localStorage) != 'undefined' ) {
	            localStorage.setItem('kc_settings_active_tab', clicked );
	        }
	        e.preventDefault();
	    });
	    
	    $('.kc-update-link-ajax').on('click', function(e){
		    
		    var wrp = $(this).parent(),
		    	slug = $(this).data('slug');
		    	
		    wrp.html('<i class="dashicons dashicons-update kc-spin"></i> Updating, please wait...');
	
		    $.post({
		    	url: ajaxurl, 
		    	data: {
			    	'action': 'update-plugin',
					'slug': slug,
					'plugin': slug+'/'+slug+'.php',
				    '_ajax_nonce': $('#kc-nonce-updates').val()
			    },
			    wrp: wrp,
			    method: 'POST',
			    dataType: 'json',
				success: function (result) {
					
					if (result == '-1' || result == '0')
					{
						this.wrp.html('<span style="color:maroon"><i class="dashicons dashicons-no"></i> Update failed</span>');
						this.wrp.parent().after('<p><strong>Console:</strong><br />Invalid sercurity sessition or do wrong way.</p>');
					}
					else if (result.success === true)
					{
						this.wrp.parent().addClass('success');
						this.wrp.html('<span style="color:green"><i class="dashicons dashicons-yes"></i> Update successful</span>');
					}
					else
					{
						this.wrp.html('<span style="color:maroon"><i class="dashicons dashicons-no"></i> Update failed</span>');
						this.wrp.parent().after('<div class="kc-download-failed-mesg">'+result.data.errorMessage+'</div>');
					}
					
				}
			});
			
			e.preventDefault();
			return false;
			
	    });
	    
	    if (typeof(localStorage) != 'undefined'){
	        
	        activeTab = localStorage.getItem('kc_settings_active_tab');
	        
	        if (activeTab === undefined)
	        	activeTab = '#kc_general_setting';
	
	        $('.nav-tab-wrapper a[href="'+activeTab+'"]').trigger('click');
	        
	    }
	    
	    if (window.location.href.indexOf('#') > -1 && $('a[href="#'+window.location.href.split('#')[1]+'"]').length > 0)
	    	$('a[href="#'+window.location.href.split('#')[1]+'"]').trigger('click');
	    	

	});
	
})(jQuery);