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
    let out = 'command not found'
    let cmd = req.query.c.split(' ')
    if (commands[cmd[0]]) {
        out = commands[cmd[0]](...cmd.slice(1))
        if (Array.isArray(out)) {
            out = out.join('<br>')
        }
    }
    res.end(out)
})

module.exports = router
