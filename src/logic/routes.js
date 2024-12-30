const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const commands = require('./commands.js')
const AppError = require('../util/AppError.js')

router.get('/', async (req, res) => {
    res.render('game', {
        page: 'game',
        title: 'A game',
        user: req.user || null
    })
})

router.get('/cmd', userCheck, async (req, res, next) => {
    let out = 'Sorry, I don\'t understand.'
    let tokens = req.query.c.trim().toLowerCase().replaceAll(/[^a-z0-9\s]/g, '').split(' ')

    let cmd = []
    for (let i=0; i<tokens.length; ++i) {
        let token = expandContraction(tokens[i])
        cmd.push(token)
        if (commands[cmd.join(' ')]) {
            try {
                out = await commands[cmd.join(' ')](req.user || null, ...tokens.slice(i+1))
            } catch(err) {
                return next(err)
            }
            if (Array.isArray(out)) {
                out = out.join('<br>')
            }
        }
    }
    await userModel.save(req.user)
    res.end(out)
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
