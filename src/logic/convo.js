
const exec = require('util').promisify(require('node:child_process').exec)
const userModel = require('../models/user')
const locations = require('../locations.json')
const people = require('../people.json')
const items = require('../items.json')
const logger = require('../util/logger')(process.env.LOG_LEVEL)

async function handleConversation(user, response) {
    const person = people[user.convo[0]]
    if (!person) {
        user.convo = null
        return 'It looks like they just vanished! You decide to move on.'
    }

    if (['hi', 'hello', 'howdy', 'hiya', 'good morning', 'good afternoon', 'good evening'].includes(response)) {
        const greetings = ['Hi', 'Hello', 'Howdy', 'Hiya']
        return `${person.name}: "${greetings[Math.floor(Math.random()*greetings.length)]}!"`
    }
    if (['bye', 'goodbye', 'leave', 'exit', 'walk away', 'see ya', 'stop', 'stop chat', 'stop talking', 'end', 'end chat', 'end conversation', 'say bye', 'say goodbye'].includes(response)) {
        user.convo = null
        return `${person.name}: "${person.abandon || 'Okay, bye!'}"`
    }
    if (['repeat', 'repeat that', 'can you repeat that', 'repeat what you said', 'what did you say', 'what', 'say again', 'come again'].includes(response)) {
        let runMsg = null
        if (person.conversation[user.convo[1]].run) {
            runMsg = await runCommand(user, person.conversation[user.convo[1]].run)
        }
        return `${person.name}: "${person.conversation[user.convo[1]].phrase}"${(runMsg) ? `\n${runMsg}` : ''}`
    }

    let next = null
    let options = person.conversation[user.convo[1]].responses
    for (let i=0; i<options.length; ++i) {
        if (options[i].triggers[0] === '*') {
            // This should always be the last option, and we should only get here if other options are exhausted
            let met = true
            if (options[i].conditions) {
                for (let j=0; j<options[i].conditions.length; ++j) {
                    if (!(await checkCondition(user, options[i].conditions[j], response))) {
                        met = false
                    }
                }
            }
            if (met) {
                next = options[i].met
            } else {
                next = options[i].not || null
            }
            break
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
            if (options[i].conditions) {
                for (let j=0; j<options[i].conditions.length; ++j) {
                    if (!(await checkCondition(user, options[i].conditions[j], response))) {
                        met = false
                    }
                }
            }

            if (met) {
                next = options[i].met
            } else {
                next = options[i].not || null
            }
            break

        } else {
            // if we didn't exactly match the triggers, see if we have a regular expression trigger...
            for (let j=0; j<triggers.length; ++j) {
                if (/^re\-/.test(triggers[j])) {
                    const trigger = new RegExp(triggers[j].substring(3))
                    if (trigger.test(response)) {
                        let met = true
                        if (options[i].conditions) {
                            for (let j=0; j<options[i].conditions.length; ++j) {
                                if (!(await checkCondition(user, options[i].conditions[j], response))) {
                                    met = false
                                }
                            }
                        }

                        if (met) {
                            next = options[i].met
                        } else {
                            next = options[i].not || null
                        }
                        break
                    }
                }
            }
        }
        if (next) {
            break
        }
    }

    if (next === null) {
        return `${person.name}: "Sorry, I don't understand."`
    } else {
        return processStep(user, person, response, next)
    }
}

async function processStep(user, person, response, step) {
    let nextMessage = null
    if (Array.isArray(step)) {
        // Used primarily as a loopback with a different message for the player
        nextMessage = step[0]
        step = step[1]
    } else if (Number.isInteger(step)) {
        nextMessage = person.conversation[step].phrase
    } else if (step?.actions) {
        for (let i=0; i<step.actions.length; ++i) {
            if (step.actions[i][0] === 'store') {
                if (step.actions[i][1] === '{{user-codes-key}}') {
                    try {
                        const connection = await userModel.get(null, response || '')
                        if (!connection) { throw new Error('no user found') }
                        if (connection.handle < user.handle) {
                            user.convo[2] = `${connection.code}+${user.code}`
                        } else {
                            user.convo[2] = `${user.code}+${connection.code}`
                        }
                        logger.debug(`Stored data in convo: ${user.convo[2]}`)
                    } catch (err) {
                        logger.warn(`Unable to store user-codes-key value in convo (resp was "${response}")`)
                        user.convo[2] = null
                    }
                } else if (step.actions[i][1] === '{{response}}') {
                    user.convo[2] = response
                } else {
                    user.convo[2] = step.actions[i][1]
                }
            }
        }
        step = step.goto
        nextMessage = person.conversation[step].phrase
    } else {
        logger.debug(`Bad 'step' in conversation: ${user.convo[0]}, step ${user.convo[1]} with response: ${response}`)
        return `${person.name}: "Sorry, I don't understand."`
    }

    let itemName = null
    if (person.conversation[step].item && !user.items.includes(person.conversation[step].item)) {
        itemName = items[person.conversation[step].item].name
        user.items.push(person.conversation[step].item)
        await userModel.incrementStat('item', person.conversation[step].item, user.items.length)
    }

    let runMsg = null
    if (person.conversation[step].run) {
        runMsg = await runCommand(user, person.conversation[step].run)
    }

    if (person.conversation[step].end) {
        user.convo = null
    } else {
        user.convo[1] = step
    }
    return `${person.name}: "${nextMessage}"${(runMsg) ? `\n${runMsg}` : ''}${(itemName) ? `\nYou received the ${itemName}!` : ''}`
}

async function checkCondition(user, condition, input) {
    if (condition.check === 'has' && condition.type === 'item') {
        return user.items.includes(condition.value)

    } else if (condition.check === 'has' && condition.type === 'contact') {
        return !!user.contacts.filter((c) => c.id === condition.value)[0]

    } else if (condition.check === 'has' && condition.type === 'connection') {
        try {
            const code = (await userModel.get(null, input)).code
            return !!user.contacts.filter((c) => { return c.type === 'player' && c.id === code })[0]
        } catch (err) {
            logger.debug(`Unable to get user code during connection check: ${err.message || err}`)
            return false
        }

    } else if (condition.check === 'is' && condition.type === 'colocated') {
        try {
            const connection = await userModel.get(null, input)
            return !!user.contacts.filter((c) => {
                return c.type === 'player' && c.id === connection.code && connection.location === user.location
            })[0]
        } catch (err) {
            logger.debug(`Unable to get user code during colocation check: ${err.message || err}`)
            return false
        }

    } else if (condition.check === 'is' && condition.type === 'indualconvo') {
        try {
            const connection = await userModel.get(null, input)
            return !!user.contacts.filter((c) => {
                return c.type === 'player' && c.id === connection.code && connection.convo && connection.convo[0] === user.convo[0]
            })[0]
        } catch (err) {
            logger.debug(`Unable to get user code during colocation check: ${err.message || err}`)
            return false
        }
        
    } else if (condition.check === 'count' && condition.type === 'locations') {
        if (condition.value === 'max') {
            return user.visited.length === Object.keys(locations).length
        } else if (Number(condition.value) || condition.value === '0') {
            return user.visited.length === Number(condition.value)
        }
    }
    return false
}

async function runCommand(user, cmd) {
    if (cmd[0] === 'encrypt') {
        let key = cmd[1]
        if (Number.isInteger(cmd[1])) {
            key = user.convo[cmd[1]]
        }
        let data = cmd[2]
        if (!key || !data) {
            logger.warn(`No key and/or data provided in convo data for encrypt action (NPC: ${user.convo[0]})`)
            return null
        }
        const algo = cmd[3] || 'aes256'
        const iter = Number(cmd[4]) || 32
        const prop = cmd[5] || null
        try {
            if (user[prop]) {
                return user[prop]
            }
            const res = await exec(`echo "${data}" | openssl enc -${algo} -a -A -salt -iter ${iter} -pass "pass:${key}"`)
            if (prop) {
                user[prop] = res.stdout
            }
            return res.stdout
        } catch(err) {
            logger.warn(`Convo encryption failed for NPC ${user.convo[0]}: ${err.message || err}`)
        }
    }
    return null
}


module.exports = {
    handleConversation,
    runCommand,
    processStep
}
