const logger = require('../util/logger')(process.env.LOG_LEVEL)
const fs = require('fs')

async function get(handle, code) {
    logger.debug('Getting user data...')
    const user = JSON.parse(fs.readFileSync('test_user.json').toString())
    return user
}

async function save(user) {
    logger.debug('Saving user data...')
    fs.writeFileSync('test_user.json', JSON.stringify(user, null, 4), { flag: 'w+' })
    return user
}

module.exports = {
    get,
    save
}
