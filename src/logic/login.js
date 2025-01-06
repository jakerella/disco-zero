const express = require('express')
const router = express.Router()
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const AppError = require('../util/AppError')
const userModel = require('../models/user')

router.get('/', async (req, res) => {
    if (req.session.user) {
        return res.redirect('/')
    }
    return res.render('login', {
        page: 'login',
        title: 'Login'
    })
})

router.post('/', async (req, res, next) => {
    let [handle, pin] = req.body.input.trim().split(' ')
    handle = userModel.cleanHandle(handle)

    if (!handle || !pin) {
        return res.render('login', {
            page: 'login',
            title: 'Login',
            message: 'Please enter your handle and PIN. If you haven\'t registered for the game yet, maybe ask someone how you can.'
        })
    }

    const user = await userModel.login(handle, pin)
    if (!user) {
        return res.render('login', {
            page: 'login',
            title: 'Login',
            message: 'Sorry, but that handle and PIN don\'t match. Want to try again?'
        })
    }
    
    logger.info(`User login by '${user.handle}'`)
    req.session.regenerate(function (err) {
        if (err) {
            logger.warn(`Error generating new user session: ${err.message || err}`)
            return next(new AppError('Sorry, but there was a problem while logging in (1).'))
        }
        req.session.user = user
        req.session.save(function (err) {
            if (err) {
                logger.warn(`Error saving new user session: ${err.message || err}`)
                return next(new AppError('Sorry, but there was a problem while logging in (2).'))
            }
            res.redirect('/')
        })
    })
})

module.exports = router
