'use strict';

var ldapconf;

exports.depends = [ 'config::ldap' ];
exports.provide = 'ldap-service';

exports.injectSync = function (args) {
	ldapconf = args['config::ldap'];
};

exports.print = function () {
	console.log(ldapconf);
};
