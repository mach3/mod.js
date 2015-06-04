(function($, global){
	"use strict";

	/**
	 * Utility Functions
	 * -----------------
	 */
	var u = {
		/**
		 * Return escaped string
		 * @param {String} str
		 */
		escapeHTML: function(str){
			return $("<i>").append(document.createTextNode(str)).html();
		},
		/**
		 * Return formatted string
		 * @param {String} template
		 * @param {String,String,...} value
		 */
		format: function(){
			var args = u.toArray(arguments);
			return args.shift().replace(/%s/g, function(){
				return args.length ? args.shift() : "";
			});
		},
		/**
		 * Reversely process item in the list
		 * @param {Array} list
		 * @param {Function} callback
		 */
		forReverse: function(list, callback){
			var i = list.length;
			while(i--){
				if(false === callback(list[i], i)){ return; }
			}
		},
		/**
		 * Find descendant in the object by dot syntax expression
		 * - path({...}, "the.path.to");
		 * @param {Object} obj
		 * @param {String} key
		 */
		path: function(obj, key){
			var o = obj;
			$.each(key.split("."), function(i, p){
				if(o === void 0){ return false; }
				o = o[p];
			});
			return o;
		},
		/**
		 * Serialize values in form to key-value object
		 * @param {HTMLFormElement|String} form
		 * @returns {Object}
		 */
		serialize: function(form){
			var data = {};
			$(form).serializeArray().forEach(function(item){
				if(data[item.name] !== void 0){
					if(! u.type(data[item.name], "Array")){
						data[item.name] = [data[item.name]];
					}
					return data[item.name].push(item.value);
				}
				data[item.name] = item.value;
			});
			return data;
		},
		/**
		 * Simple template function
		 * - Render instantly if vars passed
		 * - Return rendering function if vars omitted
		 * - {{name}} {{prop.name}}
		 * - {{{name}}} {{{prop.name}}} (not escaped)
		 * @param {String} template
		 * @param {Object} vars
		 * @param {Boolean} jqobj
		 * @returns {Function|String|jQueryObject}
		 */
		template: function(template, vars, jqobj){
			var func = function(vars, jqobj){
				var html = template.replace(/([\{]{2,3})([\w\.\-]+?)(?:[\}]{2,3})/g, function(a, b, c){
					var value = u.path(vars, c);
					value = (value === void 0) ? "" : value;
					value = (b.length > 2) ? value : u.escapeHTML(value);
					return value;
				});
				return jqobj ? $("<i>").append(html).children() : html;
			};
			return arguments.length === 1 ? func : func(vars, jqobj);
		},
		/**
		 * Juggle object to array
		 * @param {*} obj
		 * @returns {Array}
		 */
		toArray: function(obj){
			return Array.prototype.slice.call(obj);
		},
		/**
		 * Get or test type of object
		 * @param {*} obj
		 * @param {String} test
		 */
		type: function(obj, test){
			var m, type;
			m = Object.prototype.toString.call(obj).match(/^\[object\s(\w+)\]$/);
			type = m ? m[1] : void 0;
			return test ? type === test : type;
		}
	};

	/**
	 * Core object
	 * -----------
	 */
	var mod = {

		_modules: {}, // container for modules
		_instances: {}, // container for instances of modules
		_logging: false, // flush log or not

		/**
		 * Define module as name
		 * - If same-named module exists, flush error
		 * - If override, module is defined even if same-named module exists
		 * @param {String} name
		 * @param {*} data
		 * @param {Boolean} override (false)
		 */
		exports: function(name, data, override){
			if((name in this._modules) && ! override){
				this.error("module '" + name + "' already exists");
			} else {
				this._modules[name] = data;
			}
			return this;
		},

		/**
		 * Get instance of module
		 * - If not function, return as is
		 * @param {String} name
		 * @returns {*}
		 */
		getInstance: function(name){
			var obj = this.find(name);
			return u.type(obj, "Function") ? new obj() : obj;
		},

		/**
		 * Get instance of module
		 * - If the instance already exists in mod._instances, return it
		 * - If `force` is true, ignore existane, return new one
		 * @param {String} name
		 * @param {Boolean} force (false)
		 * @returns {*}
		 */
		require: function(name, force){
			var inst;
			if(! force && name in this._instances){
				return this._instances[name];
			}
			inst = this.getInstance(name);
			if(! force){
				this._instances[name] = inst;
			}
			return inst;
		},

		/**
		 * Find module by name
		 * - If not exists, return `undefined`
		 * @param {String} name
		 * @returns {*}
		 */
		find: function(name){
			return this._modules[name] || void 0;
		},

		/** 
		 * Call console.log if mod._logging is true
		 * @param {*}
		 */
		log: function(){
			if(this._logging && console && console.log){
				console.log.apply(console, arguments);
			}
			return this;
		},

		/**
		 * Call console.error if mod._logging is true
		 * @param {*}
		 */
		error: function(){
			if(this._logging && console && console.error){
				console.error.apply(console, arguments);
			}
			return this;
		}
	};

	/**
	 * Create class object
	 * @param {Object} props
	 * @returns {Functions}
	 */
	mod.Class = function(props){
		var C = function(){
			var my, init, args;
			my = this;
			args = arguments;
			init = function(par){
				if(u.type(par._parents, "Array")){
					u.forReverse(par._parents, init);
				}
				if(u.type(par._initialize, "Function")){
					par._initialize.apply(my, args);
				}
			};
			u.forReverse(this._parents, init);
		};
		C.extend = mod.Class.extend;
		C.new = mod.Class.new;
		C.extend(props, true);
		C.extend("class");
		if(props._extends instanceof Array){
			props._extends.forEach(function(p){
				C.extend(p);
			});
		}
		return C;
	};

	/**
	 * Extend prototype of class-function
	 * - This is appended to class-function (returned by mod.Class)
	 * - Pass override `true` to override each properties
	 * @param {Object, Object, ...} props, props, ...
	 * @param {Boolean} override
	 */
	mod.Class.extend = function(/* props, override */){
		var my, args, override, props;

		my = this;
		args = u.toArray(arguments);
		override = false;

		if(u.type(args[args.length - 1], "Boolean")){
			override = args.pop();
		}

		if(args.length > 1){
			$.each(args, function(i, props){
				my.extend(props, override);
			});
			return this;
		}

		props = u.type(args[0], "String") ? mod.find(args[0]) : args[0];
		props = u.type(props, "Function") ? props.prototype : props;

		if(override){
			$.extend(true, this.prototype, props);
		} else {
			$.each(props, function(key, value){
				if(key === "_initialize" || key === "_parents" || key in my.prototype){ return; }
				my.prototype[key] = ($.type(value) === "object") ? $.extend(true, {}, value) : value;
			});
		}
		this.prototype._parents = this.prototype._parents || [];
		this.prototype._parents.push(props);
		return this;
	};

	/**
	 * Create new instance of class-function
	 * - This is appended to class-function (returned by mod.Class)
	 * @param {*} 
	 * @returns {Object}
	 */
	mod.Class.new = function(){
		var args = [""].concat(u.toArray(arguments));
		return new (this.bind.apply(this, args))();
	};

	/**
	 * Module: class
	 * -------------
	 * Base features for class-object
	 */
	mod.exports("class", {

		_initialize: function(){
			this.bind(/^_/);
		},

		/**
		 * Bind method to the instance, by name
		 * @param {String|RexExp} name
		 */
		bind: function(name){
			var my, args;
			args = u.toArray(arguments);
			my = this;
			if(args.length > 1){
				$.each(args, function(i, value){
					my.bind(value);
				});
				return this;
			}
			if(u.type(name, "RegExp")){
				$.each(this, function(key, value){
					if(name.test(key) && u.type(value, "Function")){ my.bind(key); }
				});
				return this;
			}
			this[name] = $.proxy(this[name], this);
			return this;
		}
	});

	/**
	 * Module: events
	 * --------------
	 * Events feature (wrapping jQuery.fn.on/off/trigger)
	 */
	mod.exports("events", {

		_emitter: null,

		_initialize: function(){
			var my = this;
			this._emitter = $(this);
			$.each(["on", "off", "trigger"], function(i, name){
				my[name] = function(){
					this._emitter[name].apply(this._emitter, arguments);
					return this;
				}
			});
		}
	});

	/**
	 * Module: config
	 * --------------
	 * Configure options
	 */
	mod.exports("config", {

		_options: null,
		options: null,

		_initialize: function(){
			this.options = $.extend(true, {}, this._options);
		},

		/**
		 * Setter/Getter for options
		 * - .config(key); // => get option by key
		 * - .config(key, value); // => set option by key and value
		 * - .config({key: value}); // => set options by key-value object
		 * - .config(); // => return all options
		 * @param {String} key
		 * @param {*} value
		 */
		config: function(key, value){
			switch(u.type(key)){
				case "String":
					if(arguments.length === 1){
						return this.options[key];
					}
					this.options[key] = value;
					break;
				case "Object":
					$.extend(true, this.options, key);
					break;
				case "Undefined":
					return this.options;
				default: break;
			}
			return this;
		}
	});

	/**
	 * Module: attributes
	 * ------------------
	 * Manupulating attributes
	 */
	mod.exports("attributes", {

		_attributes: null,
		attributes: null,

		_initialize: function(){
			this.attributes = $.extend(true, {}, this._attributes);
		},

		/**
		 * Setter/Getter for attributes
		 * - .attr(key); // => get attribute by key
		 * - .attr(key, value); // => set attribute by key and value
		 * - .attr({key: value}); // => set attributes by key-value object
		 * - .attr(); // => get all attributes
		 * @param {String} key
		 * @param {*} value
		 */
		attr: function(key, value){
			var changed, my = this;
			switch(u.type(key)){
				case "String":
					if(arguments.length === 1){
						return this.attributes[key];
					}
					changed = this.attributes[key] !== value;
					this.attributes[key] = value;
					if(changed && $.isFunction(this.trigger)){
						this.trigger("change", {key: key, value: value});
					}
					break;
				case "Object":
					$.each(key, function(key, value){
						my.attr(key, value);
					});
					return this;
				case "Undefined":
					return this.attributes;
				default: break;
			}
			return this;
		}
	});

	/**
	 * Module: collection
	 * ------------------
	 * Manupulating data collection
	 */
	mod.exports("collection", mod.Class({

		EVENT_UPDATE: "update",

		_extends: ["events"],

		data: null,
		index: -1,

		_initialize: function(){
			this.data = [];
		},

		/**
		 * Add item to the last
		 * @param {Object, Object, ...} item, item, ...
		 */
		push: function(/* item, item... */){
			this.add(arguments, "push");
			return this;
		},

		/**
		 * Add item to the top
		 * @param {Object, Object, ..} item, item, ...
		 */
		unshift: function(/* item, item... */){
			this.add(arguments, "unshift");
			return this;
		},

		/**
		 * Add item by mode
		 * @param {Array|Object} items|item
		 * @param {String} mode ("push")
		 */
		add: function(items, mode){
			var my = this;
			mode = mode || "push";
			items = u.type(items, "Object") ? [items] : items;
			$.each(items, function(i, item){
				item.__id__ = ++my.index;
				my.data[mode](item);
			});
			this.trigger(this.EVENT_UPDATE);
			return this;
		},

		/**
		 * Remove item which callback returns `true`
		 * @param {Function} callback
		 */
		remove: function(callback){
			var data = [], changed = false;
			this.data.forEach(function(item){
				if(callback(item)){
					changed = true;
					return;
				}
				data.push(item);
			});
			this.data = data;
			if(changed){
				this.trigger(this.EVENT_UPDATE);
			}
			return this;
		},

		/**
		 * Get filtered collection by callback (as new array)
		 * @param {Function} callback
		 * @returns {Array}
		 */
		filter: function(callback){
			return $.grep(this.data, callback);
		},

		/**
		 * Find items which matches condition passed as key-value object
		 * @param {Object|String} vars|key
		 * @param {*} value (optional)
		 * @returns {Array}
		 */
		find: function(vars){
			// key, value ?
			if(u.type(vars, "String") && arguments.length > 1){
				vars = {};
				vars[arguments[0]] = arguments[1];
			}
			return this.filter(function(item){
				var valid = true;
				$.each(vars, function(key, value){
					if(item[key] !== value){
						valid = false;
						return false;
					}
				});
				return valid;
			});
		},

		/**
		 * Run process for each item
		 * @param {Function} callback
		 */
		each: function(callback){
			this.get().forEach(callback);
			return this;
		},

		/**
		 * Get an item by index (not id)
		 * - If index ommitted, return all items
		 * @param {Number} index (optional)
		 * @returns {Array|Object}
		 */
		get: function(index){
			if(u.type(index, "Number")){
				return this.data[index] || void 0;
			}
			return this.data;
		}
	}));
	
	/**
	 * Module: observer
	 * ----------------
	 * Watching some object
	 */
	mod.exports("observer", mod.Class({

		EVENT_CHANGE: "change",

		_extends: ["config", "events"],

		_options: {
			target: null, // target object
			property: "", // property name of the object (dot syntax)
			callback: null, // callback function (returned value is to be watched)
			interval: 50 // watching interval
		},

		watching: false,
		util: null,
		latest: void 0,
		timer: null,

		_initialize: function(){
			this.util = mod.require("util");
		},

		/**
		 * Return whether `onhashchange` is available as alternative
		 * @returns {Boolean}
		 */
		isHashChange: function(){
			var o = this.config();
			return ! o.callback && ("onhashchange" in window) && o.target === location && o.property === "hash";
		},

		/**
		 * Start watching
		 */
		watch: function(){
			var o = this.config();
			o.target = o.target || window;
			if(this.isHashChange()){
				$(window).on("hashchange", this._onHashChange);
			} else {
				this.watching = true;
				this._process();
			}
			return this;
		},

		/**
		 * Stop watching
		 */
		unwatch: function(){
			if(this.isHashChange()){
				$(window).off("hashchange", this._onHashChange);
			} else {
				this.watching = false;
				this.timer && clearTimeout(this.timer);
				this.latest = void 0;
			}
			return this;
		},

		/**
		 * Get objective value
		 * @returns {*}
		 */
		value: function(){
			var o = this.config();
			return u.type(o.callback, "Function") ? o.callback() : u.path(o.target, o.property);
		},

		/**
		 * Function for each process
		 */
		_process: function(){
			var o = this.config(), value;
			this.timer && clearTimeout(this.timer);
			if(this.watching){
				value = this.value();
				if(this.latest !== void 0 && this.latest !== value){
					this.trigger(this.EVENT_CHANGE, value);
				}
				this.latest = value;
				this.timer = setTimeout(this._process, o.interval);
			}
		},

		/**
		 * Handler for `hashchange` event
		 */
		_onHashChange: function(){
			var o = this.config();
			this.trigger(this.EVENT_CHANGE, location.hash);
		}
	}));

	/**
	 * Module: routes
	 * --------------
	 * Simple router
	 */
	mod.exports("routes", mod.Class({

		EVENT_ERROR: "error",

		_extends: ["config", "events"],

		_options: {
			mode: "pathname",
			single: false,
			defaultPath: null
		},

		observer: null,
		actions: null,
		util: null,

		_initialize: function(){
			this.observer = mod.require("observer", true)
			.config({ target: location });
			this.actions = [];
		},

		/**
		 * Resolve route
		 * - `value` is optional, location[options.mode] is to be used as default
		 * - Pass `true` as `once` to quit resolving when any action matches
		 * - `once` is optional, options.single is to be used as default
		 * @param {String} value
		 * @param {Boolean} once
		 */
		resolve: function(value, once){
			var o, my, resolved;

			o = this.config();
			my = this;
			resolved = false;
			value = (value === void 0) ? location[o.mode].slice() : value;

			$.each(this.actions, function(i, item){
				var valid = false, args;
				switch(u.type(item.rule)){
					case "RegExp":
						args = value.match(item.rule);
						valid = !! args;
						break;
					case "Boolean": valid = item.rule; break;
					case "Function": valid = item.rule(value); break;
					default: break;
				}
				if(valid){
					if(my.run(item.action, args)){
						resolved = true;
						if(o.single){
							return false;
						}
					}
				}
			});

			if(! resolved){
				this.trigger(this.EVENT_ERROR);
				if(o.defaultPath && ! once){
					this.resolve(o.defaultPath, true);
				}
			}

			return this;
		},

		/**
		 * Run action function
		 * - Called in .resolve()
		 * @param {Function|String} action
		 * @param {Array} args
		 */
		run: function(action, args){
			if(u.type(action, "String")){
				if(u.type(mod.find(action).new, "Function")){
					action = mod.require(action);
				} else {
					action = mod.find(action);
				}
			}
			if(action){
				action = u.type(action.new, "Function") ? action.new.apply(action, args) : action;
				if(u.type(action._onRoute, "Function")){
					action._onRoute.apply(action, args);
				}
				if(u.type(action, "Function")){
					action.apply(action, args);
				}
				return true;
			}
			return false;
		},

		/**
		 * Start or stop watching
		 * @param {Boolean} watch (true)
		 */
		watch: function(watch){
			watch = (watch === void 0) ? true : watch;
			this.observer.unwatch()
			.config({property: this.config("mode")})
			.watch();
			this.observer[watch ? "on" : "off"]("change", this._onChange);
		},

		/**
		 * Stop watching
		 */
		unwatch: function(){
			return this.watch(false);
		},

		/**
		 * Handler for changing
		 */
		_onChange: function(){
			this.resolve();
		},

		/**
		 * Add action
		 * - .action(rule, action);
		 * - .action({rule: rule, action: action});
		 * @param {Object|String|RegExp} rule
		 * @param {Function|String} action
		 */
		action: function(rule, action){
			if(u.type(rule, "Object")){
				return this.action(rule.rule, rule.action);
			}
			rule = u.type(rule, "String") ? new RegExp(rule) : rule;
			if(action){
				this.actions.push({rule: rule, action: action});
			}
			return this;
		},

		/**
		 * Map actions
		 * - .map({__rule_string__: __action_function__});
		 * @param {Object} actions
		 */
		map: function(actions){
			var my = this;
			$.each(actions, function(){
				my.action.apply(my, arguments);
			});
			return this;
		}
	}));
	
	/**
	 * Module: util
	 * ------------
	 */
	mod.exports("util", u);
	mod.util = mod.require("util");

	/**
	 * Exports
	 */
	global.mod = mod;

}(jQuery, this));