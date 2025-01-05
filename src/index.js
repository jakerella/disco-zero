require('dotenv').config({ override: true })

const express = require('express')
const fs = require('fs')
const logger = require('./util/logger')(process.env.LOG_LEVEL)
const game = require('./logic/game')
const register = require('./logic/register')

// env vars and other config
const PORT = process.env.PORT || 80

const app = express()
app.use(express.static('static'))
app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: false }))

app.use('/r', register)
app.use('/', game)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    let status = err.status || 500
    if (status > 499) {
        logger.error(err)
    }
    
    res.status(status)
    
    if (req.headers.accept === 'text/plain') {
        res.end((status > 499) ? 'Sorry, there was a problem. Try again later.' : err.message)
    } else {
        res.render('error', {
            page: 'error',
            title: 'DisCo - Error',
            message: (status === 500) ? 'Sorry, we ran into a problem.' : err.message
        })
    }
})

let server = app

if (process.env.NODE_ENV === 'development' && fs.existsSync('./localcert/localhost.crt')) {
    const cert = fs.readFileSync('./localcert/localhost.crt')
    const key = fs.readFileSync('./localcert/localhost.decrypted.key')
    const https = require('https')
    server = https.createServer({ key, cert }, app)
}

server.listen(PORT, () => {
    logger.info(`Listening at https://localhost:${PORT}`)
})
