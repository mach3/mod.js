
# mod.js [under development]

Class library and module container for jQuery.


## Basic Usage

### Class

```javascript
var Person = mod.Class({
	_extends: ["attributes"],
	_attributes: {
		name: null,
		age: null
	},
	_initialize: function(name, age){
		this.attr({
			name: name,
			age: age
		});
	},
	hello: function(){
		var o = this.attr();
		return mod.util.format(
			"Hi, I'm %s, %s years old",
			o.name,
			o.age
		);
	}
});


var john = new Person("john", 23);
john.hello(); // => "Hi, I'm john, 23 years old"
```

### Define module

```javascript

// Define module
mod.exports("person", mod.Class({
	_extends: ["attributes"],
	_attributes: {
		name: null,
		age: null
	},
	hello: function(){
		var o = this.attr();
		return mod.util.format(
			"Hi, I'm %s, %s years old",
			o.name,
			o.age
		);
	}
}));
```

### Use module

```javascript

// Get the instance of the module
var bob = mod.require("person");
bob.attr({
	name: "bob",
	age: 32
});
bob.hello(); // => "I'm bob, 32 years old"

// Once required, the instance is saved
mod.require("person").hello(); // => "I'm bob, 32 years old"

// Pass `true` to 2nd argument to require new instance
// (ignore the instance which is already created)
var tom = mod.require("person", true);
tom.attr({
	name: "tom",
	age: 28
});
tom.hello(); // => "I'm tom, 28 years old"
```

### Extend module

```javascript
mod.exports("engineer", mod.Class({
	_extends: ["person"], // <= extends person module
	writeCode: function(){ ... },
	debug: function(){ ... }
}));
```

## Router Module

```javascript
var routes = mod.require("routes", true);
routes.config({
	mode: "pathname", // "pathname" or "hash"
	defaultPath: "/"
})
.map({
	"^/$": "action-default",
	"^/topics": "action-topics",
	"^/profile": "action-profile"
})
.resolve()
.watch();
```

Be sure to define action module.

```javascript
mod.exports("action-default", mod.Class({
	_initialize: function(){
		// Run once when firstly resolved
	},
	_onRoute: function(){
		// Run everytime when resolved
	}
}));
```

Other way to define rules.

```javascript
routes.action("^/$", mod.Class(...));
routes.action("^/$", function(){ ... });
routes.action({
	rule: function(){
		return true;
	},
	action: function(){ ... }
})
```

## Built-in modules

- class
- config
- attributes
- events
- collection
- observer
- routes
