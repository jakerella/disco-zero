const express = require('express')
const router = express.Router()
const path = require('path')
const uuid = require('uuid')
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const userModel = require('../models/user')
const commands = require('../logic/commands')
const convo = require('../logic/convo')
const handleContact = require('../logic/contact')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const people = require('../people.json')

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    } else {
        const location = locations[req.session.user.location].name
        const message = [
            `You are currently ${(location) ? `at the ${location}` : 'lost'} and your score is ${req.session.user.score}.`
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
            user: req.session.user,
            message: message.join('\n'),
            convo: !!req.session.user.convo
        })
    }
})

router.post('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    } else {
        let out = null
        try {
            out = await handleCommand(req, req.body.prompt)
            if (out) {
                if (/^DOWNLOAD\|/.test(out)) {
                    out = 'Nothing happened, but you should try that same command again.'
                } else {
                    out = processTemplate(req.session.user, out)
                }
            } else {
                logger.debug(`Null command: ${cleanCommand(req.body.prompt)}`)
                out = 'Nothing happened. Maybe try something else?'
            }

        } catch(err) {
            if (err.status === 401) {
                req.session.destroy()
                return res.redirect('/login')
            } else {
                logger.error(`${err.message || err} ${err.stack.split('\n')[1]}`)
                out = 'Sorry, there was a problem. Try again later.'
            }
        }
        
        res.render('game', {
            page: 'game',
            title: process.env.APP_NAME || 'Game',
            appName: process.env.APP_NAME || '',
            user: req.session.user,
            message: req.body.message,
            prompt: req.body.prompt,
            output: out,
            convo: !!req.session.user.convo
        })
    }
})

router.get('/cmd', async (req, res, next) => {
    let out = null
    try {
        let cmd = req.query.c

        const secondaryAction = (req.headers[`x-${process.env.APP_NAME.toLowerCase()}-action`] || '').split('|')
        if (secondaryAction.length === 3) {
            cmd = `${secondaryAction[1]} ${secondaryAction[0]}|${cmd}|${secondaryAction[2]}`
        }

        out = await handleCommand(req, cmd)
        if (req.session.user.convo) {
            res.set(`X-${process.env.APP_NAME}-action`, 'convo')
        }

        if (out) {
            if (/^DOWNLOAD\|/.test(out)) {
                processDownload(out, res)
            } else if (/^PASSWORD\|/.test(out)) {
                res.set(`X-${process.env.APP_NAME}-action`, out)
                return res.end('Someone steps out and bocks your way. "Sorry, but I\'m going to need the password."')
            } else {
                return res.end(processTemplate(req.session.user, out))
            }
        } else {
            logger.debug(`Null command: ${cleanCommand(cmd)}`)
            return next(new AppError('Nothing happened. Maybe try something else?', 400))
        }

    } catch(err) {
        if (err.status === 401) {
            req.session.destroy()
            return res.redirect('/login')
        } else {
            return next(err)
        }
    }
})

function cleanCommand(input) {
    return (input || '').trim().toLowerCase().replaceAll(/[^a-z0-9\s\-\|]/g, '')
}

async function handleCommand(req, input) {
    if (!req.session.user) {
        throw new AppError('Sorry, but you are not logged in', 401)
    }
    if (!input) {
        return ' '
    }

    const user = req.session.user
    let out = null
    let tokens = cleanCommand(input).split(' ')

    if (['logout', 'quit', 'q'].includes(tokens[0])) {
        throw new AppError('Please log in', 401)
    }

    for (let i=0; i<tokens.length; ++i) {
        tokens[i] = expandContraction(tokens[i])
    }

    if (user.convo) {
        out = await convo.handleConversation(user, tokens.join(' ').replace(/\s?please\s?/, ''))
        user.score = Math.max(user.score, 0)
        await userModel.save(user)
        return out
    }

    if (tokens.length === 1 && uuid.validate(tokens[0])) {
        return await handleContact(req, tokens[0])
    }

    let cmd = []
    for (let i=0; i<tokens.length; ++i) {
        if (tokens[i] === 'please') {
            continue
        }
        cmd.push(tokens[i])
        if (commands[cmd.join(' ')]) {
            out = await commands[cmd.join(' ')](user || null, ...tokens.slice(i+1))
            if (Array.isArray(out)) {
                out = out.join('\n')
            }
            break
        }
    }
    if (out) {
        user.score = Math.max(user.score, 0)
        await userModel.save(user)
    }
    return out
}

function processDownload(out, res) {
    const [_, filename, filepath] = out.split('|')
    const fullpath = path.join(__dirname, '..', '..', filepath)
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.sendFile(fullpath, function(err) {
        if(err) {
            logger.warn(err)
            return next(new AppError('Unable to download file.'))
        }
    })
}

function processTemplate(user, phrase) {
    let out = phrase
    const vars = out.match(/{{[a-z0-9\-]+}}/g)
    if (vars) {
        for (let i=0; i<vars.length; ++i) {
            const key = vars[i].substring(2, vars[i].length-2)
            if (user[key]) {
                out = out.replaceAll(vars[i], user[key])
            }
        }
    }
    return out
}

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
