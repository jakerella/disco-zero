const express = require('express')
const router = express.Router()
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const handleContact = require('../logic/contact')


router.get('/:code', async (req, res, next) => {
    if (req.session.user) {
        if (req.session.user.code === req.params.code) {
            return res.render('game', {
                page: 'game',
                title: process.env.APP_NAME || 'Game',
                appName: process.env.APP_NAME || '',
                user: req.session.user,
                message: `You look at your confirmation email... yep, that\'s you.`
            })
        } else {
            try {
                const message = await handleContact(req, req.params.code)

                if (!message) {
                    message = 'You look closely at the code you found, but can\'t make sense of it. Oh well.'
                }

                res.setHeader('X-Part', '91ee')
                return res.render('game', {
                    page: 'game',
                    title: process.env.APP_NAME || 'Game',
                    appName: process.env.APP_NAME || '',
                    user: req.session.user,
                    message: message,
                    convo: !!req.session.user.convo
                })
            } catch(err) {
                logger.warn('Error while handling contact...')
                logger.warn(err)
                return next(err)
            }
        }
    } else {
        let handle = null
        try {
            handle = await userModel.handleByCode(req.params.code)
        } catch (_) {
            /* we let this go because it's almost certainly user error */
        }
        if (handle) {
            return next(new AppError('Hmm, that code is already registered. Are you logged in?', 400))
        } else if (handle === null) {
            return next(new AppError('Not sure what you\'re trying to do, but it isn\'t working.', 400))
        } else {
            res.render('register', {
                page: 'register',
                title: `Register for ${process.env.APP_NAME}`,
                code: req.params.code
            })
        }
    }
})

module.exports = router
