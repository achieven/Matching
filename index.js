const express = require('express'), app = express()
const util = require('./util')
const fs = require('fs')
const Handlebars = require('handlebars')


util.initializeDB()
util.initializeTables()

function showWebsiteOnScreen(){
    app.use(express.static(__dirname + '/'));
    app.listen(3000, function(){
        console.log('listening on port 3000')
    })
    app.get('/', function(req, res){
        util.getAllCountries(function(countries){
            util.getAllDevices(function(devices){
                var html = Handlebars.compile(fs.readFileSync('./app.html', 'utf8'))({
                    countries: countries,
                    devices: devices
                })
                res.send(html)
            })
        })
    })
}
showWebsiteOnScreen()

function handleRequests(){
    app.get('/search', function(req, res){
        var country = req.query.country, device = req.query.description
        util.getBugs(country,device, function(reply){
            var html = Handlebars.compile(fs.readFileSync('./reply.html', 'utf8'))({
                searchCriteria: req.query,
                reply: reply
            })
            res.send(html)
        })
    })
}
handleRequests()



