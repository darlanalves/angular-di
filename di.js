'use strict';

/**
 * Angular 1.x dependency injection wrapper for ES6 projects
 *
 * @example
 *     // load di, app units (services, components...) and run the app
 *
 *     import { di } from 'di';
 *
 *     // external dependencies
 *     import { uiRouter } from 'angular-ui-router';
 *
 *     import { routes } from 'src/routes';
 *     import { FooService } from 'src/foo.service';
 *     import { BarService } from 'src/bar.service';
 *     import { FooComponent } from 'src/foo.component';
 *
 *     let app = di.module([ uiRouter, 'some.vendor.module' ]);
 *
 *     app.component({ FooComponent });
 *     app.service({ FooService, BarService });
 *     app.routes(routes);
 *
 *     app.onConfig(() => {
 *         // configure
 *     });
 *
 *     app.onRun(() => {
 *         // run
 *     });
 *
 *     app.run(document.body);
 */

let UID = 0;

class ModuleWrapper {
    constructor(dependencies) {
        this.name = createModuleName();
        this.ngModule = window.angular.module(this.name, getDependencies(dependencies));
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

    component(objects) {
        let modl = this.ngModule;

        Object.keys(objects).forEach(function register(key) {
            let value = objects[key];
            registerComponent(modl, value);
        });
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

function createModuleName () {
    UID++;
    return `module-${UID}`;
}

function getInjectionList(injections) {
    if (Array.isArray(injections)) return injections;

    return injections.split(/,\s?/);
}

function runModule(rootElement, modl) {
    let name = modl.name;
    window.angular.bootstrap(rootElement, [name]);
}

function getDependencies(list) {
    return list.map(item => item.name || item);
}

function batchRegister(methodName, ngModule, objects) {
    Object.keys(objects).forEach(function register(key) {
        let value = objects[key];
        ngModule[methodName](key, value);
    });
}

function registerRoutes(ngModule, routeTable) {
    ngModule.config(['$stateProvider', function registerStates(provider) {
        window.angular.forEach(routeTable, (config, stateName) => provider.state(stateName, config));
    }]);
}

function registerDecorator(ngModule, serviceName, decoratorFn) {
    ngModule.config(['$provide', function($provide) {
        $provide.decorator(serviceName, decoratorFn);
    }]);
}

const TYPE_ELEMENT = 'E';
const TYPE_ATTRIBUTE = 'A';
const TYPE_CLASS = 'C';

/**
 * Register a directive using a more friendly interface
 * @example
 *     class CustomTabset {
 *         static compile() {}
 *
 *         static link() {}
 *
 *         static configure() {
 *             return CustomTabsetComponent
 *         }
 *
 *         openTab(id) {}
 *     }
 *
 *     let CustomTabsetComponent = {
 *         selector: '[custom-tabset]',
 *         replace: true,
 *         templateUrl: 'tabs/tabset.html',
 *         require: 'otherDirective',
 *         bindings: {
 *             active: '='
 *         }
 *     }
 */
function registerComponent(ngModule, Component) {
    let config = Component.configure();

    var name = config.name || config.selector;
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

    let normalizedName = toCamelCase(name);
    let hasBindings = Boolean(config.bindings && typeof config.bindings === 'object');

    let directive = {
        restrict: type,
        replace: !!config.replace,
        templateUrl: config.templateUrl,
        template: config.template,
        controller: Component,
        require: config.require,
        controllerAs: normalizedName,
        scope: ('bindings' in config) ? config.bindings : true,
        bindToController: hasBindings,
        priority: config.priority || 0,
        name: normalizedName
    };

    if (Component.link) {
        directive.link = Component.link;
    } else

    if (Component.compile) {
        directive.compile = Component.compile;
    }

    let isComponent = isComponentConfiguration(directive);

    // Angular 1.5 component
    if (isComponent) {
        directive = {
            controller: Component,
            bindings: ('bindings' in config) ? config.bindings : {},
            templateUrl: config.templateUrl,
            template: config.template,
            require: config.require || null,
            controllerAs: config.alias || '$ctrl',
            name: normalizedName
        };
        ngModule.component(normalizedName, directive);
    } else {
        let factory = () => directive;
        ngModule.directive(normalizedName, factory);
    }
}

function isComponentConfiguration(directive) {
    let isDirective =
        directive.link ||
        directive.compile ||
        directive.restrict !== 'E' ||
        typeof directive.require === 'string' ||
        Array.isArray(directive.require) ||
        directive.priority;

    return !isDirective;
}

function isAttributeSelector(name) {
    return (name.charAt(0) === '[');
}

function isClassSelector(name) {
    return (name.charAt(0) === '.');
}

const DASH_CASE = /([-]{1,}[a-z]{1})/g;
const DASH = /-/g;

function toCamelCase(value) {
    return String(value).replace(DASH_CASE, camelize);
}

function camelize(match, part) {
    return part.replace(DASH, '').toUpperCase();
}

class di {
    /**
     * Create or access a module by name
     * @param {String} name Module name
     * @param {String[]} [dependencies]
     */
    static module(dependencies = []) {
        return new ModuleWrapper(dependencies);
    }

    /**
     * @ignore
     * @param {Function} target Injectable factory
     * @param {String|String[]} injections Array with the name of all injectable entities
     * @example
     *     inject(MyController, 'foo, bar, baz');
     *     inject(MyController, ['foo', 'bar', 'baz']);
     */
    static inject(target, injections) {
        if (!injections) return;

        let list = getInjectionList(injections);

        if (list && list.length) {
            target.$inject = list;
        }
    }
}

export { di };
