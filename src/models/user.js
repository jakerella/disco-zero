
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const redis = require('redis')
const crypto = require('crypto')
const AppError = require('../util/AppError')

let _client = null

function cleanHandle(handle) {
    return handle.trim().replaceAll(/[^a-z0-9\-\.\'\s]/ig, '').replaceAll(/\s/g, '-').substring(0, 30)
}

function hashPin(pin) {
    // Yes... md5... terrible, ain't it? Wonder what someone could do with this...
    return crypto.createHash('md5').update(`${pin}-${process.env.SALT}`).digest('hex')
}

async function login(handle, pin) {
    handle = cleanHandle(handle)
    if (!handle || !pin) { return null }

    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to perform user login.', 500) }

    const user = JSON.parse((await cache.get(`${process.env.APP_NAME}_user_${handle}`)) || '{}')
    if (user.pin === hashPin(pin)) {
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
    code  = code.replaceAll(/[^a-f0-9\-]/g, '')
    if (!code) { throw new AppError('No code provided to check.', 400) }
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
    if (!handle || !code) { throw new AppError('No handle or code provided to retrieve user.', 400) }
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to get data.', 500) }

    const user = JSON.parse((await cache.get(`${process.env.APP_NAME}_user_${handle}`)) || '{}')
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
    
    const cache = await getCacheClient()
    if (!cache) { throw new AppError('No redis client available to set data.', 500) }

    await cache.set(`${process.env.APP_NAME}_user_${data.handle}`, JSON.stringify(data))
    await cache.set(`${process.env.APP_NAME}_code_${data.code}`, data.handle)

    return true
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
            tls: { rejectUnauthorized: false }
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
    login, get, save, cleanHandle, handleExists, handleByCode, hashPin
}
