'use strict';

var fs = require('fs');

var ldapsvc;
var oidpcfg;
var filelist;

exports.depends = [ 'ldap-service', 'config::oidp' ];

// use "exports.inject" when injection must be 
exports.inject = function (args, callback) {
	ldapsvc = args['ldap-service'];
	oidpcfg = args['config::oidp'];

	fs.readdir('.', function (err, list) {
		filelist = list;
		callback(err);
	});
};

exports.print = function () {
	console.log(__filename);
	ldapsvc.print();
	console.log(oidpcfg);
	console.log(filelist);
};
