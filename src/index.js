require('dotenv').config({ override: true })

const express = require('express')
const session = require('express-session')
const { RedisStore } = require('connect-redis')
const redis = require('redis')
const fs = require('fs')
const logger = require('./util/logger')(process.env.LOG_LEVEL)
const game = require('./logic/game')
const contact = require('./logic/contact')
const register = require('./logic/register')
const login = require('./logic/login')

const PORT = process.env.PORT || 80

/* ********** basic express app creation ********** */
const app = express()
app.use(express.static('static'))
app.set('view engine', 'pug')
app.set('x-powered-by', false)
app.use(express.urlencoded({ extended: false }))


/* ********** session handling ********** */
const redisSessionClient = redis.createClient({ url: process.env.REDIS_URL })
redisSessionClient.on('error', (err) => {
    if (/ECONNREFUSED/.test(err.message || err)) {
        logger.error(`Unable to establish redis connection for session store on startup, stopping Node process:\n${err.message || err}`)
        process.exit(1)
    } else {
        logger.warn(`Error from Redis session client: ${err.message || err}`)
    }
})
redisSessionClient.connect()
const sessionOptions = {
    secret: process.env.SESS_SECRET,
    store: new RedisStore({ client: redisSessionClient }),
    resave: false,
    cookie: { maxAge: 86400000 * 3 }, // 3 days
    name: `${process.env.APP_NAME}-session`,
    saveUninitialized: false
}
if (process.env.NODE_ENV !== 'development') {
    app.set('trust proxy', 1)
    sessionOptions.cookie.secure = true
}
app.use(session(sessionOptions))


/* ********** routes and middleware ********** */
app.use('/contact', contact)
app.use('/register', register)
app.use('/login', login)
app.use('/', game)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    let status = err.status || 500
    if (status > 499) {
        logger.error(`${err.message || err} ${err.stack.split('\n')[1]}`)
    }
    
    res.status(status)
    
    if (req.headers.accept === 'text/plain') {
        res.end((status > 499) ? 'Sorry, there was a problem. Try again later.' : err.message)
    } else {
        res.render('error', {
            page: 'error',
            title: `${process.env.APP_NAME} Error`,
            message: (status === 500) ? 'Sorry, we ran into a problem.' : err.message
        })
    }
})


/* ********** app startup ********** */
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
