'use strict';

/**
 * Angular 1.x dependency injection wrapper for ES6 projects
 *
 * @example
 *     // load di, app units (services, components...) and run the app
 *
 *     import { di } from 'di';
 *     import { uiRouter } from 'angular-ui-router';
 *     import { routes } from 'src/routes';
 *     import { FooService } from 'src/foo.service';
 *     import { BarService } from 'src/bar.service';
 *     import { FooComponent } from 'src/foo.component';
 *
 *     const app = di.module('app', [uiRouter]);
 *     app.component({ FooComponent });
 *     app.service({ FooService, BarService });
 *
 *     di.run(document.body, app);
 */
const angular = window.angular;
let modules = {};

class ModuleWrapper {
    constructor(name, dependencies) {
        this.name = name;
        this.ngModule = angular.module(name, getDependencies(dependencies));
    }

    service(objects) {
        batchRegister('service', this.ngModule, objects);
    }

    controller(objects) {
        batchRegister('controller', this.ngModule, objects);
    }

    filter(objects) {
        batchRegister('filter', this.ngModule, objects);
    }

    value(objects) {
        batchRegister('value', this.ngModule, objects);
    }

    provider(objects) {
        batchRegister('provider', this.ngModule, objects);
    }

    onConfig(fn) {
        this.ngModule.config(fn);
    }

    onRun(fn) {
        this.ngModule.run(fn);
    }

    routes(routeTable) {
        registerRoutes(this.ngModule, routeTable);
    }

    component(Component) {
        registerComponent(this.ngModule, Component);
    }

    decorator(name, Decorator) {
        registerDecorator(this.ngModule, name, Decorator);
    }

    /**
     * @param {HTMLElement} element Element where the module should run
     */
    run(element) {
        return runModule(element, this);
    }
}

/**
 * @param {Function} target Injectable factory
 * @param {String[]} injections Array with the name of all injectable entities
 */
function inject (target, injections) {
    target.$inject = injections;
}

class di {
    /**
     * Create or access a module by name
     * @param {String} name Module name
     * @param {String[]} [dependencies]
     */
    static module(name, dependencies = []) {
        return makeModule(name, dependencies);
    }
}

function runModule (rootElement, modl) {
    let name = modl.name;
    window.angular.bootstrap(rootElement, [name]);
}

function getDependencies (list) {
    return list.map(item => item.name || item);
}

function batchRegister (methodName, ngModule, objects) {
    Object.keys(objects).forEach(function register(key) {
        let value = objects[key];
        ngModule[methodName](key, value);
    });
}

function registerRoutes (ngModule, routeTable) {
    ngModule.config(['$stateProvider', function registerStates(provider) {
        angular.forEach(routeTable, (config, stateName) => provider.state(stateName, config));
    }]);
}

function registerDecorator (ngModule, serviceName, decoratorFn) {
    ngModule.config(['$provide', function ($provide) {
        $provide.decorator(serviceName, decoratorFn);
    }]);
}

const TYPE_ELEMENT = 'E';
const TYPE_ATTRIBUTE = 'A';
const TYPE_CLASS = 'C';

function registerComponent (ngModule, Component) {
    var name = String(Component.name || Component.selector);
    var type = TYPE_ELEMENT;

    if (isAttributeSelector(name)) {
        // strip "[" and "]"
        name = name.slice(1, name.length - 1);
        type = TYPE_ATTRIBUTE;
    } else

    if (isClassSelector(name)) {
        // strip .
        name = name.slice(1);
        type = TYPE_CLASS;
    }

    let directive = {
        restrict: type,
        replace: !!Component.replace,
        templateUrl: Component.templateUrl,
        controller: Component,
        require: Component.require,
        controllerAs: name,
        scope: Component.bind || true,
        name: toCamelCase(name)
    };

    if (Component.link) {
        directive.link = Component.link;
    } else

    if (Component.compile) {
        directive.compile = Component.compile;
    }

    ngModule.directive(directive);
}

function isAttributeSelector (name) {
    return (name.charAt[0] === '[');
}

function isClassSelector (name) {
    return (name.charAt(0) === '.');
}

const DASH_CASE = /([-]{1,}[a-z]{1})/g;
const DASH = /-/g;

function toCamelCase (value) {
    return String(value).replace(DASH_CASE, camelize);
}

function camelize (match, part) {
    return part.replace(DASH, '').toUpperCase();
}

function makeModule (name, dependencies) {
    if (name in modules) {
        return modules[name];
    }

    let wrapper = new ModuleWrapper(name, dependencies);

    return (modules[name] = wrapper);
}


export { di, inject };
