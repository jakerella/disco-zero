require('dotenv').config()

const express = require('express')
const logger = require('./util/logger')()
const game = require('./logic/routes')

// env vars and other config
const PORT = process.env['PORT'] || 80

// Check our data connections
// require('./util/db.js')
//     .authenticate()
//     .catch((err) => {
//         logger.error('Unable to establish DB connection: %s', err)
//         process.exit(1)
//     })

const app = express()
app.use(express.static('static'))
app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: false }))

// REMOVE once we have DB lookup
const user = { handle: 'Jordan', energy: 100, location: 'yours truly hotel', items: [] }

app.use((req, res, next) => {
    // TODO: replace with actual user pulled form DB
    req.user = user
    next()
})

app.use('/', game)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    if (!err.status || err.status > 499) {
        logger.error(err)
    }
    
    res.status(err.status || 500)
    res.render('error', {
        page: 'error',
        title: 'DisCo - Error',
        message: (err.status === 500) ? 'Sorry, we ran into a problem.' : err.message
    })
})


let server = app
// if (process.env.NODE_ENV === 'development') {
//     const key = fs.readFileSync('./localcert/localhost.decrypted.key')
//     const cert = fs.readFileSync('./localcert/localhost.crt')

//     const https = require('https')
//     server = https.createServer({ key, cert }, app)
// }

// here we go...
server.listen(PORT, () => {
    logger.info(`Listening at https://localhost:%s`, PORT)
})
