const express = require('express')
const router = express.Router()
const commands = require('./commands.js')

router.get('/', async (req, res) => {
    res.render('game', {
        page: 'game',
        title: 'A game',
        user: req.user || null
    })
})

router.get('/cmd', async (req, res) => {
    let out = 'Sorry, I don\'t understand.'
    let tokens = req.query.c.trim().toLowerCase().replaceAll(/[^a-z0-9\s]/g, '').split(' ')

    let cmd = []
    for (let i=0; i<tokens.length; ++i) {
        cmd.push(tokens[i])
        if (commands[cmd.join(' ')]) {
            out = commands[cmd.join(' ')](req.user || null, ...tokens.slice(i+1))
            if (Array.isArray(out)) {
                out = out.join('<br>')
            }
        }
    }
    res.end(out)
})

module.exports = router
