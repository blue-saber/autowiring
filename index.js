'use strict';

var fs = require('fs');
var path = require('path');

function Repository() {
	this.providers = {};
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

Repository.prototype.add = function (key, obj) {
	if (this.providers.hasOwnProperty(key)) {
		throw new Error('Duplicate key: ' + key);
	} else {
		this.providers[key] = obj;
	}
}

Repository.prototype.get = function (key) {
	if (this.providers.hasOwnProperty(key)) {
		return this.providers[key].obj;
	}
	return undefined;
}

Repository.prototype.componentScan = function (basedir, dirs) {
	var self = this;

	for (var i = 0; i < dirs.length; i++) {
		var scandir = path.join(basedir, dirs[i]);

		fs.readdirSync(scandir).forEach(function (file) {
			var filepath = path.join(scandir, file);
			var stats = fs.statSync(filepath);

			if (stats.isFile()) {
				if (endsWith(file, ".js")) {
					var fname = file.substr(0, file.indexOf('.'));
					filepath = path.join(scandir, fname);
					
					// self.addItem(fname, require(filepath));
					new Instance (fname, require(filepath))
				}
			} else if (stats.isDirectory()) {
				// self.addItem(file, require(filepath));
				new Instance (file, require(filepath))
			}
		});
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
						console.log('Inject ' + key);

						if (typeof item.obj.inject === 'function') {
							item.obj.inject(args);
						}
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

function Instance(f, o) {
	this.obj = o;
	this.injected = false;

	if (this.obj.provide instanceof Array) {
		for (var i = 0; i < this.obj.provide.length; i++) {
			var key = this.obj.provide[i];
			repos.add (key, this);
		}
	} else if (typeof(this.obj.provide) === 'string') {
		repos.add (this.obj.provide, this);
	} else {
		repos.add (f, this);
	}
}

exports.addItem = function addItem(file, obj) {
	new Instance (file, obj);
}

exports.autowire = function () {
	repos.autowire();
}

exports.componentScan = function (basedir, dirs) {
	return repos.componentScan(basedir, dirs);
}

exports.get = function (key) {
	return repos.get(key);
}

exports.version = "0.0.2";
