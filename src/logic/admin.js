
const uuid = require('uuid')
const userModel = require('../models/user')

module.exports = async function adminActions(tokens) {
    if (tokens[0] === 'get' && tokens[1] === 'user' && tokens[2]) {
        const user = await getUser(tokens[2])
        if (user) {
            return JSON.stringify(user, null, 2).replaceAll(/  /g, '..')
        } else {
            return 'User not found'
        }
    }

    if (tokens[0] === 'reset' && tokens[1] === 'pin' && tokens[2] && tokens[3]) {
        const pin = tokens[3].replace(/[^0-9]/g, '')
        const user = await getUser(tokens[2])
        if (user && pin) {
            user.pin = userModel.hashPin(pin)
            await userModel.save(user)
            return `PIN for user: ${user.handle} has been changed`
        } else if (!user) {
            return 'User not found'
        } else if (!pin) {
            return 'Please provide a new PIN (all digits) as the last parameter'
        }
    }

    if (tokens[0] === 'delete' && tokens[1] === 'user' && tokens[2]) {
        if (tokens[3] !== 'confirm') {
            return `Are you sure you want to delete user ${tokens[2]}? If so, issue this command again with "CONFIRM" at the end:\nadmin delete user ${tokens[2]} CONFIRM`
        }
        const user = await getUser(tokens[2])
        if (user && user.isAdmin) {
            return 'Sorry, you can\'t delete another admin.'
        } else if (user) {
            const resp = await userModel.del(user.code, user.handle)
            if (resp) {
                return `User ${user.handle} deleted!`
            } else {
                return `There was a problem deleting user ${user.handle}. You should problem check the system logs.`
            }
        } else {
            return 'User not found'
        }
    }

    return null
}

async function getUser(token) {
    let user = null
    if (uuid.validate(token)) {
        user = await userModel.get(token)
    } else {
        user = await userModel.get(null, token)
    }
    return (user && user.handle) ? user : null
}