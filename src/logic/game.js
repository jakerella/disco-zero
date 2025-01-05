const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const commands = require('./commands')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

router.get('/', userCheck, async (req, res, next) => {
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

router.get('/cmd', userCheck, async (req, res, next) => {
    let out = 'Nothing happened.'
    let tokens = req.query.c.trim().toLowerCase().replaceAll(/[^a-z0-9\s\-]/g, '').split(' ')

    // TODO: check if the user is in a convo and bypass commands

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
    let user = null
    if (req.headers?.cookie) {
        const [code, handle] = decodeURIComponent(req.headers?.cookie.split('=')[1]).split('|')
        user = (await userModel.get(handle, code)) || null
    }
    if (!user) {
        return next(new AppError('Sorry, but it looks like you are not registered. Maybe check your badge?', 401))
    }
    req.user = user
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
