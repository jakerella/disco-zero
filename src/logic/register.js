const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const uuid = require('uuid')

router.get('/:code', async (req, res) => {
    try {
        res.render('register', {
            page: 'register',
            title: 'Register',
            code: req.params.code
        })
    } catch (err) {
        logger.error(err.message || err)
        next(new AppError('Sorry, there was a problem initializing game registration.', 500))
    }
})

router.get('/:code/:handle', async (req, res, next) => {
    const handle = userModel.cleanHandle(req.params.handle)

    if (!req.params.code || !uuid.validate(req.params.code)) {
        return next(new AppError('You need a valid, unique code. Have you checked your badge?', 400))
    } else if (!handle) {
        return next(new AppError('You need a handle! Otherwise what will people call you?', 400))
    }

    if (await userModel.handleExists(handle)) {
        return next(new AppError('Sorry, but that handle is taken. Can you choose another?', 400))
    }
    await userModel.save({
        handle,
        code: req.params.code,
        location: '0193feed-2940-71ba-9fc5-64122b4b79ff',
        items: [],
        visited: ['0193feed-2940-71ba-9fc5-64122b4b79ff'],
        contacts: []
    })
    
    logger.info(`Registered new user with handle '${handle}' and code '${req.params.code}'`)
    res.cookie('disco-user', `${req.params.code}|${handle}`)
    res.end(`You are now ${handle}`)
})

module.exports = router
