'use strict';

var applicationContext = require('../../autowiring');

applicationContext.componentScan(__dirname, {
	config: {
		match: /^(\w+)-config\.js$/,
		regist: "config::$1"
	},
	models: {
		match: /^(\w+)\.js$/,
		regist: "model::$1"
	}
});

applicationContext.componentScan(__dirname, [ 'services', 'controllers' ]);
applicationContext.addItem('entities', require('./entities'));
applicationContext.autowire(function (err) {
	if (err) {
		console.log(err);
	} else {
		var anothersvc = applicationContext.get('another-service');

		anothersvc.print();
	}
});
