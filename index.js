function Repository() {
	this.providers = {};
}

Repository.prototype.add = function (key, obj) {
	if (this.providers.hasOwnProperty(key)) {
		throw new Error('Duplicate key: ' + key);
	} else {
		this.providers[key] = obj;
	}
}

Repository.prototype.autowire = function () {
	var done = false;

	while (! done) {
		var haveInject = false;
		done = true;

		for (var key in this.providers) {
			if (this.providers.hasOwnProperty(key)) {
				var item = this.providers[key];

				if (! item.injected) {
					var args = {};
					var injectable = true;
					var dependence = null;

					if (item.obj.depends instanceof Array) {
						dependence = item.obj.depends;
					} else if (typeof(item.obj.depends) === 'string') {
						dependence = [ item.obj.depends ];
					}

					if (dependence !== null) {
						for (var i = 0; i < dependence.length; i++) {
							var rkey = dependence[i];

							if (this.providers.hasOwnProperty(rkey)) {
								if (this.providers[rkey].injected) {
									args[rkey] = this.providers[rkey].obj;
								} else {
									injectable = false;
									done = false;
									break;
								}
							} else {
								throw new Error("missing dependency target: " + rkey);
							}
						}
					}

					if (injectable) {
						item.obj.inject(args);
						item.injected = true;
						haveInject = true;
					}
				}
			}
		}
		if (! haveInject) {
			throw new Error("dependency loop");
		}
	}
}

var repos = new Repository();

function Instance(o) {
	this.obj = o;
	this.injected = false;

	if (this.obj.provide instanceof Array) {
		for (var i = 0; i < this.obj.provide.length; i++) {
			var key = this.obj.provide[i];
			repos.add (key, this);
		}
	} else if (typeof(this.obj.provide) === 'string') {
		repos.add (this.obj.provide, this);
	}
}

exports.addItem = function addItem(obj) {
	new Instance (obj);
}

exports.autowire = function () {
	repos.autowire();
}

exports.version = "0.0.1";
