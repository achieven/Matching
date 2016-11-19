var util = require('../util')
const expect = require('chai').expect
const async = require('async')
const sqlite = require('sqlite3').verbose()
var db = new sqlite.Database('matching')

const allCountries = ['US', 'GB', 'JP']
const allDescriptions = ['iPhone 4', 'iPhone 4S', 'iPhone 5', 'Galaxy S3', 'Galaxy S4', 'Nexus 4', 'Droid Razor', 'Droid DNA', 'HTC One', 'iPhone 3']


describe('initalizeDB', function () {
    it('should initialize 4 new tables', function (done) {
        util.initializeDB()
        setTimeout(function () {
            async.parallel([
                function (callback) {
                    var checkTestersTableExistsQuery = 'SELECT * FROM testers'
                    db.all(checkTestersTableExistsQuery, function (err, reply) {
                        expect(reply).to.eql([])
                        callback(null)
                    })
                }, function (callback) {
                    var checkDevicesTableExistsQuery = 'SELECT * FROM devices'
                    db.all(checkDevicesTableExistsQuery, function (err, reply) {
                        expect(reply).to.eql([])
                        callback(null)
                    })
                }, function (callback) {
                    var checkTesterDeviceTableExistsQuery = 'SELECT * FROM tester_device'
                    db.all(checkTesterDeviceTableExistsQuery, function (err, reply) {
                        expect(reply).to.eql([])
                        callback(null)
                    })
                }, function (callback) {
                    var checkBugsTableExistsQuery = 'SELECT * FROM bugs'
                    db.all(checkBugsTableExistsQuery, function (err, reply) {
                        expect(reply).to.eql([])
                        callback(null)
                    })
                }
            ], function (err, response) {
                done()
            })

        }, 1000)
    })
})

describe('initializeTables', function () {
    it('should insert all relevant data to tables', function (done) {
        this.timeout(8000)
        util.initializeTables()
        setTimeout(function () {
            async.parallel([
                function (callback) {
                    var checkTestersTableExistsQuery = 'SELECT * FROM testers'
                    db.all(checkTestersTableExistsQuery, function (err, reply) {
                        expect(reply.length).to.be.equal(9)
                        reply.forEach(function (row) {
                            expect(row.testerId).to.be.a('number')
                            expect(row.firstName).to.be.a('string')
                            expect(row.lastName).to.be.a('string')
                            expect(row.country).to.be.a('string')
                            expect(row.lastLogin).to.be.a('string')
                        })
                        callback(null)
                    })
                }, function (callback) {
                    var checkDevicesTableExistsQuery = 'SELECT * FROM devices'
                    db.all(checkDevicesTableExistsQuery, function (err, reply) {
                        expect(reply.length).to.be.equal(10)
                        reply.forEach(function (row) {
                            expect(row.deviceId).to.be.a('number')
                            expect(row.description).to.be.a('string')
                        })
                        callback(null)
                    })
                }, function (callback) {
                    var checkTesterDeviceTableExistsQuery = 'SELECT * FROM tester_device'
                    db.all(checkTesterDeviceTableExistsQuery, function (err, reply) {
                        expect(reply.length).to.be.equal(36)
                        reply.forEach(function (row) {
                            expect(row.testerId).to.be.a('number')
                            expect(row.deviceId).to.be.a('number')
                        })
                        callback(null)
                    })
                }, function (callback) {
                    var checkBugsTableExistsQuery = 'SELECT * FROM bugs'
                    db.all(checkBugsTableExistsQuery, function (err, reply) {
                        expect(reply.length).to.be.equal(1000)
                        reply.forEach(function (row) {
                            expect(row.bugId).to.be.a('number')
                            expect(row.testerId).to.be.a('number')
                            expect(row.deviceId).to.be.a('number')
                        })
                        callback(null)
                    })
                }
            ], function (err, response) {
                done()
            })
        }, 5000)
    })
})

describe('getFieldValues', function () {
    it('should return unique fields of country', function (done) {
        util.getFieldValues('country', 'testers', function (err, uniqueProperties) {
            expect(err).to.be.null
            expect(uniqueProperties).to.eql(allCountries)
            done()
        })
    })
    it('should return unique fields of description', function (done) {
        util.getFieldValues('description', 'devices', function (err, uniqueProperties) {
            expect(err).to.be.null
            expect(uniqueProperties).to.eql(allDescriptions)
            done()
        })
    })
})

describe('getValues', function () {
    it('should return 2 arrays - of unique countries and unique descriptions', function (done) {
        util.getValues(function (results) {
            expect(results).to.be.a('array')
            expect(results.length).to.be.equal(2)
            expect(results[0]).to.eql(allCountries)
            expect(results[1]).to.eql(allDescriptions)
            done()
        })
    })
})

describe('getBugsFromDB', function () {
    it('should show all bugs when select all was chosen in country and description', function (done) {
        util.getBugsFromDB(allCountries, allDescriptions, function (err, country, description, bugs) {
            expect(err).to.be.null
            expect(country).to.eql(allCountries)
            expect(description).to.eql(allDescriptions)
            expect(bugs).to.be.a('array')
            expect(bugs.length).to.be.equal(1000)
            done()
        })
    })
    it('should show only relevant bugs when specific fields were chosen in country and description', function (done) {
        util.getBugsFromDB('US', ['iPhone 4', 'iPhone 4S'], function (err, country, description, bugs) {
            expect(err).to.be.null
            expect(country).to.be.equal('US')
            expect(description).to.eql(['iPhone 4', 'iPhone 4S'])
            expect(bugs).to.be.a('array')
            expect(bugs.length).to.be.equal(174)
            done()
        })
    })
})

describe('selectorQuery', function () {
    it('should return empty string if value is "All"', function (done) {
        var selectorQuerySection = util.selectorQuery('testers', 'country', 'All')
        expect(selectorQuerySection).to.be.equal('')
        done()
    })
    it('should return one AND operator when the value is a single string', function (done) {
        var selectorQuerySection = util.selectorQuery('testers', 'country', 'US')
        expect(selectorQuerySection).to.be.equal(' AND testers.country="US"')
        done()
    })
    it('should return AND oprator with multiple OR operators if value is an array', function (done) {
        var selectorQuerySection = util.selectorQuery('testers', 'country', ['US', 'JP'])
        expect(selectorQuerySection).to.be.equal(' AND (testers.country="US" OR testers.country="JP")')
        done()
    })
})

describe('getSearchCriteria', function () {
    it('should return single value without any OR operators if a single value is passed to the function', function (done) {
        util.getSearchCriteria('country', 'testers', 'US', 'Country', function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.equal('Country="US"')
            done()
        })
    })
    it('should return "All" without any OR operators if a all possible values are passed to the function', function (done) {
        util.getSearchCriteria('country', 'testers', allCountries, 'Country', function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.equal('Country="All"')
            done()
        })
    })
    it('should return values with OR between them if multiple but not all values are passed to the function', function (done) {
        util.getSearchCriteria('country', 'testers', ['US', 'JP'], 'Country', function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.equal('Country="US" or "JP"')
            done()
        })
    })
})

describe('getSearchCriterias', function () {
    it('should return string concatenation of getSearchCriterias', function (done) {
        util.getSearchCriterias('US', 'iPhone 4', function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.equal('Country="US" and Device="iPhone 4"')
            done()
        })
    })
})

describe('getMatches', function () {
    it('should present Matches number and names, then how many bugs for each device per tester and the total bugs for tester, then Results testers names ', function (done) {

        util.getMatches(allBugs, function (err, bugsByTestersPresentation) {
            expect(err).to.be.null
            expect(bugsByTestersPresentation.indexOf('Matches: 2 testers (a1 b1 and a2 b2)')).to.not.equal(-1)
            expect(bugsByTestersPresentation.indexOf('a1 b1 filed 2 bugs for Galaxy S4 and 1 bugs for Galaxy S5 and 1 bugs for iPhone 5')).to.not.equal(-1)
            expect(bugsByTestersPresentation.indexOf('4 bugs filed for devices in search.')).to.not.equal(-1)
            expect(bugsByTestersPresentation.indexOf('a2 b2 filed 1 bugs for Galaxy S4')).to.not.equal(-1)
            expect(bugsByTestersPresentation.indexOf('1 bugs filed for devices in search.')).to.not.equal(-1)
            expect(bugsByTestersPresentation.indexOf('Results: a1 b1,a2 b2')).to.not.equal(-1)
            done()
        })
    })
})

describe('getBugsProperties', function () {
    it('should return the searchCriterias and the bugsProperties without any connection to the passed parameters (e.g testerCountry, deviceDescription, allBugs)', function (done) {
        var allBugs = [
            {
                country: 'doesnt matter',
                firstName: 'a1',
                lastName: 'b1',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'a1',
                lastName: 'b1',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'a1',
                lastName: 'b1',
                description: 'Galaxy S5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'a1',
                lastName: 'b1',
                description: 'iPhone 5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'a2',
                lastName: 'b2',
                description: 'Galaxy S4',
                testerId: 2,
                deviceId: 'doesnt matter'
            }
        ]
        var testerCountry = 'US', deviceDescription = 'iPhone 5'
        util.getBugsProperties(testerCountry, deviceDescription, allBugs, function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.a('array')
            expect(response.length).to.be.equal(2)
            expect(response[0]).to.be.equal('Country="US" and Device="iPhone 5"')
            expect(response[1].indexOf('Matches: 2 testers (a1 b1 and a2 b2)')).to.not.equal(-1)
            expect(response[1].indexOf('a1 b1 filed 2 bugs for Galaxy S4 and 1 bugs for Galaxy S5 and 1 bugs for iPhone 5')).to.not.equal(-1)
            expect(response[1].indexOf('4 bugs filed for devices in search.')).to.not.equal(-1)
            expect(response[1].indexOf('a2 b2 filed 1 bugs for Galaxy S4')).to.not.equal(-1)
            expect(response[1].indexOf('1 bugs filed for devices in search.')).to.not.equal(-1)
            expect(response[1].indexOf('Results: a1 b1,a2 b2')).to.not.equal(-1)
            done()
        })
    })
})

describe.only('getBugs', function(){
    it('should return the response as an object with the searchCriterias and bugsProperties as keys', function(done){
        util.getBugs('US', 'iPhone 5', function(response){
            expect(response).to.be.a('object')
            expect(response.searchCriterias).to.be.equal('Country="US" and Device="iPhone 5"')
            expect(response.bugsProperties.indexOf('Matches: 1 testers (Miguel Bautista)')).to.not.equal(-1)
            expect(response.bugsProperties.indexOf('Miguel Bautista filed 30 bugs for iPhone 5')).to.not.equal(-1)
            expect(response.bugsProperties.indexOf('30 bugs filed for devices in search.')).to.not.equal(-1)
            expect(response.bugsProperties.indexOf('Results: Miguel Bautista')).to.not.equal(-1)
            done()
        })
    })
})