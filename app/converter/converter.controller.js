'use strict';

var _ = require('lodash');
var remote = require('electron').remote;
var converter = remote.require('./converter');

angular.module('xml2JsonApp')
.controller('MainCtrl', ['$scope', 'Upload', '$interval', function ($scope, Upload, $interval) {

    $scope.upload = function(file) {
        $scope.load.flag = true;
        $scope.optionsFlag = false;
        $scope.options.fees.TRANSACTIONS = [];

        var options = convert($scope.options);

        // Custom Node Function
        converter.init(file,options);

        var checkStatus = $interval(function() {
            var xmlObj = converter.xmlObj();

            if(xmlObj.upload) {
                $scope.jsonReady = true;
                $scope.optionsFlag = true;
                $scope.loadReset();
                $scope.xml = xmlObj;
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

    $scope.createFeeList = function() {
        $scope.saveFlag = true;
    }

    $scope.getAll = function() {
        return converter.getAllSavedLists();
    }

    $scope.saveFeeList = function() {
        converter.saveList($scope.newList, $scope.options.fees['TRANSACTIONS']);
        $scope.saveFlag = false;
        $scope.savedLists = $scope.getAll();
    }

    $scope.loadList = function() {
        $scope.options.fees['TRANSACTIONS'] = [];

        var list = _.filter($scope.savedLists, function(item){
            return $scope.preloadList == item.name;
        });

        list = list[0].value;

        console.log('list', list);

        _.map(list, function(item, index){
            $scope.options.fees['TRANSACTIONS'][index] = item;
        });

        console.log('list', $scope.options.fees['TRANSACTIONS']);
    }

    $scope.addFee = function() {
        $scope.options.fees['TRANSACTIONS'].push($scope.xml.feeList[0]);
    }

    $scope.removeFee = function(index) {
       $scope.options.fees['TRANSACTIONS'].splice(index, 1)
    }

    $scope.filter = function() {
            $scope.load.flag = true;
            $scope.optionsFlag = false;
            $scope.load.msg = 'Creating CSV File...';

            var options = convert($scope.options);
            converter.filter('test', options);

            var checkStatus = $interval(function() {
                var xmlObj = converter.xmlObj();

                if(xmlObj.csvReady) {
                    $scope.csvReady = true;
                    $scope.optionsFlag = false;
                    $scope.loadReset();
                    $interval.cancel(checkStatus);
                }
            }, 1000);
    }

    $scope.init = function(){
        console.log('init :: Function');
        $scope.xml = null;
        $scope.options = null;
        $scope.optionsFlag = false;
        $scope.jsonReady = false;
        $scope.newList = '';
        $scope.saveFlag = false;
        $scope.loadReset();
        $scope.preloadList = '';
        $scope.savedLists = $scope.getAll();
        console.log($scope.savedLists);
        $scope.options = {
            ad: {
                MAILING_NAME: true,
                PROCESSING_MONTH: false,
                MERCHANT_NUM: false,
                AD_AMOUNT_DEDUCTED: false
            },
            ps: {
                AM: false,
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
                EB : false
            },
            pst: {
                PLAN_CODE : false,
                NUM_SALES : false,
                DOLLAR_SALES : false,
                NUM_CREDITS : false,
                DOLLAR_CREDITS : false,
                NET_SALES : false,
                AVG_TKT : false,
                DISCOUNT_DUE : false
            },
            fees: {
                TOTAL_FEES_DUE: false,
                TRANSACTIONS: []
            },
            ts: {
                DISC_DUE : false,
                FEES_DUE: false,
                AMT_DEDUCTED: false
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

    optionObj['fees_transactions'] = options.fees.TRANSACTIONS;

    return optionObj;
}

