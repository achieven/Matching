var util = require('../util')
const expect = require('chai').expect
const async = require('async')
const sqlite = require('sqlite3').verbose()
var db = new sqlite.Database('matching')

const allCountries = ['US', 'GB', 'JP']
const allDescriptions = ['iPhone 4', 'iPhone 4S', 'iPhone 5', 'Galaxy S3', 'Galaxy S4', 'Nexus 4', 'Droid Razor', 'Droid DNA', 'HTC One', 'iPhone 3']


describe('initalizeDB', function () {
    it('should initialize 3 new tables', function (done) {
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
    it('should return error if bad parameters were sent to the function (e.g field or table misspelling)', function (done) {
        async.parallel([
            function (callback) {
                util.getFieldValues('wrongDescription', 'devices', function (err, response) {
                    expect(err).to.be.a('error')
                    expect(err.code).to.be.equal('SQLITE_ERROR')
                    expect(err.message).to.be.equal('SQLITE_ERROR: no such column: wrongDescription')
                    expect(err.errno).to.be.equal(1)
                    expect(response).to.be.undefined
                    callback(null)
                })
            }, function (callback) {
                util.getFieldValues('description', 'wrongDevices', function (err, response) {
                    expect(err).to.be.a('error')
                    expect(err.code).to.be.equal('SQLITE_ERROR')
                    expect(err.message).to.be.equal('SQLITE_ERROR: no such table: wrongDevices')
                    expect(err.errno).to.be.equal(1)
                    expect(response).to.be.undefined
                    callback(null)
                })
            }
        ], function (err, response) {
            done()
        })
    })
})

describe('getValues', function () {
    it('should return 2 arrays - of unique countries and unique descriptions', function (done) {
        util.getValues(function (err, results) {
            expect(err).to.be.null
            expect(results).to.be.a('array')
            expect(results.length).to.be.equal(2)
            expect(results[0]).to.eql(allCountries)
            expect(results[1]).to.eql(allDescriptions)
            done()
        })
    })
})

describe('getAllValues', function () {
    it('should', function (done) {
        util.getAllValues(function (status, results) {
            expect(status).to.be.equal(200)
            expect(results).to.be.a('object')
            expect(results.countries).to.eql(allCountries)
            expect(results.devices).to.eql(allDescriptions)
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
    it('should return error if bad parameters were sent to the function (e.g field or table misspelling)', function (done) {
        async.parallel([
            function (callback) {
                util.getSearchCriteria('country', 'wrongTable', ['US', 'JP'], 'Country', function (err, response) {
                    expect(err).to.be.a('error')
                    expect(err.code).to.be.equal('SQLITE_ERROR')
                    expect(err.message).to.be.equal('SQLITE_ERROR: no such table: wrongTable')
                    expect(err.errno).to.be.equal(1)
                    expect(response).to.be.undefined
                    callback(null)
                })
            },
            function (callback) {
                util.getSearchCriteria('wrongColumn', 'testers', ['US', 'JP'], 'Country', function (err, response) {
                    expect(err).to.be.a('error')
                    expect(err.code).to.be.equal('SQLITE_ERROR')
                    expect(err.message).to.be.equal('SQLITE_ERROR: no such column: wrongColumn')
                    expect(err.errno).to.be.equal(1)
                    expect(response).to.be.undefined
                    callback(null)
                })
            },
        ], function (err, response) {
            done()
        })

    })
})

describe('getSearchCriterias', function () {
    it('should return string concatenation of getSearchCriterias', function (done) {
        util.getSearchCriterias('US', 'iPhone 4', function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.a('object')
            expect(response.searchCriteria).to.be.a('object')
            expect(response.searchCriteria.header).to.be.equal('Search Criteria:')
            expect(response.searchCriteria.text).to.be.equal('Country="US" and Device="iPhone 4"')
            done()
        })
    })
})

describe('getMatches', function () {
    it('should present Matches number and names, then how many bugs for each device per tester and the total bugs for tester, then Results testers names ', function (done) {
        var allBugs = [
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'iPhone 5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Michael',
                lastName: 'Lubavin',
                description: 'Galaxy S4',
                testerId: 2,
                deviceId: 'doesnt matter'
            }
        ]
        util.getMatches(allBugs, 'US', function (err, bugsByTestersPresentation) {
            expect(err).to.be.null
            expect(bugsByTestersPresentation).to.be.a('object')
            expect(bugsByTestersPresentation.matches).to.be.a('object')
            expect(bugsByTestersPresentation.matches.header).to.be.equal('Matches:')
            expect(bugsByTestersPresentation.matches.text).to.be.equal('3 testers (Miguel Bautista and Michael Lubavin and Taybin Rutkin)')
            expect(bugsByTestersPresentation.body).to.be.a('object')
            expect(bugsByTestersPresentation.body.header).to.be.equal('')
            expect(bugsByTestersPresentation.body.text).to.be.equal('Miguel Bautista filed 2 bugs for Galaxy S4 and 1 bug for Galaxy S5 and 1 bug for iPhone 5.<br>4 bugs filed for devices in search.<br>Michael Lubavin filed 1 bug for Galaxy S4.<br>1 bugs filed for devices in search.<br>Taybin Rutkin filed 0 bugs.<br>0 bugs filed for devices in search.<br>')
            expect(bugsByTestersPresentation.results).to.be.a('object')
            expect(bugsByTestersPresentation.results.header).to.be.equal('Results:')
            expect(bugsByTestersPresentation.results.text).to.be.equal('Miguel Bautista, Michael Lubavin, Taybin Rutkin')
            done()
        })
    })
})

describe('getBugsPresentation', function () {
    it('should return the searchCriterias and the bugsProperties without any connection to the passed parameters (e.g testerCountry, deviceDescription, allBugs)', function (done) {
        var allBugs = [
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S4',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'Galaxy S5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Miguel',
                lastName: 'Bautista',
                description: 'iPhone 5',
                testerId: 1,
                deviceId: 'doesnt matter'
            },
            {
                country: 'doesnt matter',
                firstName: 'Michael',
                lastName: 'Lubavin',
                description: 'Galaxy S4',
                testerId: 2,
                deviceId: 'doesnt matter'
            }
        ]
        var testerCountry = 'US', deviceDescription = 'iPhone 5'
        util.getBugsPresentation(testerCountry, deviceDescription, allBugs, function (err, response) {
            expect(err).to.be.null
            expect(response).to.be.a('array')
            expect(response.length).to.be.equal(2)
            expect(response[0].searchCriteria).to.be.a('object')
            expect(response[0].searchCriteria.header).to.be.equal('Search Criteria:')
            expect(response[0].searchCriteria.text).to.be.equal('Country="US" and Device="iPhone 5"')
            expect(response[1].matches).to.be.a('object')
            expect(response[1].matches.header).to.be.equal('Matches:')
            expect(response[1].matches.text).to.be.equal('3 testers (Miguel Bautista and Michael Lubavin and Taybin Rutkin)')
            expect(response[1].body).to.be.a('object')
            expect(response[1].body.header).to.be.equal('')
            expect(response[1].body.text).to.be.equal('Miguel Bautista filed 2 bugs for Galaxy S4 and 1 bug for Galaxy S5 and 1 bug for iPhone 5.<br>4 bugs filed for devices in search.<br>Michael Lubavin filed 1 bug for Galaxy S4.<br>1 bugs filed for devices in search.<br>Taybin Rutkin filed 0 bugs.<br>0 bugs filed for devices in search.<br>')
            expect(response[1].results).to.be.a('object')
            expect(response[1].results.header).to.be.equal('Results:')
            expect(response[1].results.text).to.be.equal('Miguel Bautista, Michael Lubavin, Taybin Rutkin')
            done()
        })
    })
})

describe('getBugs', function () {
    it('should return the response as an object with the searchCriterias and bugsProperties as keys', function (done) {
        util.getBugs('US', 'iPhone 5', function (status, response) {
            expect(status).to.be.equal(200)
            expect(response).to.be.a('object')
            expect(response.searchCriteria).to.be.a('object')
            expect(response.searchCriteria.header).to.be.equal('Search Criteria:')
            expect(response.searchCriteria.text).to.be.equal('Country="US" and Device="iPhone 5"')
            expect(response.matches).to.be.a('object')
            expect(response.matches.header).to.be.equal('Matches:')
            expect(response.matches.text).to.be.equal('3 testers (Miguel Bautista and Michael Lubavin and Taybin Rutkin)')
            expect(response.body).to.be.a('object')
            expect(response.body.header).to.be.equal('')
            expect(response.body.text).to.be.equal('Miguel Bautista filed 30 bugs for iPhone 5.<br>30 bugs filed for devices in search.<br>Michael Lubavin filed 0 bugs.<br>0 bugs filed for devices in search.<br>Taybin Rutkin filed 0 bugs.<br>0 bugs filed for devices in search.<br>')
            expect(response.results).to.be.a('object')
            expect(response.results.header).to.be.equal('Results:')
            expect(response.results.text).to.be.equal('Miguel Bautista, Michael Lubavin, Taybin Rutkin')
            done()
        })
    })
})
describe('showPropertiesOnScreen', function () {
    it('should have status 200 and properties of app when app option is sent (initial rendering)', function () {
        util.showPropertiesOnScreen('app', [allCountries, allDescriptions], function (err, status, properties) {
            expect(err).to.be.null
            expect(status).to.be.equal(200)
            expect(properties).to.eql({
                countries: allCountries,
                devices: allDescriptions,
                showError: 'hide'
            })
        })
    })
    it('should have status 200 and properties of reply when reply option is sent (response of query)', function () {
        var response = [
            {
                searchCriteria: {
                    header: 'Search Criteria:',
                    text: 'Country="GB" and Device="All"'
                }
            },
            {
                matches: {
                    header: 'Matches:',
                    text: '3 testers (Leonard Sutton and Stanley Chen and Darshini Thiagarajan)'
                },
                body: {
                    header: '',
                    text: 'Leonard Sutton filed 27 bugs for Nexus 4 and 32 bugs for iPhone 5 and 28 bugs for Galaxy S3 and 19 bugs for Galaxy S4.<br>106 bugs filed for devices in search.<br>Stanley Chen filed 110 bugs for iPhone 5.<br>110 bugs filed for devices in search.<br>Darshini Thiagarajan filed 25 bugs for Droid DNA and 30 bugs for HTC One and 21 bugs for Galaxy S4 and 28 bugs for Nexus 4.<br>104 bugs filed for devices in search.<br>'
                },
                results: {
                    header: 'Results:',
                    text: 'Leonard Sutton, Stanley Chen, Darshini Thiagarajan'
                }
            }]
        util.showPropertiesOnScreen('reply', response, function (err, status, properties) {
            expect(err).to.be.null
            expect(status).to.be.equal(200)
            expect(properties).to.eql({
                searchCriteria: response[0].searchCriteria,
                matches: response[1].matches,
                body: response[1].body,
                results: response[1].results,
                showError: 'hide'
            })
        })
    })
})

describe('mainCallback', function () {
    it('should return status 500 and error mesage if err was passed', function () {
        util.mainCallback(function (status, properties) {
            expect(status).to.be.equal(500)
            expect(properties).to.be.a('object')
            expect(properties.err).to.be.equal('Internal server error. We are working on getting it fixed. Thank you!')
            expect(properties.showForm).to.be.equal('hide')
        }, 'err', 'doesnt matter', 'doesnt matter')
    })
    it('should return status 200 and properties to render if err was not passed', function () {
        var status = 200
        var properties = 'properties'
        util.mainCallback(function (status, properties) {
            expect(status).to.be.equal(status)
            expect(properties).to.be.equal(properties)
        }, null, status, properties)
    })
})