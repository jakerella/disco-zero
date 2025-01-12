
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const locations = require('../locations.json')
const people = require('../people.json')

function handleConversation(user, response) {
    const person = people[user.convo[0]]
    if (!person) {
        user.convo = null
        return 'It looks like they just vanished! You decide to move on.'
    }

    // TODO: convert these things to a regex to catch things like "bye for now", etc?
    if (['hi', 'hello', 'howdy', 'hiya', 'good morning', 'good afternoon', 'good evening'].includes(response)) {
        const greetings = ['Hi', 'Hello', 'Howdy', 'Hiya']
        return `${person.name}: "${greetings[Math.floor(Math.random()*greetings.length)]}!"`
    }
    if (['bye', 'goodbye', 'walk away', 'see ya', 'stop', 'stop chat', 'stop talking', 'end', 'end chat', 'end conversation', 'say bye', 'say goodbye'].includes(response)) {
        user.convo = null
        return `${person.name}: "${person.abandon || 'Okay, bye!'}"`
    }
    if (['repeat', 'repeat that', 'can you repeat that', 'repeat what you said', 'what did you say', 'what', 'say again', 'come again'].includes(response)) {
        return `${person.name}: "${person.conversation[user.convo[1]].phrase}"`
    }

    let next = null
    let options = person.conversation[user.convo[1]].responses
    for (let i=0; i<options.length; ++i) {
        const triggers = [...options[i].triggers]
        if (triggers.includes('yes')) {
            triggers.push(...['yea', 'yep', 'yeah', 'y', 'yup', 'yarp', 'ok', 'okay', 'sure', 'correct', 'indeed', 'of course'])
        }
        if (triggers.includes('no')) {
            triggers.push(...['nah', 'nope', 'n', 'narp', 'incorrect', 'no way', 'nuh uh', 'never'])
        }
        if (triggers.includes(response)) {
            let met = true
            ;(options[i].conditions || []).forEach((cond) => {
                if (!checkCondition(user, cond)) {
                    met = false
                }
            })
            next = (met) ? options[i].met : (options[i].not || null)
            break
        }
    }

    if (next === null) {
        return `${person.name}: "Sorry, I don't understand."`
    } else {
        if (person.conversation[next].item) {
            user.items.push(person.conversation[next].item)
        }

        if (person.conversation[next].end) {
            user.convo = null
        } else {
            user.convo[1] = next
        }
        return `${person.name}: "${person.conversation[next].phrase}"`
    }
}

function checkCondition(user, condition) {
    if (condition.check === 'has' && condition.type === 'item') {
        return user.items.includes(condition.value)
    } else if (condition.check === 'has' && condition.type === 'contact') {
        return !!user.contacts.filter((c) => c.id === condition.value)[0]
    }
    return false
}


module.exports = {
    handleConversation
}
