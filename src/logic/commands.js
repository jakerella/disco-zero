
function whoami(user) {
    if (user) {
        return user.handle || '??'
    } else {
        return 'i do not know, who are you?'
    }
}
whoami.alt = ['who am i', 'whats my name', 'what am i called', 'whats my handle']

function goto(user, ...locTokens) {
    const loc = locTokens.join(' ').trim().replace(/^the /, '')
    if (!loc) {
        return 'What do you wany to pick up?'
    } else {
        // TODO: check to see if they can get there and update data
        return 'you go to the ' + loc
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
