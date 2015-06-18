(function (angular) {
	function ngParseProvider () {
		var internal = {};

		internal.credentials = {
			appId: '',
			jsKey: ''
		};

		internal.methodsToUpdate = {
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
				instance: ['find', 'first', 'count', 'get'],
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
			'Config': {
				instance: [],
				class: ['get']
			}
		};

		internal.generateProps = function (instance, fields) {
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
		};

		internal.enablePropAccess = function (instance, fields) {
			if (typeof Object.defineProperties != 'undefined') {
				Object.defineProperties(
					instance,
					internal.generateProps(instance, fields)
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
		};
		
		this.initialize = function (appId, jsKey) {
			internal.credentials.appId = appId;
			internal.credentials.jsKey = jsKey;
		};

		this.$get = function ($window, $q) {
			// fail if the vendor Parse sdk is not available
			if (angular.isUndefined($window.Parse))
				throw new Error('Parse SDK not available');

			// get a copy, not a reference
			var ngParse = angular.copy($window.Parse);

			ngParse.initialize(
				internal.credentials.appId,
				internal.credentials.jsKey
			);
			
			function getWrappedMethod(type, k, method) {
				var origMethod;
				
				if (type === 'instance') {
					origMethod = $window.Parse[k].prototype[method];
				} else if (type === 'class') {
					origMethod = $window.Parse[k][method];
				}
				
				return function () {
					// perhaps the passed context should be $window.Parse?
					var deferred = $q.defer(),
						parsePromise = origMethod.apply(ngParse, arguments);
	
					parsePromise.then(function (data) {
						deferred.resolve(data);
					}, function (error) {
						deferred.reject(error);
					});
	
					return deferred.promise;
				};
			};

			for (var k in internal.methodsToUpdate) {
				for (var method in internal.methodsToUpdate[k].instance) {
					ngParse[k].prototype[method] = getWrappedMethod('instance', k, method);
				}
				for (var method in internal.methodsToUpdate[k].class) {
					ngParse[k][method] = getWrappedMethod('class', k, method);
				}
			}

			// this runs for both Object and User since User inherits.
			ngParse.Object.prototype.initialize = function () {
				if (typeof this.fields === 'object')
					internal.enablePropAccess(this, this.fields);
			};

			return ngParse;
		};
	}

	angular
		.module('mcwebb.parse-patch', [])
		.provider('ngParse', ngParseProvider);
})(window.angular);
