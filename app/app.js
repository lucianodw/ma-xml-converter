// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from './env';


console.log('Loaded environment variables:', env);
var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());

// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
console.log('The author of this app is:', appDir.read('package.json', 'json').author);

document.addEventListener('DOMContentLoaded', function () {

});


// Angular Modules
var angular = require('angular');
require('angular-resource');
require('angular-sanitize');
require('angular-ui-router');
require('angular-ui-bootstrap');
require('ng-file-upload');

angular.module('xml2JsonApp', [
  'ngResource',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap',
  'ngFileUpload'
])
.config(function ($stateProvider, $urlRouterProvider, $locationProvider) {

$urlRouterProvider
    .otherwise('/');
      
  $stateProvider
    .state('converter', {
      url: '/',
      templateUrl: 'converter/converter.html',
      controller: 'MainCtrl'
    });
});

  require('./converter/converter.controller.js');