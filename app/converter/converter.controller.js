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

        // Custom Node Function
        converter.init(file,options);

        var checkStatus = $interval(function() {
            var xmlObj = converter.xmlObj();
            console.log(xmlObj);
            if(xmlObj.upload) {
                console.log('Ready to Pick Filters!');
                $scope.jsonReady = true;
                $scope.optionsFlag = true;
                $scope.loadReset();
                console.log('xmlObj.feeList: ', xmlObj.feeList);
                $scope.xml = xmlObj;
                console.log('scope.xml', $scope.xml);
                $interval.cancel(checkStatus);
            }
        }, 3000);
    };

    $scope.loadReset = function(){
       $scope.load = {
        flag: false,
        percent: 1,
        msg: "Uploading XML File..."
    }
}

$scope.init = function(){
    console.log('init :: Function');
    $scope.xml = null;
    $scope.options = null;
    $scope.optionsFlag = false;
    $scope.jsonReady = false;
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
            TOTAL_FEES_DUE: false,
            TRANSACTIONS: {
                    'GCF': false,
                    'FANF': false,
                    'MALF': false,
                    'VISA INTEGRITY FEE': false,
                    'AMEX DISC': false,
                    'VS MC TRANSACTION FEE': false,
                    'AVS TRANSACTION FEE': false,
                    'DISCOVER TRANS FEE': false,
                    'AMEX TRANS FEE': false,
                    'NABU' : true
            }
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

    console.log(options.fees.TRANSACTIONS);
    var transArr = [];

    _.each(options.fees.TRANSACTIONS, function(obj, key){

        if(obj) {
            transArr.push(key);
        }
    });

    console.log('transArr', transArr);
    optionObj['fees_transactions'] = transArr;

    return optionObj;
}

