
const locations = require('../locations.json')

// TODO: rest, talk, look around

function whoami(user) {
    if (user) {
        return user.handle || '??'
    } else {
        return 'i do not know, who are you?'
    }
}
whoami.alt = ['who am i', 'whats my name', 'what am i called', 'whats my handle']

function goto(user, ...locTokens) {
    const dest = locTokens.join(' ').trim().replace(/^the /, '')
    if (!dest) {
        return 'What do you wany to pick up?'
    } else if (!locations[dest]) {
        return 'Sorry, I don\'t know where that is.'
    } else if (user.location === dest) {
        return 'You\'re already there!'
    } else {
        const resp = []
        if (dest !== 'metro station' && user.location === 'metro station') {
            resp.push('You hop on a metro train and are there in a flash.')
        } else if (dest === 'metro station') {
            resp.push('You take a short stroll to the nearest metro station.')
        } else {
            if (user.energy < 21) {
                return 'That\'s pretty far. Walking there will probably wear you out.'
            } else {
                resp.push('That\'s a long walk, but you don\'t mind. Next time it might be better to find a metro station.')
                user.energy -= 20
            }
        }
        user.location = dest
        resp.push(locations[dest].arrival)
        return resp
    }
}
goto.alt = ['go to', 'travel to', 'take me to', 'head to']

function pickup(user, ...itemTokens) {
    const item = itemTokens.join(' ').trim().replace(/^(the|a|an) /, '')
    if (!item) {
        return 'What do you wany to pick up?'
    } else {
        // TODO: check to see if they can get the item, then add to inventory
        return 'you picked up the ' + item
    }
}
pickup.alt = ['pick up', 'retrieve', 'get', 'grab']




const commands = {
    whoami, goto, pickup
}
for (fn in commands) {
    if (commands[fn].alt) {
        commands[fn].alt.forEach((phrase) => { commands[phrase] = commands[fn] })
    }
}

module.exports = commands
