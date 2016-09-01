'use strict';

var  _ = require('lodash'),
        path = require('path'),
        fs = require('fs'),
        async = require('async'),
        xml2js = require('xml2js'),
        json2csv = require('json2csv'),
        jsonfile = require('jsonfile'),
        util = require('util');

var xmlParser = new xml2js.Parser();
const {dialog} = require('electron');

var xmlObj = {
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

var jsonData;

var maxCounter = {};

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
                    console.log('counterIndeX: ',counterIndex);

                _.forEach(obj.FEE_TRAN, function(transaction, key) {
                     _.forEach(options.fees_transactions, function(transType) {
                            if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                var transTypeFormatted = transType.replace(/ /g, '');
                                filterObj['FEE_'+transTypeFormatted+'_'+counterIndex[transType]] = transaction.TOTAL[0];
                                console.log(transaction.TOTAL[0]);
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
        console.log('XML Converter Initialized');
        console.log('file', file);
        console.log('options', options);

        var fileName = file.name.replace('.xml', '');
        var xmlData;
        var respObj = xmlObj;

        async.series([
            // ----- Read XML File -----
            function(callback){
                console.log('Read XML File!');
                fs.readFile(file.path, function (err, data) {
                    xmlData = data;
                    callback();
                });         
            },

            // ----- Convert XML File (XML to JSON) -----
            function(callback){
                console.log('Convert XML File to JSON!');
                xmlParser.parseString(xmlData, function (err, result) {
                      jsonData = result.CUSTOMERS.CUSTOMER;
                      callback();
                });
            },

            function(callback){
                console.log('Get Fees Array!');
                let feeArr = [];

                _.forEach(jsonData, function(customer, index){
                    _.forEach(customer.FEES_SECTION[0].FEE_TRAN, function(transaction, key){
                        console.log('transaction', transaction.DESCRIPTION[0]);
                        feeArr.push(transaction.DESCRIPTION[0]);
                    });
                });    

                console.log('feeArr Length', feeArr.length);
                feeArr = _.uniq(feeArr);
                feeArr = _.sortBy(feeArr);
                respObj.feeList = feeArr;
                respObj.data = jsonData;
                console.log('feeArr Length', feeArr.length);
                callback();
            }  
        ], function() {
            // ----- Return Response to Client -----
            respObj.upload = true;
            console.log('respObj.feeList: ', respObj.feeList);

            console.log('current json: ', jsonData.length);
            return respObj;
        });
    },
    filter: function(test, options) {
        console.log('filter!');
        console.log('test!', test);
        console.log('options!', options);
        console.log('old json: ', jsonData.length);
        var respObj = xmlObj;

        async.series([
            // // ----- Filter JSON File -----
            function(callback){
                console.log('Filter JSON!');
                console.log('option.fees_transactions ', options.fees_transactions);
                console.log('option.transactions_abr ', options.transactions_abr);
                console.log('Create Counter');

                _.each(options.fees_transactions, function(property) {
                    maxCounter[property] = 0;
                });

                _.forEach(jsonData, function(customer, index){
                    console.log('Create Counter');
                    var counter = {};

                    _.each(options.fees_transactions, function(property) {
                        counter[property] = 0;
                    });

                    console.log('Counter', counter);

                    var currentAbrv = '';
                    _.forEach(customer.FEES_SECTION[0].FEE_TRAN, function(transaction, key){

                            console.log('each! FEE TRAN');
                        _.forEach(options.fees_transactions, function(transType) {
                            console.log('each! fees_trans');
                            if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                counter[transType]++;
                            }

                        });

                    });

                    _.forEach(maxCounter, function(quantity, key){
                            if(quantity < counter[key]) {
                                maxCounter[key] = counter[key];
                            }
                    });
                });

                console.log('max counter', maxCounter);

                _.forEach(jsonData, function(customer, index){
                    var newCustomer = [];
                    var newObj = jsonFilter.accountDetails(customer, options);
                    _.merge(newObj, jsonFilter.planSummary(customer, options));
                    _.merge(newObj, jsonFilter.getFields(customer.FEES_SECTION[0].FEE_TOTALS[0], 'FEES', options));
                    _.merge(newObj, jsonFilter.getFields(customer.TOTALS_BOX_SECTION[0], 'TS', options));
                    _.merge(newObj,  jsonFilter.fees(customer.FEES_SECTION, options));
                    
                    jsonData[index] = newObj;
                });


                console.log(jsonData);


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



    }
};


