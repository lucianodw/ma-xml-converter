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
                _.forEach(jsonData, function(customer, index){
                    var newCustomer = [];
                    var newObj = jsonFilter.accountDetails(customer);
                    _.merge(newObj, jsonFilter.planSummary(customer));
                    _.merge(newObj, jsonFilter.getFields(customer.FEES_SECTION[0].FEE_TOTALS[0], 'FEES'));
                    _.merge(newObj, jsonFilter.getFields(customer.TOTALS_BOX_SECTION[0], 'TS'));

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
            console.log('responseObj: ', respObj);
            console.log('Complete');
            xmlObj = respObj;
            return respObj;
        });

        var saveFile = function() {

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
            }
        }

    }
};