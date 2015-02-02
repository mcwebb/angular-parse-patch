/*
 * Part of mcwebb/angular-parse-patch
 * Coypyright 2015 Matthew Webb <matthewowebb@gmail.com>
 * MIT License
 * Based on @brandid/parse-angular-patch released under the MIT license (2014)
 */
(function (window) {
	var angular = window.angular,
		module = angular.module('mcwebb.parse-patch', []),
		methodsToUpdate = {
			'Object': {
				instance: ['destroy', 'fetch', 'save'],
				// 'fetchAll' and 'saveAll' not advertised as returning promise but currently does
				class: ['destroyAll', 'fetchAll', 'saveAll']
			},
			'Collection': {
				instance: ['fetch'],
				class: []
			},
			'Query': {
				// 'get' not advertised as returning promise but currently does
				instance: ['count', 'each', 'find', 'first', 'get'],
				class: []
			},
			'Cloud': {
				instance: [],
				class: ['httpRequest', 'run']
			},
			'User': {
				instance: ['logIn', 'signUp'],
				// 'requestPasswordReset' not advertised as returning promise but currently does
				class: ['become', 'logIn', 'requestPasswordReset', 'signUp']
			},
			'FacebookUtils': {
				instance: [],
				class: ['logIn', 'link', 'unlink']
			},
			'File': {
				instance: ['save'],
				class: []
			},
			'Promise': {
				instance: [],
				class: ['send']
			}
		};

	module.provider('ngParse', function () {
		var credentials = {
			appId: '',
			jsKey: ''
		};

		this.initialize = function (appId, jsKey) {
			credentials.appId = appId;
			credentials.jsKey = jsKey;
		};

		this.$get = function ($window, $rootScope, $q) {
			// fail if the vendor Parse sdk is not available
			if (angular.isUndefined($window.Parse))
				throw new Error('Parse SDK not available');

			// get a copy to retrofit
			var ngParse = $window.Parse;

			ngParse.initialize(
				credentials.appId,
				credentials.jsKey
			);

			// loop over ngParse objects
			for (var k in methodsToUpdate) {
				var currentClass = k;
				var currentObject = methodsToUpdate[k];

				/// Patching instance methods
				currentObject.instance.forEach(function (method) {
					var origMethod = ngParse[currentClass].prototype[method];
					// run the original function but return an angular promise
					ngParse[currentClass].prototype[method] = function () {
						var parsePromise = origMethod.apply(this, arguments),
							defer = $q.defer();
						parsePromise.then(function (data) {
							defer.resolve(data);
						}, function (err) {
							defer.reject(err);
						});
						return defer.promise;
					};
				});

				// patching class methods too
				currentObject.class.forEach(function (method) {
					var origMethod = ngParse[currentClass][method];
					// run the original function but return an angular promise
					ngParse[currentClass][method] = function () {
						var parsePromise = origMethod.apply(this, arguments),
							defer = $q.defer();
						parsePromise.then(function (data) {
							defer.resolve(data);
						}, function (err) {
							defer.reject(err);
						});
						return defer.promise;
					};
				});
			}

			/*
			 * Including the below would allow custom initialization on User
			 * objects without calling the parent. But the same can't be
			 * accomplished for the Parse.Object, so for the sake of consistency
			 * I have left it out.
				// no need to overwrite anything, Parse knows.
				ngParse.User.extend({
					constructor: function () {
						if (typeof this.fields === 'object')
							enablePropAccess(this, this.fields);
						ngParse.Object.apply(this, arguments);
					}
				});
			*/

			// this runs for both Object and User since User inherits.
			ngParse.Object.prototype.initialize = function () {
				if (typeof this.fields === 'object')
					enablePropAccess(this, this.fields);
			};

			return ngParse;
		};
	});

	function generateProps(instance, fields) {
		var props = {};
		angular.forEach(fields, function (name) {
			props[name] = {
				get: function () {
					return instance.get(name);
				},
				set: function (value) {
					instance.set(name, value);
				}
			};
		});
		return props;
	}

	function enablePropAccess(instance, fields) {
		if (typeof Object.defineProperties != 'undefined') {
			Object.defineProperties(
				instance,
				generateProps(instance, fields)
			);
		} else {
			angular.forEach(fields, function (name) {
				instance.__defineGetter__(name, function () {
					return instance.get(name);
				});
				instance.__defineSetter__(name, function (value) {
					return instance.set(name, value);
				});
			});
		}
	}
}) (this);
