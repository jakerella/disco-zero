
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

async function handleConversation(user, response) {
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
    if (['bye', 'goodbye', 'leave', 'exit', 'walk away', 'see ya', 'stop', 'stop chat', 'stop talking', 'end', 'end chat', 'end conversation', 'say bye', 'say goodbye'].includes(response)) {
        user.convo = null
        return `${person.name}: "${person.abandon || 'Okay, bye!'}"`
    }
    if (['repeat', 'repeat that', 'can you repeat that', 'repeat what you said', 'what did you say', 'what', 'say again', 'come again'].includes(response)) {
        return `${person.name}: "${person.conversation[user.convo[1]].phrase}"`
    }

    let next = null
    let options = person.conversation[user.convo[1]].responses
    for (let i=0; i<options.length; ++i) {
        if (options[i].triggers[0] === '*') {
            // This should always be the last option, and we should only get here if other options are exhausted
            let met = true
            ;(options[i].conditions || []).forEach((cond) => {
                if (!checkCondition(user, cond)) {
                    met = false
                }
            })
            if (met && Array.isArray(options[i].met) && options[i].met.length === 2) {
                next = options[i].met
            } else if (met && Number.isInteger(options[i].met)) {
                next = options[i].met
            } else if (met) {
                logger.warn(`Unable to read "met" entry on ${person.id} step ${user.convo[1]}`)
            } else {
                next = options[i].not || null
            }
        }

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

            if (met && Array.isArray(options[i].met) && options[i].met.length === 2) {
                next = options[i].met
            } else if (met && Number.isInteger(options[i].met)) {
                next = options[i].met
            } else if (met) {
                logger.warn(`Unable to read "met" entry on ${person.id} step ${user.convo[1]}`)
            } else {
                next = options[i].not || null
            }
            break
        } else {
            for (let j=0; j<triggers.length; ++j) {
                if (/^re\-/.test(triggers[j])) {
                    const trigger = new RegExp(triggers[j].substring(3))
                    
                    if (trigger.test(response)) {
                        let met = true
                        ;(options[i].conditions || []).forEach((cond) => {
                            if (!checkCondition(user, cond)) {
                                met = false
                            }
                        })

                        if (met && Array.isArray(options[i].met) && options[i].met.length === 2) {
                            next = options[i].met
                        } else if (met && Number.isInteger(options[i].met)) {
                            next = options[i].met
                        } else if (met) {
                            logger.warn(`Unable to read "met" entry on ${person.id} step ${user.convo[1]}`)
                        } else {
                            next = options[i].not || null
                        }
                        break
                    }
                }
            }
        }
    }

    if (next === null) {
        return `${person.name}: "Sorry, I don't understand."`
    } else {
        let nextMessage = null
        if (Array.isArray(next)) {
            // Used primarily as a loopback with a different message for the player
            nextMessage = next[0]
            next = next[1]
        }
        if (person.conversation[next].item && !user.items.includes(person.conversation[next].item)) {
            user.items.push(person.conversation[next].item)
            await userModel.incrementStat('item', person.conversation[next].item, user.items.length)
        }

        if (person.conversation[next].end) {
            user.convo = null
        } else {
            user.convo[1] = next
        }
        if (nextMessage) {
            return `${person.name}: "${nextMessage}"`
        } else {
            return `${person.name}: "${person.conversation[next].phrase}"`
        }
    }
}

function checkCondition(user, condition) {
    if (condition.check === 'has' && condition.type === 'item') {
        return user.items.includes(condition.value)
    } else if (condition.check === 'has' && condition.type === 'contact') {
        return !!user.contacts.filter((c) => c.id === condition.value)[0]
    } else if (condition.check === 'count' && condition.type === 'locations') {
        if (condition.value === 'max') {
            return user.visited.length === Object.keys(locations).length
        } else if (Number(condition.value) || condition.value === '0') {
            return user.visited.length === Number(condition.value)
        }
    }
    return false
}


module.exports = {
    handleConversation
}
