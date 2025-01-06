const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)


router.get('/:code', async (req, res, next) => {
    let user = null
    if (req.session.user) {
        if (req.session.user.code === req.params.code) {
            return res.render('game', {
                page: 'game',
                title: 'A little game',
                user: req.session.user,
                message: `You look at your confirmation email... yep, that\'s you.`
            })
        } else {
            
            // TODO: new contact
            logger.debug(`new contact: ${req.params.code}`)

            res.render('game', {
                page: 'game',
                title: 'A little game',
                user: req.session.user,
                message: `New contact: ${req.params.code}`
            })
        }
    } else {
        const handle = await userModel.handleByCode(req.params.code)
        logger.debug(`handle? ${handle}`)
        if (handle) {
            return next(new AppError('Hmm, that code is already registered. Are you logged in?', 400))
        } else if (handle === null) {
            return next(new AppError('Not sure what you\'re trying to do, but it isn\'t working.', 400))
        } else {
            res.render('register', {
                page: 'register',
                title: 'Register',
                code: req.params.code
            })
        }
    }
})

module.exports = router
