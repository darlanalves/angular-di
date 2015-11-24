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

function makeModule (name, dependencies = []) {
    if (name in modules) {
        return modules[name];
    }

    const ngModule = angular.module(name, getDependencies(dependencies));
    const wrapper = {
        name: name,
        service: batchRegister('service', ngModule),
        controller: batchRegister('controller', ngModule),
        directive: batchRegister('directive', ngModule),
        filter: batchRegister('filter', ngModule),
        value: batchRegister('value', ngModule),
        config: ngModule.config.bind(ngModule),
        run: ngModule.run.bind(ngModule),
        routes: registerRoutes.bind(ngModule),
        component: registerComponent.bind(ngModule),
        decorator: registerDecorator.bind(ngModule)
    };

    return (modules[name] = wrapper);
}

function runModule (rootElement, modl) {
    let name = modl.name;
    window.angular.bootstrap(rootElement, [name]);
}

function getDependencies (list) {
    return list.map(item => item.name || item);
}

function batchRegister (methodName, ngModule) {
    return function registerAll(objects) {
        Object.keys(objects).forEach(function register(key) {
            let value = objects[key];
            ngModule[methodName](key, value);
        });
    };
}

function registerRoutes (routeTable) {
    this.config(['$stateProvider', function registerStates(provider) {
        angular.forEach(routeTable, (config, stateName) => provider.state(stateName, config));
    }]);
}

function registerDecorator (serviceName, decoratorFn) {
    this.config(['$provide', function ($provide) {
        $provide.decorator(serviceName, decoratorFn);
    }]);
}

const TYPE_ELEMENT = 'E';
const TYPE_ATTRIBUTE = 'A';
const TYPE_CLASS = 'C';

function registerComponent (Component) {
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

    this.directive(directive);
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

const di = {
    module: makeModule,
    run: runModule
};

export { di };