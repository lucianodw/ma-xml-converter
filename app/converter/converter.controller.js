'use strict';

var _ = require('lodash');
var remote = require('electron').remote;
var converter = remote.require('./converter');

angular.module('xml2JsonApp')
.controller('MainCtrl', ['$scope', 'Upload', '$interval', function ($scope, Upload, $interval) {

    $scope.upload = function(file) {
        console.log('upload :: Function');
        $scope.load.flag = true;
        $scope.optionsFlag = false;

        var options = convert($scope.options);
        console.log('New Options: ', options);

        console.log('File Length: ', file);

        // Custom Node Function
        converter.init(file,options);

        var checkStatus = $interval(function() {
            var xmlObj = converter.xmlObj();
            console.log(xmlObj);
            if(xmlObj.complete) {
                console.log('Ready to Download!')
                $scope.xml = xmlObj;
                $scope.loadReset();
                $interval.cancel(checkStatus);
            }
        }, 3000);
    };

    $scope.loadReset = function(){
       $scope.load = {
        flag: false,
        percent: 1,
        msg: "Converting XML to CSV..."
    }
}

$scope.init = function(){
    console.log('init :: Function');
    $scope.xml = null;
    $scope.options = null;
    $scope.optionsFlag = true;
    $scope.loadReset();
    $scope.options = {
        ad: {
            MAILING_NAME: true,
            PROCESSING_MONTH: false,
            MERCHANT_NUM: false,
            AD_AMOUNT_DEDUCTED: false
        },
        ps: {
            VS : false,
            VD : false,
            VB : false,
            V$ : false,
            VL : false,
            MC : false,
            MD : false,
            MB : false,
            M$ : false,
            ML : false,
            NB : false,
            DS : false,
            DD : false,
            DZ : false,
            D$ : false,
            DJ : false,
            DB : false,
            EB : true
        },
        pst: {
            PLAN_CODE : true,
            NUM_SALES : false,
            DOLLAR_SALES : false,
            NUM_CREDITS : false,
            DOLLAR_CREDITS : false,
            NET_SALES : false,
            AVG_TKT : false,
            DISCOUNT_DUE : true
        },
        fees: {
            TOTAL_FEES_DUE: false
        },
        ts: {
            DISC_DUE : false,
            FEES_DUE: false,
            AMT_DEDUCTED: true
        }
    };
}

    // Initialize
    $scope.init();

}]);

// ----- Utilities ------
var convert = function(options) {
    var optionObj = {};

    _.each(options, function(section, key) {
        var optionArr = [];

        _.each(section, function(option, key) {
            if(option) {
                optionArr.push(key);
            }
        });

        optionObj[key] = optionArr;
    });

    return optionObj;
}

