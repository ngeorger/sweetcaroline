	
	/**
	 * get select post type value
	 */
	function getPostTypeValue(objSelectPostCategory){
		
		var objParent = objSelectPostCategory.parents("#elementor-controls");
		var objPostType = objParent.find(".unite-setting-post-type");
		if(objPostType.length == 0)
			throw new Error("Post type field not found");
		
		var postTypeValue = objPostType.val();
		
		return(postTypeValue);
	}
	
	
	/**
	 * init post category
	 */
	function initPostCategory(index, selectPostCategory){
		
		var objSelectCategory = jQuery(selectPostCategory);
		objSelectCategory.addClass("uc-isinited");
		
		var postType = getPostTypeValue(objSelectCategory);
		
		var htmlOptions = "";
		htmlOptions += "<option value=''>[All Categories]</option>"
		htmlOptions += "<option value='10' >cat1</option>"
		htmlOptions += "<option value='11' selected>ca2</option>"
		
		objSelectCategory.html(htmlOptions);
	}
	
	
	/**
	 * check and init posts list
	 */
	function checkInitPostsList(){
		
		var objSelectPostCategory = jQuery(".unite-setting-post-category").not(".uc-isinited");
		if(objSelectPostCategory.length){
			objSelectPostCategory.each(initPostCategory);
		}
		
	}
	
	/**
	 * on post type change
	 */
	function onPostTypeChange(){
		var objPostType = jQuery(this);
		
		var objPostCategory = jQuery(".unite-setting-post-category");
		var htmlOptions = "";
		htmlOptions += "<option value=''>[All Categories]</option>"
		htmlOptions += "<option value='12' >some cat</option>"
		htmlOptions += "<option value='13' selected>some cat2</option>"
		
		objPostCategory.html(htmlOptions);
		objPostCategory.val("13");
		
	}
	
	
	/**
	 * init posts list control
	 */
	function initPostsListControl(){
				
		setInterval(checkInitPostsList, 1000);
		
		var objPanel = jQuery("#elementor-panel");
		
		objPanel.on("change",".unite-setting-post-type", onPostTypeChange);
		
	}
