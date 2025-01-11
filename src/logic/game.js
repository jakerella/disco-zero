const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const commands = require('./commands')
const convo = require('./convo')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const people = require('../people.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            page: 'login',
            title: `${process.env.APP_NAME} Login`
        })
    } else {
        const location = locations[req.session.user.location].name
        const message = [
            `You are currently ${(location) ? `at the ${location}` : 'lost'}.`
        ]
        if (req.session.user.convo) {
            const person = people[req.session.user.convo[0]]
            if (person) {
                message.push(`You had been chatting with ${person.name}. They said, "${person.conversation[req.session.user.convo[1]].phrase}"`)
            } else {
                logger.warn(`Unable to find person that user was chatting with (${req.session.user.convo[0]})`)
                req.session.user.convo = null
                await userModel.save(req.session.user)
            }
        }
        
        res.render('game', {
            page: 'game',
            title: process.env.APP_NAME || 'Game',
            appName: process.env.APP_NAME || '',
            user: req.session.user || {},
            message: message.join('\n'),
            convo: !!req.session.user.convo
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

    if (['logout', 'quit', 'q', 'exit'].includes(tokens[0])) {
        req.session.destroy()
        return res.redirect('/login')
    }

    for (let i=0; i<tokens.length; ++i) {
        tokens[i] = expandContraction(tokens[i])
    }

    if (req.session.user.convo) {
        try {
            out = convo.handleConversation(req.session.user, tokens.join(' ').replace(/\s?please\s?/, ''))
            req.session.user.score = Math.max(req.session.user.score, 0)
            await userModel.save(req.session.user)
        } catch(err) {
            return next(err)
        }
        if (req.session.user.convo) {
            res.set(`X-${process.env.APP_NAME}-action`, 'convo')
        }
        // TODO: allow templatized info like {{handle}}
        return res.end(out)
    }

    let cmd = []
    let found = false
    for (let i=0; i<tokens.length; ++i) {
        if (tokens[i] === 'please') {
            continue
        }
        cmd.push(tokens[i])
        if (commands[cmd.join(' ')]) {
            try {
                found = true
                out = await commands[cmd.join(' ')](req.session.user || null, ...tokens.slice(i+1))
            } catch(err) {
                console.log(err)
                return next(err)
            }
            if (Array.isArray(out)) {
                out = out.join('\n')
            }
        }
    }
    if (found) {
        req.session.user.score = Math.max(req.session.user.score, 0)
        await userModel.save(req.session.user)
        if (req.session.user.convo) {
            res.set(`X-${process.env.APP_NAME}-action`, 'convo')
        }
        // TODO: allow templatized info like {{handle}}
        res.end(out)
    } else {
        return next(new AppError('Nothing happened. Maybe try something else?', 400))
    }
})

function expandContraction(t) {
    const seconds = { 's': 'is', 'd': 'did', 't': 'not', 'll': 'will', 're': 'are', 'm': 'am', 've': 'have' }
    
    let m = t.match(/^(who|what|where|when|why|how)(s|d|ll|re|ve)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }
    
    m = t.match(/^(can|don|didn|shouldn)(t)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }
    if (t === 'wont') { return 'will not' }

    m = t.match(/^(i|you|they|he|she)(s|d|m|ll|ve)$/)
    if (m) { return `${m[1]} ${seconds[m[2]]}` }

    return t
}

module.exports = router
