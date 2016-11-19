const express = require('express'), app = express()
const util = require('./util')
const fs = require('fs')
const Handlebars = require('handlebars')


util.initializeDB()
util.initializeTables()

function showWebsiteOnScreen() {
    app.use(express.static(__dirname + '/'));
    app.listen(3000, function () {
        console.log('listening on port 3000')
    })
    app.get('/', function (req, res) {
        util.getAllValues(function (status, response) {
            var html = Handlebars.compile(fs.readFileSync('./app.html', 'utf8'))(response)
            res.status(status).send(html)
        })
    })
}
showWebsiteOnScreen()

function handleRequests() {
    app.get('/search', function (req, res) {
        var country = req.query.country, device = req.query.description
        util.getBugs(country, device, function (status, response) {
            var html = Handlebars.compile(fs.readFileSync('./reply.html', 'utf8'))(response)
            res.status(status).send(html)
        })
    })
}
handleRequests()



