const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const commands = require('./commands')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            page: 'login',
            title: 'Login'
        })
    } else {
        const location = locations[req.session.user.location].name
        res.render('game', {
            page: 'game',
            title: 'A little game',
            user: req.session.user || {},
            message: `You are ${req.session.user.handle} and are currently ${(location) ? `at the ${location}` : 'lost'}.`
        })
    }
})

router.get('/cmd', async (req, res, next) => {
    if (!req.session.user) {
        return next(new AppError('Sorry, but you are not logged in', 401))
    }
    if (!req.query.c) {
        return next(new AppError('You look around in confusion... is this where you\'re supposed to be?', 400))
    }

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
                out = await commands[cmd.join(' ')](req.session.user || null, ...tokens.slice(i+1))
            } catch(err) {
                return next(new AppError(err, 400))
            }
            if (Array.isArray(out)) {
                out = out.join('<br>')
            }
        }
    }
    if (found) {
        await userModel.save(req.session.user)
        res.end(out)
    } else {
        return next(new AppError('Nothing happened. Maybe try something else?', 400))
    }
})

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
