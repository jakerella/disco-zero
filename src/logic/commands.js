
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')

// TODO: view contact list, and where they're at (if known)
// TODO: list of where you've been (kind of like the inventory)
// TODO: players can send messages to others in their contact list
// TODO: Also store users by location ID so people can see who's around them?
// TODO: add condition for if NPC has already been seen... basically, change the greeting, and maybe the start point?
// TODO: track score modifiers and allow user to see how their score is calculated
// TODO: see leaderboard
// TODO: help on specific commands?


function help() {
    return [
        'You consult the info packet you happen to have in your pocket.',
        'There are a number of locations for you to visit, people you can talk to, and items to collect!',
        'It\'s not entirely clear what your ultimate goal is yet... but you might find that out along the way.',
        'You can *look around* to check out where you are, *go to* different locations, and *talk to* people.',
        'Along the way you\'ll be able to *take* items you find and *inspect* them for clues.',
        'Other basic things are asking "Who am i?", checking your *inventory*, and you can *inspect* items you have.\n',
        'When talking to someone in the game, make sure to pay attention to what they ask you and answer',
        'directly (your answers need to be specific and short, usually). Note that when talking to someone, you can\'t',
        'use normal commands until you leave the conversation (usually by saying "goodbye").\n',
        'You can "logout" any time to *exit* the game and clear your session.'
    ].join(' ')
}
help.alt = ['hint', 'hints', 'give me a hint', 'what is this', 'what should i do', 'what do i do', 'how do i play']

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
exit.alt = ['get out', 'leave', 'walk out']

function whoami(user) {
    if (user && user.handle) {
        return `${user.handle} (${user.score || 0})`
    } else {
        return 'You seem to have lost your memory.'
    }
}
whoami.alt = ['who am i', 'what is my name', 'what am i called', 'what is my handle', 'score', 'what is my score', 'points', 'how many points do i have', 'what are my points']

function whereami(user) {
    if (user && user.location && locations[user.location]) {
        return `You are at the ${locations[user.location].name}`
    } else {
        return 'You are lost.'
    }
}
whereami.alt = ['where am i', 'current location', 'location', 'what is my location']

function inventory(user) {
    const userItems = user.items.map((id) => { return (items[id]?.name || '') })
    if (userItems.length) {
        return `You have ${userItems.length} item${userItems.length === 1 ? '' : 's'}: ${userItems.join(', ')}`
    } else {
        return 'You only have the clothes on your back. Maybe you should get your badge from the *volunteer* at the registration desk in the *Yours Truly Hotel*?'
    }
}
inventory.alt = ['what is in my inventory', 'what do i have', 'what am i carrying', 'what have i got', 'what do i got?']

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

async function goto(user, ...tokens) {
    let password = null
    let dest = tokens.join(' ').trim().toLowerCase().replace(/^the /, '')
    
    const passHandler = dest.split('|')
    if (passHandler.length === 3 && passHandler[0] === 'password') {
        dest = passHandler[2]
        password = passHandler[1]
    }

    const loc = Object.keys(locations)
        .filter((id) => { return locations[id].name.toLowerCase() === dest })
        .map((id) => { return locations[id] })[0]
    
    if (!dest) {
        return 'Where do you want to go?'
    } else if (!loc) {
        return 'Is that even a real place? You decide to stay put.'
    } else if (user.location === loc.id) {
        return 'You\'re already here!'
    }

    const curr = locations[user.location]

    if (loc.type === 'hidden') {
        if (!user.visited.includes(loc.id)) {
            return 'Is that even a real place? You decide to stay put.'
        }
    } else if (loc.type === 'main' && curr.parent && loc.id !== curr.parent) {
        return `Looks like you\'re in the ${curr.name}. You probably need to find your way out first.`
    } else if (loc.type !== 'main' && curr.id !== loc.parent) {
        return 'You can\'t get there from here.'
    }

    let met = true
    const conditions = loc.conditions || []
    for (let i=0; i<conditions.length; ++i) {
        if (conditions[i].check === 'password') {
            if (password && password !== conditions[i].value) {
                return 'Nope, that\'s not it.'
            } else if (!password) {
                return `PASSWORD|goto|${dest}`
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
    } else if (loc.type === 'main' && curr.type === 'main') {
        const tired = (Math.random() < 0.3) ? 1 : 0
        if (tired) {
            resp.push('That walk tired you out. Next time it might be better to find a metro station.')
            user.score -= tired
        }
    }
    
    user.location = loc.id

    if (!user.visited.includes(loc.id)) {
        user.visited.push(loc.id)
        user.score += loc.points || 1
    }
    resp.push(loc.arrival)
    return resp
}
goto.alt = ['go to', 'travel to', 'take me to', 'head to', 'walk to']

function engage(user, ...tokens) {
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
    }

    user.convo = [person.id, 0]

    return `${person.name}: "${person.conversation[user.convo[1]].phrase}"`
}
engage.alt = ['talk to', 'talk with', 'speak to', 'chat with', 'interact with', 'approach']

function take(user, ...tokens) {
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
        } else if (item.use?.type === 'download') {
            return `DOWNLOAD|${item.use.filename || 'file.txt'}|${item.use.value}`
        } else {
            return item.description
        }
    }
}
use.alt = ['activate', 'operate']


function checkCondition(user, condition) {
    if (condition.check === 'has' && condition.type === 'item') {
        return user.items.includes(condition.value)
    } else if (condition.check === 'has' && condition.type === 'contact') {
        return !!user.contacts.filter((c) => c.id === condition.value)[0]
    }
    return false
}


const commands = {
    help, whoami, exit, whereami, inventory, goto, take, inspect, engage, use
}
const count = Object.keys(commands).length
for (fn in commands) {
    if (commands[fn].alt) {
        commands[fn].alt.forEach((phrase) => { commands[phrase] = commands[fn] })
    }
}
logger.debug(`Registered ${count} main commands and ${Object.keys(commands).length} phrases`)

module.exports = commands
