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

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UID = 0;

var ModuleWrapper = (function () {
    function ModuleWrapper(dependencies) {
        _classCallCheck(this, ModuleWrapper);

        this.name = createModuleName();
        this.ngModule = window.angular.module(this.name, getDependencies(dependencies));
    }

    _createClass(ModuleWrapper, [{
        key: 'service',
        value: function service(objects) {
            batchRegister('service', this.ngModule, objects);
        }
    }, {
        key: 'controller',
        value: function controller(objects) {
            batchRegister('controller', this.ngModule, objects);
        }
    }, {
        key: 'filter',
        value: function filter(objects) {
            batchRegister('filter', this.ngModule, objects);
        }
    }, {
        key: 'value',
        value: function value(objects) {
            batchRegister('value', this.ngModule, objects);
        }
    }, {
        key: 'provider',
        value: function provider(objects) {
            batchRegister('provider', this.ngModule, objects);
        }
    }, {
        key: 'onConfig',
        value: function onConfig(fn) {
            this.ngModule.config(fn);
        }
    }, {
        key: 'onRun',
        value: function onRun(fn) {
            this.ngModule.run(fn);
        }
    }, {
        key: 'routes',
        value: function routes(routeTable) {
            registerRoutes(this.ngModule, routeTable);
        }
    }, {
        key: 'component',
        value: function component(objects) {
            var modl = this.ngModule;

            Object.keys(objects).forEach(function register(key) {
                var value = objects[key];
                registerComponent(modl, value);
            });
        }
    }, {
        key: 'decorator',
        value: function decorator(name, Decorator) {
            registerDecorator(this.ngModule, name, Decorator);
        }

        /**
         * @param {HTMLElement} element Element where the module should run
         */

    }, {
        key: 'run',
        value: function run(element) {
            return runModule(element, this);
        }
    }]);

    return ModuleWrapper;
})();

function createModuleName() {
    UID++;
    return 'module-' + UID;
}

function getInjectionList(injections) {
    if (Array.isArray(injections)) return injections;

    return injections.split(/,\s?/);
}

function runModule(rootElement, modl) {
    var name = modl.name;
    window.angular.bootstrap(rootElement, [name]);
}

function getDependencies(list) {
    return list.map(function (item) {
        return item.name || item;
    });
}

function batchRegister(methodName, ngModule, objects) {
    Object.keys(objects).forEach(function register(key) {
        var value = objects[key];
        ngModule[methodName](key, value);
    });
}

function registerRoutes(ngModule, routeTable) {
    ngModule.config(['$stateProvider', function registerStates(provider) {
        window.angular.forEach(routeTable, function (config, stateName) {
            return provider.state(stateName, config);
        });
    }]);
}

function registerDecorator(ngModule, serviceName, decoratorFn) {
    ngModule.config(['$provide', function ($provide) {
        $provide.decorator(serviceName, decoratorFn);
    }]);
}

var TYPE_ELEMENT = 'E';
var TYPE_ATTRIBUTE = 'A';
var TYPE_CLASS = 'C';

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
    var config = Component.configure();

    var name = config.name || config.selector;
    var type = TYPE_ELEMENT;

    if (isAttributeSelector(name)) {
        // strip "[" and "]"
        name = name.slice(1, name.length - 1);
        type = TYPE_ATTRIBUTE;
    } else if (isClassSelector(name)) {
        // strip .
        name = name.slice(1);
        type = TYPE_CLASS;
    }

    var normalizedName = toCamelCase(name);

    var directive = {
        restrict: type,
        replace: !!config.replace,
        templateUrl: config.templateUrl,
        template: config.template,
        controller: Component,
        require: config.require,
        controllerAs: normalizedName,
        scope: config.bindings || true,
        priority: config.priority || 0,
        name: normalizedName
    };

    if (Component.link) {
        directive.link = Component.link;
    } else if (Component.compile) {
        directive.compile = Component.compile;
    }

    var factory = function factory() {
        return directive;
    };

    ngModule.directive(normalizedName, factory);
}

function isAttributeSelector(name) {
    return name.charAt(0) === '[';
}

function isClassSelector(name) {
    return name.charAt(0) === '.';
}

var DASH_CASE = /([-]{1,}[a-z]{1})/g;
var DASH = /-/g;

function toCamelCase(value) {
    return String(value).replace(DASH_CASE, camelize);
}

function camelize(match, part) {
    return part.replace(DASH, '').toUpperCase();
}

var di = (function () {
    function di() {
        _classCallCheck(this, di);
    }

    _createClass(di, null, [{
        key: 'module',

        /**
         * Create or access a module by name
         * @param {String} name Module name
         * @param {String[]} [dependencies]
         */
        value: function module() {
            var dependencies = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

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

    }, {
        key: 'inject',
        value: function inject(target, injections) {
            if (!injections) return;

            var list = getInjectionList(injections);

            if (list && list.length) {
                target.$inject = list;
            }
        }
    }]);

    return di;
})();

exports.di = di;
