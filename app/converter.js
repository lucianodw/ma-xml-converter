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
        complete: false,
        fileName: '',
        files: {
            csv: {
                path: ''
            }
        }
    };

module.exports = {
    xmlObj: function() {
        return xmlObj;
    },
    init: function(file, options){
        console.log('XML Converter Initialized');
        console.log('file', file);
        console.log('options', options);

        var fileName = file.name.replace('.xml', '');
        var xmlData, jsonData;
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

            // // ----- Convert XML File (XML to JSON) -----
            function(callback){
                console.log('Convert XML File to JSON!');
                xmlParser.parseString(xmlData, function (err, result) {
                      jsonData = result.CUSTOMERS.CUSTOMER;
                      callback();
                });
            },

            // // ----- Filter JSON File -----
            function(callback){
                console.log('Filter JSON!');
                options.transactions_abr = convertFees(options.fees_transactions.slice());
                console.log('option.fees_transactions ', options.fees_transactions);
                console.log('option.transactions_abr ', options.transactions_abr);

                _.forEach(jsonData, function(customer, index){
                    var counter = {
                        'GCF': 0,
                        'FANF': 0,
                        'MALF': 0,
                        'VIF': 0,
                        'AMXDIS': 0,
                        'VSMCTF': 0,
                        'AVSTF': 0,
                        'DISCTF': 0,
                        'AMEXTF': 0,
                        'NABU': 0
                    };

                    var currentAbrv = '';
                    _.forEach(customer.FEES_SECTION[0].FEE_TRAN, function(transaction, key){

                        _.forEach(options.fees_transactions, function(transType) {
                            currentAbrv = convertFee(transType);
                            if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                counter[currentAbrv]++;
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
                    var newObj = jsonFilter.accountDetails(customer);
                    _.merge(newObj, jsonFilter.planSummary(customer));
                    _.merge(newObj, jsonFilter.getFields(customer.FEES_SECTION[0].FEE_TOTALS[0], 'FEES'));
                    _.merge(newObj, jsonFilter.getFields(customer.TOTALS_BOX_SECTION[0], 'TS'));
                    _.merge(newObj,  jsonFilter.fees(customer.FEES_SECTION));
                    
                    jsonData[index] = newObj;
                });


                // console.log(jsonData);

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
            respObj.data = jsonData;
            respObj.records = jsonData.length;
            respObj.complete = true;
            xmlObj = respObj;
            return respObj;
        });

        var saveFile = function() {

        };

        var convertFees = function(fees) {
            var newFees = fees;
            _.each(fees, function(obj, index){
                switch (obj) {
                    case 'VISA INTEGRITY FEE':
                        newFees[index] = 'VIF';
                        break;
                    case 'AMEX DISC':
                        newFees[index] = 'AMXDIS';
                        break;
                    case 'VS MC TRANSACTION FEE':
                        newFees[index] = 'VSMCTF'
                        break;
                    case 'AVS TRANSACTION FEE':
                        newFees[index] = 'AVSTF'
                        break;
                    case 'DISCOVER TRANS FEE':
                        newFees[index] = 'DISCTF'
                        break;
                    case 'AMEX TRANS FEE':
                        newFees[index] = 'AMEXTF'
                        break;
                    default:
                        newFees[index] = obj;
                        break;
                }
            });

            return newFees;
        }
        var convertFee = function(fee) {
            switch (fee) {
                case 'VISA INTEGRITY FEE':
                    return fee = 'VIF';
                    break;
                case 'AMEX DISC':
                    return fee = 'AMXDIS';
                    break;
                case 'VS MC TRANSACTION FEE':
                    return fee = 'VSMCTF'
                    break;
                case 'AVS TRANSACTION FEE':
                    return fee = 'AVSTF'
                    break;
                case 'DISCOVER TRANS FEE':
                    return fee = 'DISCTF'
                    break;
                case 'AMEX TRANS FEE':
                    return fee = 'AMEXTF'
                    break;
                default:
                    return fee = fee;
                    break;
            }

            return fee;
        };

        var maxCounter = {
                        'GCF': 0,
                        'FANF': 0,
                        'MALF': 0,
                        'VIF': 0,
                        'AMXDIS': 0,
                        'VSMCTF': 0,
                        'AVSTF': 0,
                        'DISCTF': 0,
                        'AMEXTF': 0,
                        'NABU': 0
                    };

        var jsonFilter = {
            accountDetails: function(dataPoint) {
                var filterKeys = options.ad;
                var filterObj = {};

                _.forEach(dataPoint, function(obj, key) {
                    if(filterKeys.indexOf(key) > -1) {
                        filterObj['AD_'+key] = obj[0];
                    }
                });

                return filterObj;
            },
            planSummary: function(dataPoint) {
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
            getFields: function(data, prefix){
                var filterKeys = options[prefix.toLowerCase()];
                var filterObj = {};

                _.forEach(data, function(obj, key) {
                    if(filterKeys.indexOf(key) > -1) {
                        filterObj[prefix+'_'+key] = obj[0];
                    }
                });

                return filterObj;
            },
            fees: function(data) {

                var filterObj = {};
                var topCounter = 1;
                
                _.forEach(data, function(obj, key) {
                    var counterIndex = {
                        'GCF': 1,
                        'FANF': 1,
                        'MALF': 1,
                        'VIF': 1,
                        'AMXDIS': 1,
                        'VSMCTF': 1,
                        'AVSTF': 1,
                        'DISCTF': 1,
                        'AMEXTF': 1,
                        'NABU': 1
                    };

                    _.forEach(obj.FEE_TRAN, function(transaction, key) {
                        var currentAbrv;
                         _.forEach(options.fees_transactions, function(transType) {
                                currentAbrv = convertFee(transType);
                                if(transaction.DESCRIPTION[0].indexOf(transType) > -1) {
                                    filterObj['FEE_'+currentAbrv+'_'+counterIndex[currentAbrv]] = transaction.TOTAL[0];
                                    console.log(transaction.TOTAL[0]);
                                    counterIndex[currentAbrv]++;
                                }

                            });

                    });

                });

                _.forEach(maxCounter, function(quantity, key){
                    for(var i = 0; i < quantity; i++) {
                        var newIndex = i+1;
                        // console.log( filterObj['GFC'+'_'+newIndex]);
                        console.log(filterObj);
                        if(! filterObj['FEE_'+key+'_'+newIndex]) {
                            filterObj['FEE_'+key+'_'+newIndex] = 0;
                        }
                    }
                });

               

                // console.log(filterObj);
                    return filterObj;

            }
        }

    }
};