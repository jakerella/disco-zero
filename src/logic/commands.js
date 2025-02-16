
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const AppError = require('../util/AppError')
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')
const adminActions = require('./admin')


// TODO: Also store users by location ID so people can see who's around them?


function help() {
    return [
        'You consult the info packet you happen to have in your pocket.',
        'You appear to be in a text-based adventure game where you can score points for visiting locations, meeting people, and completing challenges!',
        'You also note in the packet that the person with the highest score at the end of the conference will earn a **FREE PASS** to next year\'s event.',
        '\n\nIn the game you can *look around* to check out where you are, *go to* different locations, and *talk to* people you find.',
        'Along the way you\'ll be able to *take* items you find, *look at* them for clues, or even *use* some of them.',
        'Other basic things are asking "Who am i?" or checking your *inventory*, *visited* locations, or *contacts*.',
        '\n\nWhen talking to someone in the game, make sure to pay attention to what they ask you and answer directly.',
        'Your answers should be **specific and short**.',
        'Note that when talking to someone, you can\'t use normal commands until you leave the conversation (usually by saying "goodbye").',
        '\n\nYou can *logout* any time to clear your session, or use the *reset password* command to, you know, reset your password.',
        'If necessary, a game admin can fully delete all of your data (ask a conference organizer).'
    ].join(' ')
}
help.alt = ['hint', 'hints', 'give me a hint', 'what is this', 'what should i do', 'what do i do', 'how do i play']

async function resetpassword(user, ...tokens) {
    let password = null
    if (tokens.length) {
        const [action, tempPass, _] = tokens[0].split('|')
        if (action === 'password' && tempPass) {
            password = tempPass
        }
    }

    if (password) {
        if (['nevermind', 'quit', 'cancel', 'exit'].includes(password)) {
            return `No problem, nothing was changed.`
        } else {
            user.pass = userModel.hashPass(password)
            return `Got it, your password has been changed! (You can *logout* if you want to.)`
        }
    } else {
        return `PASSWORD|resetpassword|null|What would you like your new password to be?`
    }


}
resetpassword.alt = ['reset password', 'reset pass', 'change password', 'change pass', 'change my password', 'reset my password', 'password reset', 'password change']

function exit(user) {
    if (locations[user.location].parent) {
        const loc = locations[locations[user.location].parent]
        user.location = loc.id
        if (!user.visited.includes(loc.id)) {
            user.visited.push(loc.id)
            user.score += loc.points || 1
        }
        return `You go back to the ${loc.name}.`
    }

    return 'You could leave, but where would you go? Maybe you should decide that first.'
}
exit.alt = ['get out', 'leave', 'walk out', 'walk back', 'go back']

function whoami(user) {
    if (user.handle) {
        return `${user.handle} (${user.score || 0})`
    } else {
        return 'You seem to have lost your memory.'
    }
}
whoami.alt = ['who am i', 'score', 'my score', 'my points', 'what is my name', 'what am i called', 'what is my handle', 'what is my score', 'how many points do i have', 'what are my points']

async function leaderboard(user) {
    const scores = await userModel.leaderboard(10)
    const resp = ['The top 10 players are:']
    let found = false
    scores.forEach((entry) => {
        let marker = ''
        if (entry.value === user.handle) {
            found = true
            marker = '* '
        }
        resp.push(`${marker}${entry.value} (${entry.score})`)
    })
    if (!found) {
        resp.push('...')
        resp.push(`* ${user.handle} (${user.score})`)
    }

    return resp
    // return `The top 10 players are:\n${resp.join('\n')}`
}
leaderboard.alt = ['scores', 'points', 'where am i on the leaderboard', 'who has the most points', 'what are the scores', 'what are the points', 'who has the highest score']

function whereami(user) {
    if (user.location && locations[user.location]) {
        return `You are at the ${locations[user.location].name}`
    } else {
        return 'You are lost.'
    }
}
whereami.alt = ['where am i', 'current location', 'what is my location']

function inventory(user) {
    const userItems = user.items
        .filter((id) => items[id])
        .map((id) => `  ${items[id].name} (${items[id].points} pts)`)

    if (userItems.length) {
        return `You have ${userItems.length} item${userItems.length === 1 ? '' : 's'} (of ${Object.keys(items).length} possible):\n${userItems.join('\n')}`
    } else {
        return 'You only have the clothes on your back. Maybe you should get your badge from the *volunteer* at the registration desk in the *Yours Truly Hotel*?'
    }
}
inventory.alt = ['what is in my inventory', 'what is in my bag', 'look in my bag', 'check my inventory', 'check inventory', 'look in bag', 'check bag', 'what do i have', 'what am i carrying', 'what have i got', 'what do i got?']

function inspect(user, ...tokens) {
    const target = tokens.join(' ').trim().toLowerCase().replace(/^(the|my|this|my) /, '')
    if (!target || ['venue', 'building', 'location', 'place', 'surroundings', 'here', 'me', 'setting'].includes(target)) {
        return locations[user.location].description
    } else {
        const item = user.items.filter((id) => {
            return items[id]?.name.toLowerCase() === target || items[id]?.alternates.includes(target)
        }).map((id) => items[id])[0]
        if (item) {
            return item.description
        } else {
            return `You look around you, but can\'t find a ${target}`
        }
    }
}
inspect.alt = ['look around', 'look at', 'what can i see', 'what is around me', 'what is here']

async function contacts(user) {
    const players = []
    const npcs = []
    for (let i=0; i<user.contacts.length; ++i) {
        if (user.contacts[i].type === 'player') {
            try {
                const person = await userModel.get(user.contacts[i].id)
                if (person) {
                    players.push({n:person.handle, t:'p', m:`  ${person.handle} (1 pt, currently ${(locations[person.location]) ? `at ${locations[person.location].name}` : 'lost'})`})
                }
            } catch (err) {
                logger.debug(`Error while trying to get people for contact list: ${err.message || err}`)
                /* we'll let these go for the contact list */
            }
        } else if (people[user.contacts[i].id]) {
            let loc = ''
            if (!people[user.contacts[i].id].scanable) {
                for (let id in locations) {
                    if (locations[id].people.includes(user.contacts[i].id)) {
                        loc = `, at ${locations[id].name}`
                        break
                    }
                }
            }
            npcs.push({n:people[user.contacts[i].id].name, t:'n', m:`  ${people[user.contacts[i].id].name} (${people[user.contacts[i].id].points} pts${loc})`})
        }
    }
    if (contacts.length) {
        function sortContacts(a, b) { return (a.n.toLowerCase() < b.n.toLowerCase()) ? -1 : 1 }
        return`You have found ${npcs.length} NPC${(npcs.length === 1) ? '':'s'} (out of ${Object.keys(people).length}) ` +
            `and connected with ${players.length} player${(players.length === 1) ? '':'s'}.` +
            `\nNPCs:\n${npcs.sort(sortContacts).map(c => c.m).join('\n')}` +
            `\nOther Players:\n${players.sort(sortContacts).map(c => c.m).join('\n')}`
    } else {
        return 'Your contact list is empty... you should *look around* and try to *talk to* people!'
    }
}
contacts.alt = ['contact list', 'view my contacts', 'view contacts', 'who do i know', 'who have i met']

function visited(user) {
    if (!user.visited.length) {
        return 'You don\'t seem to exist in spacetime. Maybe head back to the *Yours Truly Hotel*?'
    } else {
        const locTree = {}
        user.visited.forEach((id) => {
            const loc = {
                id,
                parent: locations[id].parent,
                name: locations[id].name,
                points: locations[id].points,
                rooms: {}
            }
            if (loc.parent) {
                addRoomToLocation(locTree, loc)
            } else {
                locTree[id] = loc
            }
        })
        const resp = []
        for (let id in locTree) {
            resp.push(...getLocationMapText(locTree[id], 0))
        }
        if (resp.length === 1) {
            return 'You haven\'t really gone anywhere yet, maybe ask someone for a map or just *look around*?'
        } else {
            return `You have been to ${user.visited.length} locations (of ${Object.keys(locations).length} possible):\n${resp.join('\n')}`
        }
    }
}
visited.alt = ['locations', 'location history', 'venue history', 'where have i been', 'what locations have i seen', 'known locations']
function addRoomToLocation(group, loc) {
    if (group[loc.parent]) {
        group[loc.parent].rooms[loc.id] = loc
    } else {
        Object.keys(group).forEach((id) => { addRoomToLocation(group[id].rooms, loc) })
    }
}
function getLocationMapText(loc, level) {
    const pad = Array(level * 2).fill(' ').join('')
    const lines = []
    lines.push(`${pad}${loc.name} (${loc.points} pts)`)
    Object.keys(loc.rooms).forEach((id) => {
        lines.push(...getLocationMapText(loc.rooms[id], level + 1))
    })
    return lines
}

async function goto(user, ...tokens) {
    let password = null
    let dest = tokens.join(' ').trim().toLowerCase().replace(/^the /, '')
    
    const passHandler = dest.split('|')
    if (passHandler.length === 3 && passHandler[0] === 'password') {
        dest = passHandler[2]
        password = passHandler[1]
    }

    const loc = Object.keys(locations)
        .filter((id) => {
            const triggers = [locations[id].name.toLowerCase(), ...(locations[id].alt || [])]
            return triggers.includes(dest)
        })
        .map((id) => { return locations[id] })[0]
    
    if (!dest) {
        return 'Where do you want to go?'
    } else if (!loc) {
        return 'Is that even a real place? You decide to stay put.'
    } else if (user.location === loc.id) {
        return 'You\'re already here!'
    }

    const curr = locations[user.location]

    if (loc.hidden) {
        if (!user.visited.includes(loc.id)) {
            return 'You\'re pretty sure that\'s a real place, but maybe you need to get *physically* closer.'
        }
    }

    if (loc.type === 'main' && curr.parent && loc.id !== curr.parent) {
        return `Looks like you\'re in the ${curr.name}. You probably need to find your way out first.`
    } else if (loc.type !== 'main' && curr.type === 'main' && loc.parent !== curr.id) {
        return `There's no ${loc.name} here.`
    } else if (loc.type !== 'main' && curr.type !== 'main' && !(loc.parent === curr.parent || loc.parent === curr.id || loc.id === curr.parent)) {
        return 'You can\'t get there from here, you might need to *go back* first.'
    }

    let met = true
    const conditions = loc.conditions || []
    for (let i=0; i<conditions.length; ++i) {
        if (conditions[i].check === 'password') {
            if (password && password !== conditions[i].value) {
                return 'Nope, that\'s not it.'
            } else if (!password) {
                return `PASSWORD|goto|${dest}|Someone steps out and bocks your way. "Sorry, but I'm going to need the password."`
            }
        } else if (!checkCondition(user, conditions[i])) {
            met = false
        }
    }
    if (!met) {
        return loc.notmet || 'Sorry, but you can\'t go there right now.'
    }
    
    const resp = []
    if (user.convo) {
        const person = people[user.convo[0]]
        if (person) {
            resp.push(`${person.name}: "${person.abandon || 'Okay, bye!'}"`)
        }
        user.convo = null
    }
    if (locations[user.location].name === 'metro station') {
        resp.push('You hop on a metro train and are there in a flash.')
    } else if (loc.name === 'metro station') {
        resp.push('You take a short stroll to the nearest metro station.')
    }
    
    user.location = loc.id

    if (!user.visited.includes(loc.id)) {
        user.visited.push(loc.id)
        user.score += loc.points || 1
        await userModel.incrementStat('loc', loc.id, user.visited.length)
    }
    
    resp.push(loc.arrival)
    return resp
}
goto.alt = ['go to', 'travel to', 'take me to', 'head to', 'walk to']

async function engage(user, ...tokens) {
    const trigger = tokens.join(' ').trim().replace(/^(the|my) /, '')
    
    const target = locations[user.location].people.filter((pid) => {
        const person = people[pid]
        return person && (person.name.toLowerCase() === trigger.toLowerCase() || person.triggers.includes(trigger.toLowerCase()))
    })[0] || null
    const person = people[target]
    if (!person) {
        return 'You look around, but don\'t see anyone like that.'
    }

    const prev = user.contacts.filter((c) => c.id === person.id)[0]
    if (!prev) {
        user.contacts.push({id: person.id, type:'npc'})
        user.score += person.points || 1
        const npcContacts = user.contacts.filter((c) => c.type === 'npc').length
        await userModel.incrementStat('npc', person.id, npcContacts)
    }

    let start = 0
    if (person.starts) {
        for (let i=0; i<person.starts.length; ++i) {
            let met = true
            ;(person.starts[i].conditions || []).forEach((cond) => {
                if (!checkCondition(user, cond)) {
                    met = false
                }
            })
            if (met) {
                start = person.starts[i].met
                break;
            }
        }
    }

    if (!person.conversation[start].end) {
        user.convo = [person.id, start]
    }

    return `${person.name}: "${person.conversation[start].phrase}"`
}
engage.alt = ['talk to', 'talk with', 'speak to', 'speak with', 'chat with', 'interact with', 'approach']

async function take(user, ...tokens) {
    const itemName = tokens.join(' ').trim().replace(/^(the|a|an) /, '')
    if (!itemName) {
        return 'What do you want to pick up?'
    } else {
        const itemId = locations[user.location]?.items.filter((id) => {
            return items[id]?.name.toLowerCase() === itemName.toLowerCase() || items[id]?.alternates.includes(itemName.toLowerCase())
        })[0] || null

        if (!itemId) {
            return 'You don\'t see anything like that around here.'
        } else if (user.items.includes(itemId)) {
            return 'You already have that item.'
        }

        const item = items[itemId]
        user.items.push(item.id)
        user.score += item.points
        await userModel.incrementStat('item', itemId, user.items.length)

        return 'You pick up the ' + item.name
    }
}
take.alt = ['pickup', 'pick up', 'retrieve', 'get', 'grab']

function use(user, ...tokens) {
    const itemName = tokens.join(' ').trim().replace(/^(the|a|an|my) /, '')
    if (!itemName) {
        return 'Which item do you want to use?'
    } else {
        const itemId = user.items.filter((id) => {
            return items[id]?.name.toLowerCase() === itemName.toLowerCase() || items[id]?.alternates.includes(itemName.toLowerCase())
        })[0] || null

        if (!itemId) {
            return 'You don\'t have that item. Maybe you can check your *inventory*?'
        }
        
        const item = items[itemId]
        if (item.use?.type === 'text') {
            return item.use.value
        } else if (item.use?.type === 'userprop') {
                return user[item.use.value]
        } else if (item.use?.type === 'download') {
            return `DOWNLOAD|${item.use.filename || 'file.txt'}|${item.use.value}`
        } else {
            return item.description
        }
    }
}
use.alt = ['activate', 'operate']

async function admin(user, ...tokens) {
    if (!user.isAdmin) {
        logger.warn(`admin action attempted by ${user.handle} (${user.code}): ${tokens.join(' ').replaceAll(/[^a-z0-9\-\.\|\\\/\s]/g, '')}`)
        throw new AppError('Sorry, but you aren\'t supposed to do that.', 403)
    }
    
    logger.info(`admin action by ${user.handle}: ${tokens.join(' ')}`)

    const resp = await adminActions(tokens)
    
    return resp || 'Sorry, not sure what you\'re trying to do...'
}
use.alt = []


function checkCondition(user, condition) {
    if (condition.check === 'has' && condition.type === 'item') {
        return user.items.includes(condition.value)
    } else if (condition.check === 'has' && condition.type === 'contact') {
        return !!user.contacts.filter((c) => c.id === condition.value)[0]
    }
    return false
}


const commands = {
    help, whoami, resetpassword, exit, whereami, inventory, contacts, visited, leaderboard, goto, take, inspect, engage, use, admin
}
const count = Object.keys(commands).length
for (fn in commands) {
    if (commands[fn].alt) {
        commands[fn].alt.forEach((phrase) => { commands[phrase] = commands[fn] })
    }
}
logger.debug(`Registered ${count} main commands and ${Object.keys(commands).length} phrases`)

module.exports = commands
