var angular = require('angular');

var DI = {
	services: [],
	filters: [],
	directives: [],
	controllers: []
};

var moduleMap = new Map();

function service (target) {
	DI.services.push(target);
}

function filter (target) {
	DI.filters.push(target);
}

function directive (target) {
	DI.directives.push(target);
}

function controller (target) {
	DI.controllers.push(target);
}

function ngmodule (name, dependencies) {
	// getter mode
	if (moduleMap.has(name)) {
		return moduleMap.get(name);
	}

	// setter mode
	var dependencyNames = extractDependencies(dependencies);
	var modl = angular.module(name, dependencyNames);

	moduleMap.add(name, modl);

	return modl;
}

function extractDependencies (dependencies) {
	if (Array.isArray(dependencies)) {
		return dependencies.map(extractDependencyName).filter(Boolean);
	}

	return [];
}

function extractDependencyName (dependency) {
	if (null !== dependency && typeof dependency === 'object' && dependency.name) {
		return dependency.name;
	}

	if (typeof dependency === 'string') {
		return dependency;
	}

	return undefined;
}

// service, filter, controller, directive,
module.exports.ngmodule = ngmodule;
