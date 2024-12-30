
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const locations = require('../locations.json')
const items = require('../items.json')

// TODO: talk to people, use items

function help() {
    return [
        'You consult the info packet you happen to have in your pocket.',
        'There are a number of locations for you to visit, people you can talk to, and items to collect!',
        'It\'s not entirely clear what your ultimate goal is yet... but you might find that out along the way.',
        'You can *look around* to check out where you are, *go to* different locations, and *talk to* people.',
        'Along the way you\'ll be able to *take* items you find and *inspect* them for clues.',
        'There might be other things you can do as well!'
    ].join(' ')
}
help.alt = ['hint', 'hints', 'give me a hint', 'what is this', 'what should i do', 'what do i do', 'how do i play']

function whoami(user) {
    if (user && user.handle) {
        return user.handle
    } else {
        return 'You seem to have lost your memory.'
    }
}
whoami.alt = ['who am i', 'what is my name', 'what am i called', 'what is my handle']

function whereami(user) {
    if (user && user.location && locations[user.location]) {
        return `You are at the ${locations[user.location].name}`
    } else {
        return 'You are lost.'
    }
}
whereami.alt = ['where am i', 'current location', 'location', 'pwd', 'what is my location']

function inspect(user, ...tokens) {
    const target = tokens.join(' ').trim().toLowerCase().replace(/^(the|my|this) /, '')
    if (!target || ['location', 'place', 'surroundings', 'here'].includes(target)) {
        return locations[user.location].description
    } else {
        const item = user.items.filter((id) => { return items[id]?.name === target }).map((id) => items[id])[0]
        if (item) {
            return item.description
        } else {
            return `You look around you, but can\'t find a ${target}`
        }
    }
}
inspect.alt = ['look around', 'look at', 'what is here', 'what can i see', 'what is around me', 'what is here']

async function goto(user, ...tokens) {
    const dest = tokens.join(' ').trim().toLowerCase().replace(/^the /, '')
    const loc = Object.keys(locations)
        .filter((id) => { return locations[id].name === dest })
        .map((id) => { return locations[id] })
    
    if (!dest) {
        return 'Where do you want to go?'
    } else if (!loc.length) {
        return 'You don\'t know where that is.'
    } else if (loc.length > 1) {
        return 'It looks like there are two locations with that name!'
    } else if (user.location === loc[0].id) {
        return 'You\'re already there!'
    }

    const resp = []
    if (locations[user.location].name === 'metro station') {
        resp.push('You hop on a metro train and are there in a flash.')
    } else if (loc[0].name === 'metro station') {
        resp.push('You take a short stroll to the nearest metro station.')
    } else {
        resp.push('That\'s a long walk, but you don\'t mind. Next time it might be better to find a metro station.')
    }
    
    user.location = loc[0].id

    if (!user.visited.includes(loc[0].id)) {
        user.visited.push(loc[0].id)
    }
    resp.push(loc[0].arrival)
    return resp
}
goto.alt = ['go to', 'travel to', 'take me to', 'head to', 'walk to', 'go']

function take(user, ...tokens) {
    const item = tokens.join(' ').trim().replace(/^(the|a|an) /, '')
    if (!item) {
        return 'What do you want to pick up?'
    } else {
        // TODO: check to see if they can get the item, then add to inventory
        return 'You picked up the ' + item
    }
}
take.alt = ['pickup', 'pick up', 'retrieve', 'get', 'grab']


const commands = {
    help, whoami, whereami, goto, take, inspect
}
for (fn in commands) {
    if (commands[fn].alt) {
        commands[fn].alt.forEach((phrase) => { commands[phrase] = commands[fn] })
    }
}

module.exports = commands
