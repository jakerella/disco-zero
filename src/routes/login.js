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
        title: `${process.env.APP_NAME} Login`
    })
})

router.post('/', async (req, res, next) => {
    let parts = req.body.input.trim().split(' ')
    const handle = userModel.cleanHandle(parts[0])
    const pass = parts.slice(1).join(' ')
    
    if (!handle || !pass) {
        return res.render('login', {
            page: 'login',
            title: `${process.env.APP_NAME} Login`,
            message: 'Please enter your handle and password. If you haven\'t registered for the game yet, maybe ask someone how you can.'
        })
    }

    const user = await userModel.login(handle, pass)
    if (!user) {
        return res.render('login', {
            page: 'login',
            title: `${process.env.APP_NAME} Login`,
            message: 'Sorry, but that handle and password don\'t match. Want to try again?'
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
