'use strict';

var  _ = require('lodash'),
        path = require('path'),
        fs = require('fs'),
        async = require('async'),
        xml2js = require('xml2js'),
        json2csv = require('json2csv'),
        jsonfile = require('jsonfile'),
        util = require('util'),
        Config = require('electron-config');

var xmlParser = new xml2js.Parser();
const {dialog} = require('electron');
const config = new Config();

var  jsonData,
        maxCounter = {},
        xmlObj = {
            data: {},
            records: 0,
            upload: false,
            csvReady: false,
            fileName: '',
            feeList: [],
            files: {
                csv: {
                    path: ''
                }
            }
        };

var jsonFilter = {
        accountDetails: function(dataPoint, options) {
            var filterKeys = options.ad;
            var filterObj = {};

            _.forEach(dataPoint, function(obj, key) {
                if(filterKeys.indexOf(key) > -1) {
                    filterObj['AD_'+key] = obj[0];
                }
            });

            return filterObj;
        },
        planSummary: function(dataPoint, options) {
            var filterObj = {};

            _.forEach(dataPoint.PLAN_SUMMARY[0].PLAN_SUMMARY_TRAN, function(obj, key) {
                var filterKeys = options.ps;
                var planCode = obj.PLAN_CODE[0];

                if(filterKeys.indexOf(planCode) > -1) {
                    _.forEach(obj, function(plan, key) {
                        filterObj['PS_'+planCode+'_'+key] = plan[0];
                    });
                }
            });

            _.forEach(dataPoint.PLAN_SUMMARY[0].PLAN_SUMMARY_TOTALS[0], function(obj, key) {
                var filterKeys = options.pst;
                if(filterKeys.indexOf(key) > -1) {
                    filterObj['PST_'+key] = obj[0];
                }
            });

            return filterObj;
        },
        getFields: function(data, prefix, options){
            var filterKeys = options[prefix.toLowerCase()];
            var filterObj = {};

            _.forEach(data, function(obj, key) {
                if(filterKeys.indexOf(key) > -1) {
                    filterObj[prefix+'_'+key] = obj[0];
                }
            });

            return filterObj;
        },
        fees: function(data, options) {

            var filterObj = {};
            var topCounter = 1;

            _.forEach(data, function(obj, key) {
                var counterIndex = {};

                _.each(options.fees_transactions, function(property) {
                    counterIndex[property] = 1;
                });

                _.forEach(obj.FEE_TRAN, function(transaction, key) {
                     _.forEach(options.fees_transactions, function(transType) {
                            if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                var transTypeFormatted = transType.replace(/ /g, '');
                                filterObj['FEE_'+transTypeFormatted+'_'+counterIndex[transType]] = transaction.TOTAL[0];
                                counterIndex[transType]++;
                            }

                        });

                });

            });

            _.forEach(maxCounter, function(quantity, key){
                for(var i = 0; i < quantity; i++) {
                    var newIndex = i+1;
                    var keyFormattted = key.replace(/ /g, '');
                    // console.log( filterObj['GFC'+'_'+newIndex]);
                    if(! filterObj['FEE_'+keyFormattted+'_'+newIndex]) {
                        filterObj['FEE_'+keyFormattted+'_'+newIndex] = 0;
                    }
                }
            });

            // console.log(filterObj);
            return filterObj;

        }
    }

module.exports = {
    xmlObj: function() {
        return xmlObj;
    },
    init: function(file, options){
        // console.log('XML Converter Initialized');
        // console.log('file', file);
        // console.log('options', options);

        var fileName = file.name.replace('.xml', '');
        var xmlData;
        var respObj = xmlObj;

        async.series([
            // ----- Read XML File -----
            function(callback){
                // console.log('Read XML File!');
                fs.readFile(file.path, function (err, data) {
                    xmlData = data;
                    callback();
                });
            },

            // ----- Convert XML File (XML to JSON) -----
            function(callback){
                // console.log('Convert XML File to JSON!');
                xmlParser.parseString(xmlData, function (err, result) {
                      jsonData = result.CUSTOMERS.CUSTOMER;
                      callback();
                });
            },

            function(callback){
                let feeArr = [];

                _.forEach(jsonData, function(customer, index){
                    _.forEach(customer.FEES_SECTION[0].FEE_TRAN, function(transaction, key){
                        feeArr.push(transaction.DESCRIPTION[0]);
                    });
                });

                feeArr = _.uniq(feeArr);
                feeArr = _.sortBy(feeArr);
                respObj.feeList = feeArr;
                respObj.data = jsonData;

                callback();
            }
        ], function() {
            // ----- Return Response to Client -----
            respObj.upload = true;
            return respObj;
        });
    },
    filter: function(options) {
        console.log('options!', options);

        var respObj = xmlObj;

        async.series([
            // // ----- Filter JSON File -----
            function(callback){
                console.log('Filter JSON!');
                _.each(options.fees_transactions, function(property) {
                    maxCounter[property] = 0;
                });

                _.forEach(jsonData, function(customer, index){
                    var counter = {};

                    _.each(options.fees_transactions, function(property) {
                        counter[property] = 0;
                    });

                    var currentAbrv = '';
                    _.forEach(customer.FEES_SECTION[0].FEE_TRAN, function(transaction, key){
                        _.forEach(options.fees_transactions, function(transType) {
                            if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                counter[transType]++;
                            }
                        });

                    });
                    console.log('filter fees section done.');
                    _.forEach(maxCounter, function(quantity, key){
                            if(quantity < counter[key]) {
                                maxCounter[key] = counter[key];
                                console.log(maxCounter[key]);
                            }
                    });
                });

                console.log('Go through JSON data');

                _.forEach(jsonData, function(customer, index){
                    console.log('Customer', customer);
                    var newCustomer = [];
                    var newObj = jsonFilter.accountDetails(customer, options);
                        console.log('accountDetails');
                    _.merge(newObj, jsonFilter.planSummary(customer, options));
                        console.log('planSummary');

                            console.log('checking fee section');
                    if(customer.FEES_SECTION[0]){
                        console.log('FEES_SECTION');
                      _.merge(newObj, jsonFilter.getFields(customer.FEES_SECTION[0].FEE_TOTALS[0], 'FEES', options));
                    }
                        console.log('getFields');
                    _.merge(newObj, jsonFilter.getFields(customer.TOTALS_BOX_SECTION[0], 'TS', options));
                        console.log('getFields');
                    _.merge(newObj,  jsonFilter.fees(customer.FEES_SECTION, options));
                        console.log('fees');

                    jsonData[index] = newObj;
                });

                callback();
            },

            // // ----- Convert JSON File (JSON to CSV) -----
            function(callback){
                console.log('JSON to CSV!');
                var outputKeys = [];
                _.forEach(jsonData[0], function(dataPoint, key) {
                    outputKeys.push(key);
                });


                json2csv({ data: jsonData, fields: outputKeys }, function(err, csv) {
                    if (err) console.log(err);
                    var path = dialog.showSaveDialog({title: 'Save Dialog Example'});
                      console.log('path', path);
                    path = (path.indexOf('.csv') === -1) ? (path + '.csv') : path;

                    fs.writeFile(path, csv, function(err) {
                        if (err) throw err;
                        respObj.files.csv.path = path;
                        callback();
                    });
                });
            }

        ], function() {
            // ----- Return Response to Client -----
            respObj.csvReady = true;
            return respObj;
        });



    },
    saveList: function(name, list) {
        config.set(name, list);
    },
    getAllSavedLists: function() {
            var arr = [];

            _.map(config.store, function(item, key) {
                    var obj = {};

                    obj.name = key;
                    obj.value = item;

                    arr.push(obj);
            });

            return arr;
    }
};
