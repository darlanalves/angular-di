try {
	module.exports = require('./di');
} catch (e) {
	module.exports = require('./di.es5.js');
}