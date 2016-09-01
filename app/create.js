'use strict';

var  _ = require('lodash'),
        path = require('path'),
        fs = require('fs'),
        async = require('async'),
        xml2js = require('xml2js'),
        json2csv = require('json2csv'),
        jsonfile = require('jsonfile'),
        util = require('util');

const {dialog} = require('electron');

var csvObj = {
        created: false,
        files: {
            csv: {
                path: ''
            }
        }
    };

module.exports = {
    csvObj: function() {
        return csvObj;
    },
    init: function(filepath, options){
        console.log('CSV Create Initialized');
        console.log('options', options);
        
        var respObj = csvObj;

        respObj.isReady = true;
    }
};


