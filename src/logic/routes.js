const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const commands = require('./commands.js')
const AppError = require('../util/AppError.js')
const locations = require('../locations.json')
const logger = require('../util/logger.js')(process.env.LOG_LEVEL)
const uuid = require('uuid')

router.get('/', userCheck, async (req, res, next) => {
    console.log(req.user)
    try {
        res.render('game', {
            page: 'game',
            title: 'A game',
            user: req.user || {},
            location: locations[req.user?.location]?.name || '?'
        })
    } catch (err) {
        logger.error(err.message || err)
        next(new AppError('Sorry, there was a problem initializing the game.', 500))
    }
})

router.get('/r/:id', async (req, res) => {
    try {
        res.render('register', {
            page: 'register',
            title: 'Register',
            user_id: req.params.id
        })
    } catch (err) {
        logger.error(err.message || err)
        next(new AppError('Sorry, there was a problem initializing game registration.', 500))
    }
})

router.get('/r/:id/:handle', async (req, res, next) => {
    const handle = req.params.handle.trim().replaceAll(/[^a-z0-9\-\.\'\s]/g, '').split(' ')[0]

    if (!req.params.id || !uuid.validate(req.params.id)) {
        return next(new AppError('You need a valid, unique code. Have you checked your badge?', 400))
    } else if (!handle) {
        return next(new AppError('You need a handle! Otherwise what will people call you?', 400))
    }
    
    // TODO: check for existing user with that UUID and/or handle
    // TODO: save new user

    logger.info(`Registered new user with handle '${handle}' and id '${req.params.id}'`)

    res.end(`You are now ${handle}`)
})

router.get('/cmd', userCheck, async (req, res, next) => {
    let out = 'Nothing happened.'
    let tokens = req.query.c.trim().toLowerCase().replaceAll(/[^a-z0-9\s\-]/g, '').split(' ')

    let cmd = []
    let found = false
    for (let i=0; i<tokens.length; ++i) {
        let token = expandContraction(tokens[i])
        cmd.push(token)
        if (commands[cmd.join(' ')]) {
            try {
                found = true
                out = await commands[cmd.join(' ')](req.user || null, ...tokens.slice(i+1))
            } catch(err) {
                return next(new AppError(err, 400))
            }
            if (Array.isArray(out)) {
                out = out.join('<br>')
            }
        }
    }
    if (found) {
        await userModel.save(req.user)
        res.end(out)
    } else {
        return next(new AppError('Nothing happened. Maybe try something else?', 400))
    }
})

async function userCheck(req, res, next) {
    req.user = (await userModel.get(req.handle, req.code)) || null
    if (!req.user) {
        return next(new AppError('Sorry, but it looks like you are not registered yet.', 401))
    }
    next()
}

function expandContraction(t) {
    const seconds = { 's': 'is', 'd': 'did', 't': 'not', 'll': 'will' }
    
    let m = t.match(/^(who|what|where|when|why|how)(s|d|ll)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }
    
    m = t.match(/^(can|don)(t)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }
    if (t === 'wont') { return 'will not' }

    m = t.match(/^(i|you|they)(d|m|ll)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }

    return t
}

module.exports = router
