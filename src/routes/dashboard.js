const express = require('express')
const router = express.Router()
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')

let STATS_CACHE_TTL = 4500
let STATS_CACHE = [0, null]

router.get('/', async (req, res, next) => {
    try {
        const stats = await getStats()

        return res.render('dashboard', {
            page: 'dashboard',
            title: `${process.env.APP_NAME} Dashboard`,
            userCount: stats.userCount,
            leaderboard: stats.leaderboard,
            locationStats: stats.locationStats,
            itemStats: stats.itemStats,
            npcStats: stats.npcStats
        })
    } catch(err) {
        next(err)
    }
})

router.get('/stats', async (req, res, next) => {
    try {
        const stats = await getStats()
        res.json(stats)
    } catch(err) {
        next(err)
    }
})


async function getStats() {
    if (STATS_CACHE[1] && (Date.now() - STATS_CACHE[0]) < STATS_CACHE_TTL) {
        logger.debug(`Returning cached stats within TTL (${STATS_CACHE_TTL})`)
        return STATS_CACHE[1]
    }

    const userCount = await userModel.userCount()
    const leaderboard = await userModel.leaderboard(20)
    const locData = await userModel.getStats('loc')
    const itemData = await userModel.getStats('item')
    const npcData = await userModel.getStats('npc')
    const playerData = await userModel.getStats('player')

    const locationStats = {
        total: Object.keys(locations).length,
        discovered: locData.byId.length,
        counts: locData.byCount.sort((a, b) => { return Number(b.id) - Number(a.id) })
    }
    const itemStats = {
        total: Object.keys(items).length,
        discovered: itemData.byId.length,
        counts: itemData.byCount.sort((a, b) => { return Number(b.id) - Number(a.id) })
    }
    const npcStats = {
        total: Object.keys(people).length,
        discovered: npcData.byId.length,
        counts: npcData.byCount.sort((a, b) => { return Number(b.id) - Number(a.id) })
    }
    const playerStats = {
        counts: playerData.byCount.sort((a, b) => { return Number(b.id) - Number(a.id) })
    }

    const stats = {
        userCount,
        leaderboard,
        locationStats,
        itemStats,
        npcStats,
        playerStats
    }
    STATS_CACHE = [Date.now(), stats]
    return stats
}

module.exports = router
