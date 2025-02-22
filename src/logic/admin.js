
const uuid = require('uuid')
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')
const { uuidValid } = require('../util/helpers')

const progressTracker = {
    items: {
        '01945c61-c10c-7788-b7e7-da82b5270751': 'Found DisCo Soundtrack',
        '019484b6-9be4-705e-bc49-a67260a268f4': 'Performed Log Analysis & got leetBeats number',
        '01948551-c92b-7324-b951-14b6d5d1fced': 'Found jakerella\'s coin (all locations)',
        '0185e0d6-c1eb-737e-8546-4eeb34ae2e93': 'Helped Halvar',
        '01815efb-16d4-7e6a-871b-1f03d7dd007c': 'Found DisCo game server code',
        '018b86aa-07e1-7b73-8416-0825a12d2fd3': 'Decrypted JTW file',
        '0192f6eb-5ffa-7cf5-9a2e-a40f8b5d5c1f': 'Helped Thor',
        '018e82ce-932c-74ad-b09c-433b7ea1749b': 'Solved Labyrinth puzzle',
        '017a5a26-2a5e-7384-b3de-4d7774fb4838': 'Traded DS for Flipper Zero',
        '018bc36f-26be-74be-b6bd-ebb17c13426c': 'Got manager venue map',
        '01865413-a29c-70ac-a946-16c7dba4b1fc': 'Solved reverse engineering challenge',
        '01711f07-f5ed-760c-a8db-205c49827a94': 'Helped Policy Room moderator'
    },
    people: {
        '01947a4a-8bc7-75df-8e1f-3f86dc276e19': 'Found exif data in logo',
        '01001010-6666-7777-8888-1337c0d38055': 'Found jakerella',
        '017e87fc-23ae-7fb1-8ecc-43f851b6dd01': 'Found Gen Nakasone'
    }
}


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

    if (tokens.join(' ') === 'progress') {

        const itemsFound = await userModel.getStats('item')
        const npcFound = await userModel.getStats('npc')

        const resp = []
        itemsFound.byId.forEach((stat) => {
            if (progressTracker.items[stat.id]) {
                resp.push(`${stat.value} player(s) ${progressTracker.items[stat.id]}`)
            }
        })
        npcFound.byId.forEach((stat) => {
            if (progressTracker.people[stat.id]) {
                resp.push(`${stat.value} player(s) ${progressTracker.people[stat.id]}`)
            }
        })

        return resp
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

        resp.push('\nScanable-only NPCs:')
        const unreachablePeople = []
        for (let id in people) {
            total += people[id].points
            if (people[id].scanable) {
                let scanOnly = true
                for (let lid in locations) {
                    if (locations[lid].people.includes(id)) {
                        scanOnly = false
                        break
                    }
                }
                if (scanOnly) {
                    resp.push(`  ${buildNPC(id)}`)
                }
            } else {
                let found = false
                for (let lid in locations) {
                    if (locations[lid].people.includes(id)) {
                        found = true
                        break
                    }
                }
                if (!found) {
                    unreachablePeople.push(id)
                }
            }
        }

        resp.push('\nScanable-only Items:')
        const unreachableItems = []
        for (let id in items) {
            total += items[id].points
            if (items[id].scanable) {
                let scanOnly = true
                for (let lid in locations) {
                    if (locations[lid].items.includes(id)) {
                        scanOnly = false
                        break
                    }
                }
                if (scanOnly) {
                    resp.push(`  ${items[id].name}* (${items[id].points})`)
                }
            } else {
                let found = false
                for (let lid in locations) {
                    if (locations[lid].items.includes(id)) {
                        found = true
                        break
                    }
                }
                for (let pid in people) {
                    for (let step in people[pid].conversation) {
                        if (people[pid].conversation[step].item === id) {
                            found = true
                            break
                        }
                    }
                    if (found) { break }
                }
                if (!found) {
                    unreachableItems.push(id)
                }
            }
        }

        if (unreachablePeople.length) {
            resp.push(`\nUnreachable People (${unreachablePeople.length}):`)
            unreachablePeople.forEach((id) => {
                resp.push(`  ${people[id].name}`)
            })
        }
        if (unreachableItems.length) {
            resp.push(`\nUnreachable Items (${unreachableItems.length}):`)
            unreachableItems.forEach((id) => {
                resp.push(`  ${items[id].name}`)
            })
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
        items: loc.items.map((i) => `${items[i].name}${items[i].scanable ? '*' : ''} (${items[i].points})`),
        people: loc.people.map((pid) => {
            return buildNPC(pid)
        })
    }
}

function buildNPC(pid) {
    const itemList = []
    people[pid].conversation.forEach(step => {
        if (step.item) {
            itemList.push(`${items[step.item].name} (${items[step.item].points})`)
        }
    })
    let itemText = ''
    if (itemList.length) {
        itemText = ` (gives items: ${itemList.join(', ')})`
    }

    return `${people[pid].name}${people[pid].scanable ? '*' : ''} (${people[pid].points})${itemText}`
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