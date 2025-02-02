
const uuid = require('uuid')
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')
const { uuidValid } = require('../util/helpers')


module.exports = async function adminActions(tokens) {
    if (tokens[0] === 'help') {
        return [
            'Hello admin! You can use the following commands:',
            '  get user [username] - Return the full data object of the given user',
            '  add user code - Add a new user code for an attendee to register with (the code will be displayed)',
            '  reset password [username] [password] - Reset a user\'s password to the given value',
            '  delete user [username] - Completely delete a user\'s records - CAREFUL, this is permanent',
            '  promote [username] - Promote the given user to be an admin'
        ].join('\n')
    }

    if (tokens[0] === 'get' && tokens[1] === 'user' && tokens[2]) {
        const user = await getUser(tokens[2])
        if (user) {
            return JSON.stringify(user, null, 2).replaceAll(/  /g, '  ')
        } else {
            return 'User not found'
        }
    }

    if (tokens[0] === 'promote' && tokens[1]) {
        const user = await getUser(tokens[1])
        if (user) {
            user.isAdmin = true
            await userModel.save(user)
            return `${user.handle} is now an admin`
        } else {
            return 'User not found'
        }
    }

    if (tokens[0] === 'reset' && tokens[1] === 'password' && tokens[2] && tokens[3]) {
        const pass = tokens.splice(3).join(' ')
        const user = await getUser(tokens[2])
        if (user && pass) {
            user.pass = userModel.hashPass(pass)
            await userModel.save(user)
            return `Password for user: ${user.handle} has been changed`
        } else if (!user) {
            return 'User not found'
        } else if (!pass) {
            return 'Please provide a new password as the last parameter'
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

    if (tokens.join(' ') === 'add user code') {
        const code = await userModel.addUserCode()
        return `Added new user code: ${code}`
    }

    if (tokens.join(' ') === 'map') {
        const locTree = {}
        let total = 0

        for (let id in locations) {
            const loc = buildLocation(locations[id])
            total += locations[id].points

            if (loc.parent) {
                addRoomToLocation(locTree, loc)
            } else {
                locTree[id] = loc
            }
        }

        const resp = []
        for (let id in locTree) {
            resp.push(...getLocationMapText(locTree[id], 0))
        }

        resp.push('\nScanable NPCs:')
        for (let id in people) {
            total += people[id].points
            if (people[id].scanable) {
                const itemList = []
                people[id].conversation.forEach(step => {
                    if (step.item) {
                        itemList.push(`${items[step.item].name} (${items[step.item].points})`)
                    }
                })
                let itemText = ''
                if (itemList.length) {
                    itemText = ` (gives items: ${itemList.join(', ')})`
                }

                resp.push(`  ${people[id].name} (${people[id].points})${itemText}`)
            }
        }

        resp.push('\nScanable Items:')
        for (let id in items) {
            total += items[id].points
            if (items[id].scanable) {
                resp.push(`  ${items[id].name} (${items[id].points})`)
            }
        }

        total += await userModel.userCount() - 1

        return [`Current maximum possible points: ${total}`, ...resp]
    }

    return null
}

function buildLocation(loc) {
    return {
        id: loc.id,
        parent: loc.parent,
        name: loc.name,
        type: loc.type,
        points: loc.points,
        rooms: {},
        items: loc.items.map((i) => `${items[i].name} (${items[i].points})`),
        people: loc.people.map((p) => {
            const itemList = []
            people[p].conversation.forEach(step => {
                if (step.item) {
                    itemList.push(`${items[step.item].name} (${items[step.item].points})`)
                }
            })
            let itemText = ''
            if (itemList.length) {
                itemText = ` (gives items: ${itemList.join(', ')})`
            }

            return `${people[p].name} (${people[p].points})${itemText}`
        })
    }
}

function addRoomToLocation(group, loc) {
    if (group[loc.parent]) {
        group[loc.parent].rooms[loc.id] = loc
    } else {
        Object.keys(group).forEach((id) => {
            addRoomToLocation(group[id].rooms, loc)
        })
    }
}

function getLocationMapText(loc, level) {
    const pad = Array(level * 2).fill(' ').join('')
    const lines = []
    let itemText = ''
    let peopleText = ''
    if (loc.items.length) {
        itemText = `:${(loc.items.length === 1) ? ' ' : `\n${pad}    `}${loc.items.join(`\n${pad}    `)}`
    }
    if (loc.people.length) {
        peopleText = `:\n${pad}    ${loc.people.join(`\n${pad}    `)}`
    }

    lines.push(`${pad}${(level > 0) ? 'Room' : 'Location'}: ${loc.name} (${loc.points}${(loc.type === 'hidden') ? ', hidden' : ''})`)
    if (itemText) {
        lines.push(`${pad}  has ${loc.items.length} item${(loc.items.length === 1) ? '' : 's'}${itemText}`)
    }
    if (peopleText) {
        lines.push(`${pad}  ${(itemText) ? 'and' : 'has'} ${loc.people.length} ${(loc.people.length === 1) ? 'person' : 'people'}${peopleText}`)
    }
    Object.keys(loc.rooms).forEach((id) => {
        lines.push(...getLocationMapText(loc.rooms[id], level + 1))
    })
    return lines
}

async function getUser(token) {
    let user = null
    if (uuidValid(token)) {
        user = await userModel.get(token)
    } else {
        user = await userModel.get(null, token)
    }
    return (user && user.handle) ? user : null
}