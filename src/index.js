require('dotenv').config({ override: true })

const express = require('express')
const logger = require('./util/logger')(process.env.LOG_LEVEL)
const game = require('./logic/routes')

// env vars and other config
const PORT = process.env.PORT || 80

const app = express()
app.use(express.static('static'))
app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: false }))

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
server.listen(PORT, () => {
    logger.info(`Listening at https://localhost:%s`, PORT)
})
