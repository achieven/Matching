const fs = require('fs')
const csv = require('csv-parser')
const sqlite = require('sqlite3').verbose()
var db = new sqlite.Database('matching')
const _ = require('underscore')

var util = {
    initializeDB: function(){
        db.serialize(function () {
            function dropTables() {
                function dropTable(table) {
                    var dropTableQuery = 'DROP TABLE IF EXISTS ' + table
                    db.run(dropTableQuery)

                }

                dropTable('testers')
                dropTable('devices')
                dropTable('tester_device')
                dropTable('bugs')
            }


            function createTables() {
                var createTestersTableQuery = 'CREATE TABLE if not exists testers (testerId INTEGER NOT NULL PRIMARY KEY, firstName VARCHAR, lastName VARCHAR, country VARCHAR, lastLogin VARCHAR)'
                var createDevicesTableQuery = 'CREATE TABLE if not exists devices (deviceId INTEGER NOT NULL PRIMARY KEY, description VARCHAR)'
                var createTesterDeviceTableQuery = 'CREATE TABLE if not exists tester_device (testerId INTEGER , deviceId INTEGER)'
                var createBugsTableQuery = 'CREATE TABLE if not exists bugs (bugId INTEGER NOT NULL PRIMARY KEY, deviceId INTEGER REFERENCES devices(deviceId), testerId INTEGER REFERENCES testers(testerId))'

                db.run(createTestersTableQuery)
                db.run(createDevicesTableQuery)
                db.run(createTesterDeviceTableQuery)
                db.run(createBugsTableQuery)
            }

            dropTables()
            createTables()

        })
    },
    initializeTables: function(){
        function initializeTable(table, fields) {
            fs.createReadStream('./assets/' + table + '.csv')
                .pipe(csv())
                .on('data', function (data) {
                    var insertIntoQuerySection = 'INSERT INTO ' + table + ' ('
                    var fieldsQuerySection = ''
                    fields.forEach(function (field, index) {
                        fieldsQuerySection += field
                        if (index < fields.length - 1) {
                            fieldsQuerySection += ','
                        }
                    })
                    fieldsQuerySection += ') VALUES ('
                    var valuesQuerySection = ''
                    fields.forEach(function (field, index) {
                        valuesQuerySection += JSON.stringify(data[field])
                        if (index < fields.length - 1) {
                            valuesQuerySection += ','
                        }
                    })
                    valuesQuerySection += ')'
                    var insertRowQuery = insertIntoQuerySection + fieldsQuerySection + valuesQuerySection
                    db.run(insertRowQuery)
                })
        }
        

        initializeTable('testers', ['testerId', 'firstName', 'lastName', 'country', 'lastLogin'])
        initializeTable('devices', ['deviceId', 'description'])
        initializeTable('tester_device', ['testerId', 'deviceId'])
        initializeTable('bugs', ['bugId', 'deviceId', 'testerId'])

        
    },
    getAllCountries: function(callback){
        var query = 'SELECT country FROM testers'
        db.all(query, function (err, countries) {
            var uniqueCountries = _.uniq(countries.map(function(country){return country.country}))
            callback(uniqueCountries)
        })
    },
    getAllDevices: function(callback){
        var query = 'SELECT description FROM devices'
        db.all(query, function (err, devices) {
            var uniqueDevices = _.uniq(devices.map(function(device){return device.description}))
            callback(uniqueDevices)
        })
    },
    getBugs: function(testerCountry, deviceDescription, callback){
        console.log(testerCountry,deviceDescription)
        var mandatorySelectionQuery = 'SELECT testers.country, devices.description, bugs.testerId, bugs.deviceId FROM testers, devices, bugs WHERE bugs.testerId=testers.testerId AND bugs.deviceId=devices.deviceId'


        var countrySelectorQuery = this.selectorQuery('testers', 'country', testerCountry)
        var deviceSelectorQuery = this.selectorQuery('devices', 'description', deviceDescription)
        var joinQuery = 'SELECT testers.country, devices.description, bugs.testerId, bugs.deviceId FROM testers, devices, bugs WHERE bugs.testerId=testers.testerId AND bugs.deviceId=devices.deviceId ' + countrySelectorQuery + deviceSelectorQuery
        db.all(joinQuery, function(err, reply){
            callback(reply)
        })

    },
    selectorQuery: function(table, field, values){
        if(values === 'All'){
            return ''
        }
        else if(typeof values === 'string'){
            return ' AND ' + table + '.' + field + '=' + JSON.stringify(values)
        }
        else {
            var prefix = ' AND ('
            var queries = prefix
            values.forEach(function(value, index){
                queries += table + '.' + field + '=' + JSON.stringify(value)
                if(index < values.length-1){
                    queries += ' OR '
                }
            })
            var suffix = ')'
            queries += suffix
            return queries
        }
    }
    
}

module.exports = util