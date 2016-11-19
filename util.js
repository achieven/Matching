const fs = require('fs')
const csv = require('csv-parser')
const sqlite = require('sqlite3').verbose()
var db = new sqlite.Database('matching')
const _ = require('underscore')
const async = require('async')

const Handlebars = require('handlebars')
Handlebars.registerHelper('equal', function(v1, v2, options) {
    if(v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

var util = {
    initializeDB: function () {
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
    initializeTables: function () {
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
    getFieldValues: function (field, table, callback) {
        var query = 'SELECT ' + field + ' FROM ' + table
        db.all(query, function (err, response) {
            var uniqueProperties = _.uniq(response.map(function (value) {
                return value[field]
            }))
            callback(null, uniqueProperties)
        })
    },
    getValues: function (callback) {
        async.parallel([
            this.getFieldValues.bind(null, 'country', 'testers'),
            this.getFieldValues.bind(null, 'description', 'devices')
        ], function (err, results) {
            if (err) return callback(err)
            callback(results)
        })
    },
    selectorQuery: function (table, field, values) {
        if (values === 'All') {
            return ''
        }
        else if (typeof values === 'string') {
            return ' AND ' + table + '.' + field + '=' + JSON.stringify(values)
        }
        else {
            var prefix = ' AND ('
            var queries = prefix
            values.forEach(function (value, index) {
                queries += table + '.' + field + '=' + JSON.stringify(value)
                if (index < values.length - 1) {
                    queries += ' OR '
                }
            })
            var suffix = ')'
            queries += suffix
            return queries
        }
    },
    getSearchCriteria: function (field, table, values, preffix, callback) {
        const thisObject = this
        var fieldSearchCriteria = preffix + '='
        if (typeof values === 'string') {
            fieldSearchCriteria += JSON.stringify(values)
            callback(null, fieldSearchCriteria)
        }
        else {
            thisObject.getFieldValues(field, table, function (err, queryValues) {
                if (_.isEqual(queryValues, values)) {
                    fieldSearchCriteria += '"All"'
                    callback(null, fieldSearchCriteria)
                }
                else {
                    values.forEach(function (value, index) {
                        fieldSearchCriteria += '"' + value + '"'
                        if (index < values.length - 1) {
                            fieldSearchCriteria += ' or '
                        }
                        if (index === values.length - 1) {
                            callback(null, fieldSearchCriteria)
                        }
                    })
                }
            })
        }
    },
    getSearchCriterias: function (testerCountry, deviceDescription, callback) {
        async.parallel([
            this.getSearchCriteria.bind(this, 'country', 'testers', testerCountry, 'Country'),
            this.getSearchCriteria.bind(this, 'country', 'testers', deviceDescription,  'Device')
        ], function(err, results){
            if(err) return callback(err)
            var criteriasForPresentation = ''
            results.forEach(function(criteria, index){
                criteriasForPresentation += criteria
                if(index < results.length -1) {
                    criteriasForPresentation += ' and '
                }
            })
            callback(null, {header: 'Search Criteria:', text: criteriasForPresentation})
        })
    },
    getMatches: function(allBugs, callback){
        var bugsByTesters = {}
        var testersCounter = 0, testersNames = []
        function createAllTestersObject(){
            allBugs.forEach(function(bug){
                if(!(bugsByTesters[bug.testerId])){
                    thisTester = {}
                    thisTester['name'] = bug.firstName + ' ' + bug.lastName
                    thisTester['bugsForDevices'] = {}
                    thisTester['bugsForDevices'][bug.description] = 1
                    thisTester['totalBugs'] = 1
                    bugsByTesters[bug.testerId] = thisTester
                }
                else {
                    var thisTester = bugsByTesters[bug.testerId]
                    if(!thisTester['bugsForDevices'][bug.description]){
                        thisTester['bugsForDevices'][bug.description] = 1
                    }
                    else {
                        thisTester['bugsForDevices'][bug.description]++
                    }
                    thisTester['totalBugs']++
                }
            })
            return bugsByTesters
        }
        
        function bugsByTestersBody (bugsByTesters){
            var bugsByTestersBody = ''
            for(var testerId in bugsByTesters){
                testersCounter++
                var thisTester = bugsByTesters[testerId]
                var testerName = thisTester.name
                testersNames.push(thisTester.name)
                bugsByTestersBody += testerName + ' filed '
                var bugsByTesterForDevices = ''
                var testerBugsPerDevice = thisTester['bugsForDevices']
                var testerDevices = Object.keys(testerBugsPerDevice)
                testerDevices.forEach(function(device, index){
                    bugsByTesterForDevices += testerBugsPerDevice[device] + ' bugs for ' + device
                    if(index < testerDevices.length - 1){
                        bugsByTesterForDevices += ' and '
                    }
                    if(index === testerDevices.length - 1){
                        bugsByTesterForDevices += '.<br>' + thisTester.totalBugs + ' bugs filed for devices in search.<br>'
                    }
                })
                bugsByTestersBody += bugsByTesterForDevices
            }
            return bugsByTestersBody
        }
        
        
        function bugsByTestersPrefixSuffix(){
            var testersNamesPreffix = ''
            var testersNameSuffix = ''
            testersNames.forEach(function(tester, index){
                testersNamesPreffix += tester
                testersNameSuffix += tester
                if(index < testersNames.length -1) {
                    testersNamesPreffix += ' and '
                    testersNameSuffix += ', '
                }
            })
            return {prefix: testersCounter + ' testers (' + testersNamesPreffix + ')', suffix: testersNameSuffix}
        }
        var bugsByTesters = createAllTestersObject()
        var bugsByTestersBody = bugsByTestersBody(bugsByTesters)
        bugsByTestersPrefixSuffix = bugsByTestersPrefixSuffix()
        callback(null, {prefix: {header: 'Matches:', text: bugsByTestersPrefixSuffix.prefix}, body: {header: '', text: bugsByTestersBody}, suffix: {header: 'Results:', text: bugsByTestersPrefixSuffix.suffix}})
    },
    getBugsProperties: function(testerCountry, deviceDescription, allBugs, callback){
        async.parallel([
            this.getSearchCriterias.bind(this, testerCountry, deviceDescription),
            this.getMatches.bind(this,allBugs)
        ], function(err, results){
            if(err) return callback(err)
            callback(null, results)
        })
    },
    getBugsFromDB: function (testerCountry, deviceDescription, callback) {
        var mandatorySelectionQuery = 'SELECT testers.country, devices.description, bugs.testerId, bugs.deviceId FROM testers, devices, bugs WHERE bugs.testerId=testers.testerId AND bugs.deviceId=devices.deviceId'
        var countrySelectorQuery = this.selectorQuery('testers', 'country', testerCountry)
        var deviceSelectorQuery = this.selectorQuery('devices', 'description', deviceDescription)
        var bugsQuery = 'SELECT testers.country, testers.firstName, testers.lastName, devices.description, bugs.testerId, bugs.deviceId FROM testers, devices, bugs WHERE bugs.testerId=testers.testerId AND bugs.deviceId=devices.deviceId ' + countrySelectorQuery + deviceSelectorQuery
        db.all(bugsQuery, function (err, allBugs) {
            if (err) return callback(err)
            callback(null, testerCountry, deviceDescription, allBugs)
        })
    },
    getBugs: function (testerCountry, deviceDescription, callback) {
        async.waterfall([
            this.getBugsFromDB.bind(this, testerCountry, deviceDescription),
            this.getBugsProperties.bind(this)
        ], function (err, results) {
            if(err) return callback(err)
            response = {
                searchCriterias: results[0],
                bugsProperties: results[1]
            }
            callback(response)
        })
    }
}

module.exports = util