'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');

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
		console.log("Regist: [ " + key + " ]");
		this.providers[key] = obj;
	}
}

Repository.prototype.get = function (key) {
	if (this.providers.hasOwnProperty(key)) {
		if (this.providers[key].injected) {
			return this.providers[key].obj;
		} else {
			throw new Error('Key [ ' + key + ' ] not injected yet!');
		}
	} else {
		throw new Error('Key [ ' + key + ' ] not found!');
	}
	return undefined;
}

function scanfiles (scandir) {
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

Repository.prototype.componentScan = function (basedir, dirs) {
	var self = this;

	if (dirs instanceof Array) {
		for (var i = 0; i < dirs.length; i++) {
			scanfiles (path.join(basedir, dirs[i]));
		}
	} else if (typeof dirs === 'string') {
		scanfiles(path.join(basedir, dirs))
	} else if (typeof dirs === 'object') {
		for (var key in dirs) {
			if (dirs.hasOwnProperty(key)) {
				var element = dirs[key];
				var d = path.join(basedir, key);
				
				fs.readdirSync(d).forEach (
					function (file) {
						if (file.match(element.match)) {
							new Instance (file.replace(element.match, element.regist), require(path.join(d, file)));
						}
					}
				);
			}
		}
	}
};

Repository.prototype.autowire = function (timeout, callback) {
	var done = false;
	var self = this;
	var loop = 0;

	if (typeof timeout === 'function') {
		callback = timeout;
		timeout = 30;
	}

	async.until(
		function () {
			return done;
		},
		function (callback) {
			var haveInject = false;
			done = true;

			async.forEachOfSeries(self.providers,
				function (item, key, callback) {
					if (! item.injected) {
						var args = {};
						var injectable = true;
						var dependence = null;

						if (item.obj.depends instanceof Array)
							dependence = item.obj.depends;
						else if (typeof(item.obj.depends) === 'string')
							dependence = [ item.obj.depends ];

						if (dependence !== null) {
							for (var i = 0; i < dependence.length; i++) {
								var rkey = dependence[i];

								if (self.providers.hasOwnProperty(rkey)) {
									if (self.providers[rkey].injected) {
										args[rkey] = self.providers[rkey].obj;
									} else {
										injectable = false;
										done = false;
										break;
									}
								} else {
									callback(new Error("missing dependency target: " + rkey));
									injectable = false;
									done = true;
									return;
								}
							}
						}

						if (injectable) {
							if (typeof item.obj.injectSync === 'function')
								item.obj.injectSync(args);

							if (typeof item.obj.inject === 'function') {
								// console.log('Async Inject', key);
								var timerknock = setTimeout(function() {
						            console.log('[autowiring] - Async Injection of [', key, '] took a little too long, forget to issue the callback?');
								}, 20 * 1000);

								item.obj.inject(args, function (err) {
									item.injected = true;
									haveInject = true;
									// console.log('Async Inject', key, ' (done.)');
									clearTimeout(timerknock);
									callback(err);
								});
							} else {
								haveInject = true;
								item.injected = true;
								callback(null);
							}
						} else {
							callback (null); // not injectable ... next
						}
					} else {
						callback (null); // already injected ... next
					}
				}, 
				function (err) {
					if (err) {
						callback(err);
					} else if (! haveInject) {
						callback(new Error("dependency loop"));
					} else {
						callback(null);
					}
				}
			);
		},
		function (err) {
			if (typeof callback === 'function') callback(err);
		}
	);
};

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

exports.autowire = function (callback) {
	repos.autowire(callback);
}

exports.componentScan = function (basedir, dirs) {
	return repos.componentScan(basedir, dirs);
}

exports.get = function (key) {
	return repos.get(key);
}

exports.version = "0.0.3";
