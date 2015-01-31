# Mcwebb Angular Parse Patch

Based on the brilliant [Parse Angular Patch](https://github.com/brandid/parse-angular-patch).
Adjusted to make more Angularic.

  - Dependency Injection of the Parse SDK as "ngParse"
  - All Parse async functions return Angular promises ($q) instead of Parse.Promise
  - Parse.Object and Parse.User can be used in an angular way (i.e. straight property access no, (g|s)etters)

## Installation
### Install with Bower
```bash
# from the terminal at the root of your project
bower install angular-parse-patch --save
```
### Add to your module deps
```js
angular.module('xxxx', ['mcwebb.parse-patch'])
```

## Example Use
### Set up
```js
angular.module('xxxx')
.config(function (ngParseProvider) {
  ngParseProvider.initialize(
    'YOUR_API_ID',
    'YOUR_JS_KEY'
  );
});
```
### Basic Use
When creating a Parse object you must define the fields you want to be able to access without getters/setters. Adding instance methods (like purr below) is of course completly optional.
```js
angular.module('xxxx')
.controller('myController', function (ngParse, $scope) {
  var Cat = new ngParse.Object.extend('Cat', {
    fields: [
      'name',
      'colour',
      'breed'
    ],
    purr: function () {
      console.log(this.name  + ' is happy!');
    }
  });
  $scope.cat = Cat;
});
```
```html
<input type="text" ng-model="cat.name" />
<button ng-click="cat.purr()">Make me purr</button>
```
