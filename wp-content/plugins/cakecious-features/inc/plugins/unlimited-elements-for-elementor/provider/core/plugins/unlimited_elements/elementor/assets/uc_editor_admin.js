
function UniteCreatorElementorEditorAdmin(){
	
	var t = this;
	var g_arrPreviews;
	var g_handle = null;
	var g_objSettingsPanel;
	var g_objAddonParams, g_objAddonParamsItems, g_lastAddonName;
	var g_numRepeaterItems = 0;
	var g_windowFront, g_searchDataID, g_searchData; 
	var g_temp = {
	};
	
	
	/**
	 * raw url decode
	 */
	function rawurldecode(str){return decodeURIComponent(str+'');}
	

	/**
	 * utf8 decode
	 */
	function utf8_decode(str_data){var tmp_arr=[],i=0,ac=0,c1=0,c2=0,c3=0;str_data+='';while(i<str_data.length){c1=str_data.charCodeAt(i);if(c1<128){tmp_arr[ac++]=String.fromCharCode(c1);i++;}else if(c1>191&&c1<224){c2=str_data.charCodeAt(i+1);tmp_arr[ac++]=String.fromCharCode(((c1&31)<<6)|(c2&63));i+=2;}else{c2=str_data.charCodeAt(i+1);c3=str_data.charCodeAt(i+2);tmp_arr[ac++]=String.fromCharCode(((c1&15)<<12)|((c2&63)<<6)|(c3&63));i+=3;}}
	return tmp_arr.join('');}
		
	/**
	 * base 64 decode
	 */
	function base64_decode(data){var b64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var o1,o2,o3,h1,h2,h3,h4,bits,i=0,ac=0,dec="",tmp_arr=[];if(!data){return data;}
	data+='';do{h1=b64.indexOf(data.charAt(i++));h2=b64.indexOf(data.charAt(i++));h3=b64.indexOf(data.charAt(i++));h4=b64.indexOf(data.charAt(i++));bits=h1<<18|h2<<12|h3<<6|h4;o1=bits>>16&0xff;o2=bits>>8&0xff;o3=bits&0xff;if(h3==64){tmp_arr[ac++]=String.fromCharCode(o1);}else if(h4==64){tmp_arr[ac++]=String.fromCharCode(o1,o2);}else{tmp_arr[ac++]=String.fromCharCode(o1,o2,o3);}}while(i<data.length);dec=tmp_arr.join('');dec=utf8_decode(dec);return dec;}
	
	
	/**
	 * trace function
	 */
	function trace(str){
		console.log(str);
	}
				
	
	
	function a________AUDIO_CONTROL_________(){}
		
	
	/**
	 * select audio file from library
	 */
	function onChooseAudioClick(){
		
		var objButton = jQuery(this);
		var objInput = objButton.siblings("input[type='text']");
		var objText = objButton.siblings(".uc-audio-control-text");
		
		var frame = wp.media({
			title : "Select Audio File",
			multiple : false,
			library : { type : "audio"},
			button : { text : 'Choose' }
		});
		
		// Runs on select
		frame.on('select',function(){
			var objSettings = frame.state().get('selection').first().toJSON();
			var urlFile = objSettings.url;
			objInput.val(urlFile);
			objInput.trigger("input");
			
			//var text = 'Please copy this url to the input box \n '+urlFile;
			//alert(text);
		});
		
		//open media library
		frame.open();
	}
	
	/**
	 * get elementor panel
	 */
	function getObjElementorPanel(){
		var objPanel = jQuery("#elementor-panel");
		
		return(objPanel);
	}
	
	/**
	 * init audio control
	 */
	function initAudioControl(){
		var objPanel = getObjElementorPanel();
		
		objPanel.on("click",".uc-button-choose-audio",	onChooseAudioClick);
		
	}
	
	
	/**
	 * get object property
	 */
	function getVal(obj, name, defaultValue){
		
		if(!defaultValue)
			var defaultValue = "";
		
		var val = "";
		
		if(!obj || typeof obj != "object")
			val = defaultValue;
		else if(obj.hasOwnProperty(name) == false){
			val = defaultValue;
		}else{
			val = obj[name];			
		}
		
		
		return(val);
	}
	
	/**
	 * escape html, turn html to a string
	 */
	function htmlspecialchars(string){
		
		if(!string)
			return(string);
		
		  return string
		      .replace(/&/g, "&amp;")
		      .replace(/</g, "&lt;")
		      .replace(/>/g, "&gt;")
		      .replace(/"/g, "&quot;")
		      .replace(/'/g, "&#039;");
	};
	
	

	function a________POST_TYPE_SELECT_________(){}
	
	/**
	 * change taxonomy post select
	 */
	function changePostTaxonomySelect(selectPostType, dataPostTypes){
		
		var objPanel = getObjElementorPanel();
		var prefix = selectPostType.data("settingprefix");
		
		var selectPostTaxonomy = objPanel.find("select[data-setting='"+prefix+"_taxonomy']");
		
		var postType = selectPostType.val();
		var selectedTax = selectPostTaxonomy.val();
		
		
		var objTax = getVal(dataPostTypes, postType);
		if(!objTax)
			return(true);
		
		//hide not relevant select options
		var objOptions = selectPostTaxonomy.find("option");
		var firstVisibleOption = null;
		
		jQuery.each(objOptions, function(index, option){
			
			var objOption = jQuery(option);
			var optionTax = objOption.prop("value");
			
			var taxFound = objTax.hasOwnProperty(optionTax);
			
			if(taxFound == true && firstVisibleOption == null)
				firstVisibleOption = optionTax;
			
			if(taxFound == true)
				objOption.show();
			else
				objOption.hide();
							
		});
		
		//check and change current tax
		
		var isCurrentTaxRelevant = objTax.hasOwnProperty(selectedTax);
		if(isCurrentTaxRelevant == false && firstVisibleOption){
			
			selectPostTaxonomy.val(firstVisibleOption).trigger("change");
		}
			
		
	}
	
	
	/**
	 * on post type select change
	 */
	function onPostTypeSelectChange(){
		
		var selectPostType = jQuery(this);
		
		var dataPostTypes = selectPostType.data("arrposttypes");
		if(typeof dataPostTypes == "string"){
			dataPostTypes = t.decodeContent(dataPostTypes);
			dataPostTypes = JSON.parse(dataPostTypes);
		}
		
		var settingType = selectPostType.data("settingtype");
		
		if(settingType == "select_post_taxonomy"){
			
			changePostTaxonomySelect(selectPostType, dataPostTypes);
			return(false);
		}
		
				
		//find post category select
		var objPanel = getObjElementorPanel();
		var prefix = selectPostType.data("settingprefix");
		
		var objSelectPostCategory = objPanel.find("select[data-setting='"+prefix+"_category']");
		
		var arrPostTypes = selectPostType.val();
		
		//force array always
		if(jQuery.isArray(arrPostTypes) == false)
			arrPostTypes = [arrPostTypes];
		
		var selectedCatID = objSelectPostCategory.select2("val");
		
		var options = [];
		
		for(var postType of arrPostTypes){
			
			var objPostType = getVal(dataPostTypes, postType);
			
			if(!objPostType)
				continue;
			
			var objCats = objPostType["cats"];
			
			jQuery.each(objCats, function(catID, catText){
				
				var catShowText = htmlspecialchars(catText);
				
			    options.push({
		            text: catShowText,
		            id: catID
		        });
			    
			});
						
		}
		
		objSelectPostCategory.empty().select2({
			data:options,
			placeholder:"All Terms"
		});
		
		if(selectedCatID)
			objSelectPostCategory.val(selectedCatID).trigger("change");
		
	}
	
	
	/**
	 * init post type select control
	 */
	function initPostTypeSelectControl(){
				
		var objPanel = getObjElementorPanel();
						
		objPanel.on("change",".unite-setting-post-type", onPostTypeSelectChange);
		
	}
	
	/**
	 * on panel change - refresh the post type selector again
	 */
	function postSelectOnLoad(){
		
		var objPanel = getObjElementorPanel();
		
		var objSetting = jQuery(".unite-setting-post-type");
		if(objSetting.length == 0)
			return(true);
		
		var isInited = objSetting.data("isinited");
		if(isInited == true)
			return(true);
		
		objSetting.data("isinited", true);
		
		setTimeout(function(){
			
			objSetting.trigger("change");
			
		}, 500);
		
	}
	
	
	
	function a________CONSOLIDATION_________(){}
		
	
	/**
	 * decode some content
	 */
	this.decodeContent = function(value){
		
		return rawurldecode(base64_decode(value));
	}
	
	
	/**
	 * hide all controls except the needed ones
	 */
	function hideAllControls(){
				
		var objWrapper = jQuery("#elementor-controls");
		
		var objControls = objWrapper.find(".elementor-control").not(".elementor-control-type-section.elementor-control-section_general").not(".elementor-control-uc_addon_name");
		objControls.hide();
		
	}
	
	
	/**
	 * show controls by names
	 */
	function showControlsByNames(arrNames){
				
		var objWrapper = jQuery("#elementor-controls");
		
		jQuery(arrNames).each(function(index, name){
			objWrapper.find(".elementor-control-"+name).show();
		});
		
	}
	
	/**
	 * show the right repeater fields
	 */
	function showRepeaterFields(){
		
		//hide repeater items
		var objRepeater = jQuery(".elementor-control-uc_items.elementor-control-type-repeater");
		if(objRepeater.length == 0)
			return(false);
		
		if(typeof g_objAddonParamsItems == "undefined")
			return(false);
		
		if(!g_objAddonParamsItems)
			return(false);
				
		if(!g_objAddonParamsItems.length)
			return(false);
		
		if(g_objAddonParamsItems.hasOwnProperty(g_lastAddonName) == false)
			return(false);
		
		var arrItemControls = g_objAddonParamsItems[g_lastAddonName];
		
		//hide all repeater controls
		objRepeater.find(".elementor-control").hide();
		
		//show only relevant controls
		jQuery.each(arrItemControls,function(index, controlName){
			
			var objControl = objRepeater.find(".elementor-control.elementor-control-"+controlName);
			objControl.show();
		});
		
	}
	
	
	/**
	 * hide all items controls
	 */
	function hideAllItemsControls(){
		
		var objSection = jQuery(".elementor-control.elementor-control-section_uc_items_consolidation");
		
		if(objSection.length)
			objSection.hide();
		
	}
	
	
	/**
	 * show active controls
	 */
	function showActiveControls(){
		
		var objAddonSelector = jQuery(this);
		
		var addonName = objAddonSelector.val();
		
		g_lastAddonName = addonName;
		
		var arrParamNames = g_objAddonParams[addonName];
		
		hideAllControls();
		showControlsByNames(arrParamNames);
		
	}
	
	
	/**
	 * show active item controls
	 */
	function showActiveItemsControls(){
		
		if(!g_lastAddonName)
			return(false);
		
		if(g_objAddonParamsItems.hasOwnProperty(g_lastAddonName) == false)
			return(false);
		
		//show section
		var objSection = jQuery(".elementor-control.elementor-control-section_uc_items_consolidation");
		objSection.show();
		
		showRepeaterFields();
		
	}
	
	
	/**
	 * init the addons selector
	 */
	function initAddonsSelector(){
		
		var objAddonSelector = g_objSettingsPanel.find(".uc-addon-selector");
		if(objAddonSelector.length == 0)
			return(false);
		
		var isInited = objAddonSelector.data("isinited");
		if(isInited === true)
			return(false);
		
		objAddonSelector.data("isinited", true);
		
		//get addon params from meta
		var meta = objAddonSelector.data("meta");
		var jsonMeta = t.decodeContent(meta);
		
		var objMeta = jQuery.parseJSON(jsonMeta);
		g_objAddonParams = objMeta["addon_params"];
		g_objAddonParamsItems = objMeta["addon_params_items"];
				
		objAddonSelector.change(showActiveControls);
		
		objAddonSelector.trigger("change");
		
	}
	
	
	/**
	 * indicate init control
	 */
	function indicateInitControl(sectionType){
		
		switch(sectionType){
			case "style":
				var selector = ".elementor-control.elementor-control-type-section.elementor-control-uc_section_styles_indicator";
			break;
			case "items":
				var selector = ".elementor-control.elementor-control-section_uc_items_consolidation";
			break;
			default:
				trace("section type not found: " + sectionType);
			break;
		}
		
		if(!g_lastAddonName)
			return(false);
		
		//check special param, tells that it's really the style controls
		var objWrapper = jQuery("#elementor-controls");
		
		var objControl = objWrapper.find(selector);
		if(objControl.length == 0)
			return(false);
		
		var isInited = objControl.data("uc_isinited");
				
		if(isInited == true){
			return(false);
		}
		
		objControl.data("uc_isinited", true);
		
		return(true);
	}
	
	
	/**
	 * init the style controls
	 */
	function initStyleControls(){
		
		var isFound = indicateInitControl("style");
		if(isFound == false)
			return(false);
		
		var arrParamNames = g_objAddonParams[g_lastAddonName];
		
		hideAllControls();
		showControlsByNames(arrParamNames);
		
		return(true);
	}
	
	
	/**
	 * init items controls (with the repeater)
	 */
	function initItemsControls(){
		
		var isFound = indicateInitControl("items");
		if(isFound == false)
			return(false);
		
		var arrParamNames = g_objAddonParams[g_lastAddonName];
		
		hideAllItemsControls();
		showActiveItemsControls();
		
		//showControlsByNames(arrParamNames);
		
		return(true);
	}
	
	
	/**
	 * occure on change of settings panel
	 */
	function onSettingsPanelInit(){
		
		initAddonsSelector();
		
		var isInited = initStyleControls();
		
		if(isInited == false)
			initItemsControls();
		
		//init the post type selector if exists
		postSelectOnLoad();
	}
	
	/**
	 * on repeater click
	 */
	function onRepeaterItemClick(){
		setTimeout(function(){
			showRepeaterFields();
		},500);
	}
	
	/**
	 * init all the events
	 */
	function initEvents(){
		
		g_objSettingsPanel.bind("DOMSubtreeModified",function(){
			  if(g_handle)
				  clearTimeout(g_handle);
			  
			  g_handle = setTimeout(onSettingsPanelInit, 50);
			  
		});
		
		//init items repeater events
		jQuery(document).on("mousedown",".elementor-control-uc_items .elementor-repeater-row-item-title",onRepeaterItemClick);
		
	}
	
	function a________LOAD_INCLUDES_________(){}
	
	
	/**
	 * get object property
	 */
	function getVal(obj, name, defaultValue, opt){
		
		if(!defaultValue)
			var defaultValue = "";
		
		var val = "";
		
		if(!obj || typeof obj != "object")
			val = defaultValue;
		else if(obj.hasOwnProperty(name) == false){
			val = defaultValue;
		}else{
			val = obj[name];			
		}
		
		
		return(val);
	}
	
	
	/**
	 * load include file, js or css
	 */
	function loadDOMIncludeFile(type, url, data){
		
		//additional input values
		var replaceID = getVal(data, "replaceID");
		var name = getVal(data, "name");
		var onload = getVal(data, "onload");
		var iframeWindow = getVal(data, "iframe");
		
		//add random number at the end
		var noRand = getVal(data, "norand");
		if(!noRand){
			var rand = Math.floor((Math.random()*100000)+1);
			
			if(url.indexOf("?") == -1)
				url += "?rand="+rand;
			else
				url += "&rand="+rand;
		}
		
		if(replaceID)
			jQuery("#"+replaceID).remove();
		
		var objWindow = window;
		if(iframeWindow)
			objWindow = iframeWindow;
		
		switch(type){
			case "js":
				var tag = objWindow.document.createElement('script');
				tag.src = url;
				
				//add onload function if exists
				if(typeof onload == "function"){
					
					tag.onload = function(){
						onload(jQuery(this), replaceID);
					};
					
				}
				
				var firstScriptTag = objWindow.document.getElementsByTagName('script')[0];
				firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
				tag = jQuery(tag);
				
				if(name)
					tag.attr("name", name);
				
			break;
			case "css":
				var objHead = jQuery(objWindow).find("head");
				
				objHead.append("<link>");
				var tag = objHead.children(":last");
				var attributes = {
					      rel:  "stylesheet",
					      type: "text/css",
					      href: url
				};
				
				if(name)
					attributes.name = name;
				
				//add onload function if exists
				if(typeof onload == "function"){
					
					attributes.onload = function(){
						
						onload(jQuery(this), replaceID);
					};
					
				}
				
				tag.attr(attributes);
			break;
			default:
				throw Error("Undefined include type: "+type);
			break;
		}
		
			
		//replace current element
		if(replaceID)
			tag.attr({id:replaceID});
		
		return(tag);
	};
	
	
	/**
	 * put addon includes
	 */
	function putIncludes(windowIframe, objIncludes, funcOnLoaded){
		
		var isLoadOneByOne = true;
		
		var handlePrefix = "uc_include_";
		
		//make a list of js handles
		var arrHandles = {};
		jQuery.each(objIncludes, function(event, objInclude){
			
			var handle = handlePrefix + objInclude.type + "_" + objInclude.handle;
			
			if( !(objInclude.type == "js" && objInclude.handle == "jquery") )
				arrHandles[handle] = objInclude;
		});
				
		var isAllFilesLoaded = false;
		
		//inner function that check that all files loaded by handle
		function checkAllFilesLoaded(){
			
			if(isAllFilesLoaded == true)
				return(false);
			
			if(!jQuery.isEmptyObject(arrHandles))
				return(false);
			
			isAllFilesLoaded = true;
			
			if(!funcOnLoaded)
				return(false);
			
			funcOnLoaded();
			
		}
		
		
		/**
		 * on js file loaded - load first js file, from available handles
		 * in case that loading one by one
		 */
		function onJsFileLoaded(){
			
			for(var index in arrHandles){
				var objInclude = arrHandles[index];
				
				if(objInclude.type == "js"){
					loadIncludeFile(objInclude);
					return(false);
				}
				
			}
			
		}
		
		
		/**
		 * load include file
		 */
		function loadIncludeFile(objInclude){
			
			var url = objInclude.url;
			var handle = handlePrefix + objInclude.type + "_" + objInclude.handle;
			var type = objInclude.type;
			
			//skip jquery for now
			if(objInclude.handle == "jquery"){
				
				checkAllFilesLoaded();
				
				if(isLoadOneByOne)
					onJsFileLoaded();
				
				return(true);
			}
			
			var data = {
					replaceID:handle,
					name: "uc_include_file",
					iframe:windowIframe
			};
			
			//onload throw event when all scripts loaded
			data.onload = function(obj, handle){
								
				var objDomInclude = jQuery(obj);
						
				objDomInclude.data("isloaded", true);
								
				//delete the handle from the list, and check for all files loaded
				if(arrHandles.hasOwnProperty(handle) == true){
										
					delete arrHandles[handle];
					
					checkAllFilesLoaded();
					
				}//end checking
				
				if(isLoadOneByOne){
					var tagName = objDomInclude.prop("tagName").toLowerCase();
					if(tagName == "script")
						onJsFileLoaded();
				}
				
			};
			
			
			//if file not included - include it
			var objDomInclude = jQuery("#"+handle);
			
			if(objDomInclude.length == 0){
				
				objDomInclude = loadDOMIncludeFile(type, url, data);
			}
			else{
				
				//if the files is in the loading list but still not loaded, 
				//wait until they will be loaded and then check for firing the finish event (addons with same files)
				
				//check if the file is loaded
				var isLoaded = objDomInclude.data("isloaded");
				if(isLoaded == true){
					
					//if it's already included - remove from handle
					if(arrHandles.hasOwnProperty(handle) == true)
						delete arrHandles[handle];
					
					if(isLoadOneByOne){
						var tagName = objDomInclude.prop("tagName").toLowerCase();
						if(tagName == "script")
							onJsFileLoaded();
					}
					
					
				}else{
					
					var timeoutHandle = setInterval(function(){
						var isLoaded = objDomInclude.data("isloaded");
						
						if(isLoaded == true){
							clearInterval(timeoutHandle);
							
							if(arrHandles.hasOwnProperty(handle) == true)
								delete arrHandles[handle];
							
							checkAllFilesLoaded();
							
							if(isLoadOneByOne){
								var tagName = objDomInclude.prop("tagName").toLowerCase();
								if(tagName == "script")
									onJsFileLoaded();
							}
							
						}
						
					},100);
										
				}
								
			}			
			
		}
		
		if(isLoadOneByOne == false){
			
			jQuery.each(objIncludes, function(event, objInclude){
				loadIncludeFile(objInclude);
			});
			
		}else{
			
			//load css files and first js files
			var isFirstJS = true;
			
			jQuery.each(objIncludes, function(event, objInclude){
				if(objInclude.type == "css")
					loadIncludeFile(objInclude);
				else{		//js file, load first only
					
					if(isFirstJS == true){
						loadIncludeFile(objInclude);
						isFirstJS = false;
					}
					
				}
			});
			
			
		}
		
		
		//check if all files loaded
		checkAllFilesLoaded();
		
	}
	
	
	/**
	 * load js includes and then run function
	 */
	this.ucLoadJSAndRun = function(iframeWindow, jsonIncludes, funcRun){
		
		var objIncludes = jQuery.parseJSON(jsonIncludes);
		if(!objIncludes || objIncludes.length == 0){
			funcRun();
			return(false);
		}
		
		putIncludes(iframeWindow, objIncludes, function(){
			funcRun();
		});
		
		
	}
	
	/**
	 * init the object
	 */
	this.init = function(){
				
		g_objSettingsPanel = jQuery("#elementor-panel");
		
		//initPreviewThumbs();
		
		initAudioControl();
		
		initPostTypeSelectControl();
		
		initEvents();
		
	}
	
	/**
	 * map forms
	 */
	function searchElementorData(data, id){
		
		//get from last opened object
		if(id == window.ucLastElementorModelID){
			var objSettings = getVal(window.ucLastElementorModel, "settings");
			var objSettingsAttributes = getVal(objSettings, "attributes");
			
			return(objSettingsAttributes);
		}
		
		//if not last opened - search in data
		
		if(id){		//init values
			g_searchDataID = id;
			g_searchData = null;
		}
		
		if(!g_searchDataID)
			return(false);
		
		if(!data)
			return(false);
		
		var isArray = jQuery.isArray(data);
		
		if(isArray == false)
			return(false);
		
		jQuery.each(data, function(index, item){
						
			var elType = getVal(item, "elType");
			var elID = getVal(item, "id");
			var elements = getVal(item, "elements");
			
			if(g_searchDataID == elID){
				
				g_searchData = getVal(item, "settings");
				return(false);
			}
			
			if(elType != "widget" && jQuery.isArray(elements) && elements.length > 0){
				searchElementorData(elements);
				return(true);
			}
			
		});
		
		var settingsOutput = {};
		
		if(g_searchData && jQuery.isArray(g_searchData) == false)
			settingsOutput = jQuery.extend({}, g_searchData);
			
		return(settingsOutput);
	}
	
	/**
	 * get settings from elementor
	 */
	function getSettingsFromElementor(id){
			
		var data = elementor.config.data;
		
		var objSettings = searchElementorData(data, id);
				
		return(objSettings);
	}
	
	
	/**
	 * on front end element ready
	 * check section backgrounds
	 */
	function onFrontElementReady(element){
					
		var objElement = jQuery(element);
		
		var type = objElement.data("element_type");
		
		if(type != "section")
			return(true);
		
		var id = objElement.data("id");
		//var objSettings = getSettingsFromElementor(id);
		
	}
	
	/**
	 * on elementor panel change
	 * save current attributes
	 */
	function onElementorSectionPanelChange(event, model){
				
		window.ucLastElementorModelID = model.id;
		window.ucLastElementorModel = model.attributes;
				
	}
	
	
	/**
	 * init front end interaction
	 * for section background etc
	 */
	this.initFrontEndInteraction = function(windowFront, elementorFrontend){
				
		//wait for full load of front end object
		if(typeof elementorFrontend.hooks == "undefined"){
			
			setTimeout(function(){
				
				t.initFrontEndInteraction(windowFront, elementorFrontend);
				
			},300);
						
			return(false);
		}
		
		g_windowFront = windowFront;
		
		elementor.hooks.addAction("panel/open_editor/section", onElementorSectionPanelChange);
		
		elementorFrontend.hooks.addAction( 'frontend/element_ready/global', onFrontElementReady); 
		
		
	}
	
}

var g_objUCElementorEditorAdmin = new UniteCreatorElementorEditorAdmin();


jQuery(document).ready(function(){
	g_objUCElementorEditorAdmin.init();
	
});

