
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const redis = require('redis')
const AppError = require('../util/AppError')

let _client = null

function cleanHandle(handle) {
    return handle.trim().replaceAll(/[^a-z0-9\-\.\'\s]/ig, '').replaceAll(/\s/g, '-').substring(0, 30)
}

async function handleExists(handle) {
    handle = cleanHandle(handle)
    if (!handle) { throw new AppError('No handle provided to check.', 400) }
    const cache = await cacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }

    const count = Number(await cache.exists(`disco_user_${handle}`))
    logger.debug(`${count} keys exist matching ${handle}`)
    return count > 0
}

async function get(handle, code) {
    handle = cleanHandle(handle)
    if (!handle || !code) { throw new AppError('No handle or code provided to retrieve user.', 400) }
    const cache = await cacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }

    const user = JSON.parse((await cache.get(`disco_user_${handle}`)) || '{}')
    if (user.code !== code) { throw new AppError('Sorry, but that user handle does not match that code.', 401) }
    return user
}

async function save(data) {
    if (!data.handle) {
        throw new AppError('No user handle provided to save data.', 500)
    }
    if (!data.code) {
        throw new AppError('No user code provided to save data.', 500)
    }
    
    const cache = await cacheClient()
    if (!cache) { throw new AppError('No redis client available to set data.', 500) }

    await cache.set(`disco_user_${data.handle}`, JSON.stringify(data))
    await cache.set(`disco_code_${data.code}`, data.handle)

    return true
}

async function cacheClient() {
    if (_client) { return Promise.resolve(_client) }
    
    if (!process.env.REDIS_URL) {
        logger.error('WARNING: No Redis URL env var provided, unable to access data.')
        return Promise.reject(new AppError('Unable to connect to database.', 500))
    }

    return new Promise((resolve, reject) => {
        _client = redis.createClient({ url: process.env.REDIS_URL })
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
    get, save, cleanHandle, handleExists
}
