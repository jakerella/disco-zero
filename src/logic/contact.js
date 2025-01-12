const express = require('express')
const router = express.Router()
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const items = require('../items.json')
const people = require('../people.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

const POINTS_FOR_PLAYER_CONTACT = 10
const POINTS_FOR_INACTIVE_PLAYER_CONTACT = 1

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
            let message = null

            const prevContact = req.session.user.contacts.filter((c) => c.id === req.params.code)[0]

            if (prevContact && prevContact.type === 'player') {
                message = 'Looks like you were already connected with that person!'

            } else if (locations[req.params.code]) {
                if (req.session.user.visited.includes(req.params.code)) {
                    message = `You already knew about the ${locations[req.params.code].name}, but this is a good reminder!`
                } else {
                    message = `You have discovered the ${locations[req.params.code].name}! You head over right away.`
                    req.session.user.location = req.params.code
                    req.session.user.visited.push(req.params.code)
                    req.session.user.score += locations[req.params.code].points || 1
                    await userModel.save(req.session.user)
                    logger.info(`${req.session.user.handle} found hidden location: ${locations[req.params.code].name}`)
                }

            } else if (items[req.params.code]) {
                if (req.session.user.items.includes(req.params.code)) {
                    message = `You already have the ${items[req.params.code].name}!`
                } else {
                    message = `You found a ${items[req.params.code].name}! You stash it away in your bag.`
                    req.session.user.items.push(req.params.code)
                    req.session.user.score += items[req.params.code].points || 1
                    await userModel.save(req.session.user)
                    logger.info(`${req.session.user.handle} found hidden item: ${items[req.params.code].name}`)
                }

            } else if (people[req.params.code]) {
                if (prevContact) {
                    message = `You look at your phone while standing around and re-read the message from ${people[req.params.code].name}: "${people[req.params.code].conversation[0].phrase}"`
                } else {
                    req.session.user.contacts.push({ id: req.params.code, type: 'npc' })
                    req.session.user.score += 15
                    message = `Your phone buzzes and you see a new text message. You don't recognize the number, but read it anyway.\n${people[req.params.code].name}: "${people[req.params.code].conversation[0].phrase}"`
                    logger.debug(`${req.session.user.handle} made new NPC contact with ${people[req.params.code].name}`)
                }
                req.session.user.convo = [req.params.code, 0]
                await userModel.save(req.session.user)

            } else {
                const handle = await userModel.handleByCode(req.params.code)
                if (handle) {
                    const contact = await userModel.get(req.params.code, handle)
                    message = `Your phone buzzes and you glance at it to see that ${handle} has sent you a message. They're over at the ${locations[contact.location].name}. You add them to your contact list.`
                    req.session.user.contacts.push({ id: req.params.code, type: 'player' })
                    req.session.user.score += 15
                    await userModel.save(req.session.user)
                    logger.debug(`${req.session.user.handle} just connected with ${handle}`)
                }
            }

            if (!message) {
                message = 'You look at the code you found, but can\'t make sense of it. Oh well.'
            }

            res.render('game', {
                page: 'game',
                title: process.env.APP_NAME || 'Game',
                appName: process.env.APP_NAME || '',
                user: req.session.user,
                message: message,
                convo: !!req.session.user.convo
            })
        }
    } else {
        const handle = await userModel.handleByCode(req.params.code)
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
