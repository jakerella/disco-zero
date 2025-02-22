
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const redis = require('redis')
const crypto = require('crypto')
const uuid = require('uuid')
const AppError = require('../util/AppError')
const { uuidValid } = require('../util/helpers')

let _client = null

function cleanHandle(handle) {
    return handle.trim().replaceAll(/[^a-z0-9\-\.\'\s]/ig, '').replaceAll(/\s/g, '-').substring(0, 30)
}

function hashPass(pass) {
    return crypto.createHash('sha256').update(`${pass}-${process.env.SALT}`).digest('hex')
}

async function login(handle, pass) {
    handle = cleanHandle(handle)
    if (!handle || !pass) { return null }

    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to perform user login.', 500) }

    const user = JSON.parse((await cache.get(`${process.env.APP_NAME}_user_${handle}`)) || '{}')
    if (user.pass === hashPass(pass)) {
        return user
    }
    return null
}

async function handleExists(handle) {
    handle = cleanHandle(handle)
    if (!handle) { throw new AppError('No handle provided to check.', 400) }
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }

    const count = Number(await cache.exists(`${process.env.APP_NAME}_user_${handle}`))
    return count > 0
}

async function handleByCode(code) {
    code = code.replaceAll(/[^a-f0-9\-]/g, '')
    if (!uuidValid(code)) { throw new AppError('No code provided to check.', 400) }
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }
    return await cache.get(`${process.env.APP_NAME}_code_${code}`)
}

async function get(code, handle=null) {
    if (handle) {
        handle = cleanHandle(handle)
    } else {
        handle = await handleByCode(code)
    }
    if (!handle && !uuidValid(code)) { throw new AppError('No handle or code provided to retrieve user.', 400) }
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }

    const user = JSON.parse((await cache.get(`${process.env.APP_NAME}_user_${handle}`)) || '{}')
    if (code && code !== user.code) {
        throw new AppError('Sorry, but that user handle does not match that code.', 400)
    }
    return user
}

async function incrementStat(stat, id, count) {
    if (!['loc', 'item', 'npc', 'player'].includes(stat)) {
        return false
    }
    
    const cache = await getCacheClient()
    if (!cache) { return false /* We'll let this error go since it's just for the stats */ }

    if (stat !== 'player') {
        await cache.incr(`${process.env.APP_NAME}_statbyid_${stat}_${id}`)
    }
    await cache.incr(`${process.env.APP_NAME}_statbycount_${stat}_${count}`)
    return true
}

async function getStats(stat) {
    if (!['loc', 'item', 'npc', 'player'].includes(stat)) {
        return {}
    }
    
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to set user.', 500) }

    try {
        let byIdKeys = null
        let byIdValues = null
        if (stat !== 'player') {
            byIdKeys = await cache.keys(`${process.env.APP_NAME}_statbyid_${stat}_*`)
            byIdValues = []
            if (byIdKeys && byIdKeys.length) {
                byIdValues = await cache.mGet(byIdKeys)
            }
        }

        const byCountKeys = await cache.keys(`${process.env.APP_NAME}_statbycount_${stat}_*`)
        let byCountValues = []
        if (byCountKeys && byCountKeys.length) {
            byCountValues = await cache.mGet(byCountKeys)
        }

        return {
            type: stat,
            byId: (byIdKeys) ? byIdKeys.map((k, i) => { return { id: k.split('_')[3], value: Number(byIdValues[i]) } }) : null,
            byCount: byCountKeys.map((k, i) => { return { id: k.split('_')[3], value: Number(byCountValues[i]) } })
        }
    } catch(err) {
        logger.warn(`Unable to get all ${stat} stats: ${err.message || err}`)
        return { tyupe: stat, byId: [], byCount: [] }
    }
}

async function save(user) {
    if (!user.handle) {
        throw new AppError('No user handle provided to save user.', 500)
    }
    if (!uuidValid(user.code)) {
        throw new AppError('Bad user code provided to save user.', 500)
    }
    
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to set user.', 500) }

    await cache.set(`${process.env.APP_NAME}_user_${user.handle}`, JSON.stringify(user))
    await cache.zAdd('leaderboard', { score: user.score, value: user.handle })

    return true
}

async function create(handle, code, pass) {
    handle = cleanHandle(handle)

    if (!handle) {
        throw new AppError('No user handle provided to create user.', 400)
    }
    if (!pass) {
        throw new AppError('No password provided to create user.', 400)
    }
    if (!uuidValid(code)) {
        throw new AppError('Bad user code provided to create user.', 400)
    }

    const startLoc = '0193feed-2940-71ba-9fc5-64122b4b79ff'
    const user = {
        handle,
        code,
        pass: hashPass(pass),
        score: 10,
        location: startLoc,
        items: [],
        visited: [startLoc],
        contacts: [],
        convo: null
    }
    
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to set user.', 500) }

    user.createdAt = Date.now()
    await cache.set(`${process.env.APP_NAME}_user_${user.handle}`, JSON.stringify(user))
    await cache.set(`${process.env.APP_NAME}_code_${user.code}`, user.handle)
    incrementStat('loc', startLoc, 1)
    await cache.zAdd('leaderboard', { score: user.score, value: user.handle })

    return user
}

async function addUserCode() {
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to set user.', 500) }
    
    const code = uuid.v7()
    await cache.set(`${process.env.APP_NAME}_code_${code}`, '')
    return code
}

async function del(code, handle) {
    handle = cleanHandle(handle)
    if (!handle || !uuidValid(code)) { throw new AppError('No handle or code provided to delete user.', 400) }
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to delete data.', 500) }

    const user = JSON.parse((await cache.get(`${process.env.APP_NAME}_user_${handle}`)) || 'null')
    if (user) {
        await cache.decr(`${process.env.APP_NAME}_statbycount_loc_${user.visited.length}`)
        if (user.items.length) {
            await cache.decr(`${process.env.APP_NAME}_statbycount_item_${user.items.length}`)
        }
        const npcCount = user.contacts.filter((c) => c.type === 'npc').length
        if (npcCount) {
            await cache.decr(`${process.env.APP_NAME}_statbycount_npc_${npcCount}`)
        }

        user.visited.forEach(async (id) => { await cache.decr(`${process.env.APP_NAME}_statbyid_loc_${id}`) })
        user.items.forEach(async (id) => { await cache.decr(`${process.env.APP_NAME}_statbyid_item_${id}`) })
        user.contacts
            .filter((c) => c.type === 'npc')
            .forEach(async (c) => { await cache.decr(`${process.env.APP_NAME}_statbyid_npc_${c.id}`) })
        
    } else {
        logger.warn(`Unable to get user data for ${handle}, but will attempt to delete anyway...`)
    }

    const leaderRemove = await cache.zRem('leaderboard', user.handle)
    const codeReset = await cache.set(`${process.env.APP_NAME}_code_${code}`, '')
    const delCount = await cache.del(`${process.env.APP_NAME}_user_${handle}`)

    if (codeReset === 'OK' && Number(delCount) === 1 && Number(leaderRemove) === 1) {
        logger.info(`Deleted user with handle: ${handle}`)
        return true
    } else {
        logger.warn(`Problem deleting user with handle '${handle}' and code '${code}', there may be data inconsistency!`)
        return false
    }
}

async function userCount() {
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to delete data.', 500) }

    return ((await cache.keys('disco_user_*')) || []).length
}

async function leaderboard(count = 10) {
    count = Number(count) || 10
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to delete data.', 500) }

    const lowest = (await cache.zRangeWithScores('leaderboard', 0, 2))[0]

    return [...await cache.zRangeWithScores('leaderboard', 0, count-2, { REV: true }), lowest]
}

async function getCacheClient() {
    if (_client) { return Promise.resolve(_client) }
    
    if (!process.env.REDIS_URL) {
        logger.error('WARNING: No Redis URL env var provided, unable to access data.')
        return Promise.reject(new AppError('Unable to connect to database.', 500))
    }

    return new Promise((resolve, reject) => {
        _client = redis.createClient({
            url: process.env.REDIS_URL,
            socket: {
                tls: (process.env.REDIS_URL.match(/rediss:/) != null),
                rejectUnauthorized: false,
            }
        })
            .on('error', (err) => {
                logger.error(`ERROR from Redis: ${err.message || err}`)
            })
            .on('ready', () => {
                logger.info('New redis client connection established.')
                resolve(_client)
            })
            .on('end', (err) => {
                if (err) {
                    logger.warn(`Client connection to redis server closed with error: ${err.message || err}`)
                } else {
                    logger.warn('Client connection to redis server closed cleanly.')
                }
                _client = null
            })
            .connect()
    })
}

module.exports = {
    login, get, create, save, incrementStat, getStats, addUserCode, del, cleanHandle, handleExists, handleByCode, hashPass, userCount, leaderboard
}
