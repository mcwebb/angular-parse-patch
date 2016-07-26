(function (angular) {
	var internal = {};

	internal = {
		credentials: {
			appId: '',
			jsKey: ''
		},
		serverURL: ''
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
	
	function ngParseProvider () {
		this.initialize = function (appId, jsKey, serverURL) {
			internal.credentials.appId = appId;
			internal.credentials.jsKey = jsKey;
			internal.serverURL = serverURL;
		};

		this.$get = function ($window, $q) {
			// fail if the vendor Parse sdk is not available
			if (angular.isUndefined($window.Parse))
				throw new Error('Parse SDK not available');

			// get a reference
			var ngParse = $window.Parse;

			ngParse.initialize(
				internal.credentials.appId,
				internal.credentials.jsKey
			);
			ngParse.serverURL = internal.serverURL;
			
			// this runs for both Object and User since User inherits.
			ngParse.Object.prototype.initialize = function () {
				if (typeof this.fields === 'object')
					internal.enablePropAccess(this, this.fields);
			};
			
			// angularify promises if you want 
			ngParse.$q = function (parsePromise) {
				if (!ngParse.Promise.is(parsePromise))
					throw new Error('ngParse.$q only accepts Parse.Promise');
					
				var deferred = $q.defer();
				// Parse.Promise doesn't implement a notify method 
				parsePromise.then(function (result) {
					deferred.resolve(result);
				}, function (error) {
					deferred.reject(error);
				});
				
				return deferred.promise;
			};

			return ngParse;
		};
	}

	angular
		.module('mcwebb.parse-patch', [])
		.provider('ngParse', ngParseProvider);
})(window.angular);
