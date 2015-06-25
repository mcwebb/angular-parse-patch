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
			var ngParse = merge({}, [$window.Parse], true);

			ngParse.initialize(
				internal.credentials.appId,
				internal.credentials.jsKey
			);
			
			function getWrappedMethod(type, k, method) {
				return function thisWrappedMethod() {
					var deferred = $q.defer(),
						parsePromise;

					if (type === 'instance') {
						// 'this' will refer to the instance on which the method is being called 
						parsePromise = $window.Parse[k].prototype[method].apply(this, arguments);
					} else if (type === 'class') {
						parsePromise = $window.Parse[k][method].apply(ngParse, arguments);
					}
					
					// thisWrappedMethod.caller 
					parsePromise.then(function (data) {
						deferred.resolve(data);
					}, function (error) {
						deferred.reject(error);
					});
	
					return deferred.promise;
				};
			};

			var method, methodName;
			for (var k in internal.methodsToUpdate) {
				for (method in internal.methodsToUpdate[k].instance) {
					methodName = internal.methodsToUpdate[k].instance[method];
					// need to break the reference between window.Parse and ngParse 
					// this doesn't work because it seems that the whole property is referenced - i.e. when deleting ngParse property, Parse property is also removed
					delete ngParse[k].prototype[methodName];
					ngParse[k].prototype[methodName] = getWrappedMethod('instance', k, methodName);
				}
				for (method in internal.methodsToUpdate[k].class) {
					methodName = internal.methodsToUpdate[k].class[method];
					delete ngParse[k][methodName];
					ngParse[k][methodName] = getWrappedMethod('class', k, methodName);
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
	
	// copy of angular.merge, not available in 1.3.x angular 
	function merge(dst, objs, deep) {
		for (var i = 0, ii = objs.length; i < ii; ++i) {
			var obj = objs[i];
			if (!angular.isObject(obj) && !angular.isFunction(obj)) continue;
			var keys = Object.keys(obj);
			for (var j = 0, jj = keys.length; j < jj; j++) {
				var key = keys[j];
				var src = obj[key];
			
				if (deep && angular.isObject(src)) {
					if (!angular.isObject(dst[key])) dst[key] = angular.isArray(src) ? [] : {};
					merge(dst[key], [src], true);
				} else {
					dst[key] = src;
				}
			}
		}
		
		return dst;
	}

	angular
		.module('mcwebb.parse-patch', [])
		.provider('ngParse', ngParseProvider);
})(window.angular);
