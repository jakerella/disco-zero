const express = require('express')
const router = express.Router()
const uuid = require('uuid')
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const AppError = require('../util/AppError')
const userModel = require('../models/user')


router.get('/', (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/')
    } else {
        return next(new AppError('You need a valid, unique code. Have you checked your badge?', 400))
    }
})

router.post('/', async (req, res, next) => {
    const handle = userModel.cleanHandle(req.body.handle)

    let errors = []
    if (!req.body.code || !uuid.validate(req.body.code)) {
        return next(new AppError('You need a valid, unique code. Have you checked your badge?', 400))
    } else {
        const handleInUse = await userModel.handleByCode(req.body.code)
        if (handleInUse) {
            logger.info(`Attempt to use already registered (or bad) code (${req.body.code}) by new handle: ${handle}`)
            return next(new AppError('It looks like that code has already been registered.', 400))
        }
    }
    if (!handle) {
        errors.push('You need a handle! Otherwise what will people call you?')
    } else if (await userModel.handleExists(handle)) {
        errors.push('That handle is taken. Can you choose another?')
    }
    if (!req.body.pass) {
        errors.push('You need to enter a password.')
    }
    
    if (errors.length) {
        return res.render('register', {
            page: 'register',
            title: `Register for ${process.env.APP_NAME}`,
            code: req.body.code,
            message: errors.join(' ')
        })
    }

    try {
        const user = await userModel.create(handle, req.body.code, req.body.pass)
        
        logger.info(`Registered new user with handle '${handle}' and code '${req.body.code}'`)
    
        req.session.regenerate((err) => {
            if (err) {
                logger.warn(`Error generating new user session after registration: ${err.message || err}`)
                return next(new AppError('Sorry, but there was a problem while generating a session, can you try refreshing?', 400))
            }
            req.session.user = user
            req.session.save((err) => {
                if (err) {
                    logger.warn(`Error saving new user session after registration: ${err.message || err}`)
                    return next(new AppError('Sorry, but there was a problem while saving your session, can you try refreshing?', 400))
                }
                res.redirect('/')
            })
        })
    } catch(err) {
        logger.warn(`Problem during user registration: ${err.message || err}`)
        return next(err)
    }
})

module.exports = router
