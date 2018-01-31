# angular-di

Decouple your ES6 code from the AngularJS

## Why

With a better tooling, like browserify, babel and karma, you can write faster tests with total control of your units.

## Example

Let's write a service

```js
import { di } from 'angular-di';
import { FooService } from 'app/foo.service'

class FooService {
	constructor($http, $q) { }
}

// annotations to protect from minifier problems
di.inject(FooService, '$http, $q')

```

And a controller

```js

class HomeController {
	constructor(FooService) {
		this.service = FooService;
	}

	// ...
}


```

Write a file to import your stuff


```js

import { di } from 'angular-di';

// external dependencies
import uiRouter from 'angular-ui-router';

import { routes } from 'src/routes';
import { FooService } from 'src/foo.service';

// declare app and his dependencies
let app = di.module([ 'ui.router' ]);

app.service({ FooService });

// declares the routes into ui.router
app.routes(routes);

app.onConfig(() => {
    // configure
});

app.onRun(() => {
    // run
});

app.run(document.body);

```

Routes

```js

let routes = {
	'app': {
		url: '',
		templateUrl: 'index.html'
	},
	'app.home': {
		templateUrl: 'home.html',
		controller: 'HomeController'
	}
}
```
