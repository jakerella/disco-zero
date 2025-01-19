const express = require('express')
const router = express.Router()
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')

router.get('/', async (req, res, next) => {
    if (!req.session.user?.isAdmin) {
        return next(new AppError('Sorry, but you can\'t see that page.', 403))
    }

    const userCount = await userModel.userCount()
    const leaderboard = await userModel.leaderboard(10)
    const locData = await userModel.getStats('loc')
    const itemData = await userModel.getStats('item')
    const npcData = await userModel.getStats('npc')

    const locationStats = {
        total: Object.keys(locations).length,
        discovered: locData.byId.length,
        counts: locData.byCount.sort((a, b) => { return Number(a.id) - Number(b.id) })
    }
    const itemStats = {
        total: Object.keys(items).length,
        discovered: itemData.byId.length,
        counts: itemData.byCount.sort((a, b) => { return Number(a.id) - Number(b.id) })
    }
    const npcStats = {
        total: Object.keys(people).length,
        discovered: npcData.byId.length,
        counts: npcData.byCount.sort((a, b) => { return Number(a.id) - Number(b.id) })
    }

    return res.render('dashboard', {
        page: 'dashboard',
        title: `${process.env.APP_NAME} Dashboard`,
        userCount,
        leaderboard,
        locationStats,
        itemStats,
        npcStats
    })
})

module.exports = router
