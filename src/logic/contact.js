
const logger = require('../util/logger')(process.env.LOG_LEVEL)
const userModel = require('../models/user')
const AppError = require('../util/AppError')
const locations = require('../locations.json')
const items = require('../items.json')
const people = require('../people.json')


const socialNetworkThresholds = {
    20: '01743c40-5e69-7c06-ad72-a5d168075279',
    50: '0183fd5b-1009-7086-8c35-f1495d067b3d',
    100: '018966db-fde3-70b4-9f0a-077394462fba'
}


module.exports = async function handleContact(req, code) {
    const user = req.session.user
    if (user) {
        if (user.code === code) {
            return 'You look at your confirmation email... yep, that\'s you.'
        } else {
            let message = null

            const prevContact = user.contacts.filter((c) => c.id === code)[0]

            if (prevContact && prevContact.type === 'player') {
                message = 'Looks like you were already connected with that person!'

            } else if (locations[code]) {
                user.location = code
                user.convo = null
                if (user.visited.includes(code)) {
                    message = `You already knew about the ${locations[code].name}, but you head over anyway!`
                } else {
                    message = `You have discovered the ${locations[code].name}! ${locations[code].arrival}`
                    user.visited.push(code)
                    user.score += locations[code].points || 1
                    await userModel.incrementStat('loc', code, user.visited.length)
                    logger.info(`${user.handle} found hidden location: ${locations[code].name}`)
                }
                await userModel.save(user)

            } else if (items[code] && items[code].scanable) {
                if (user.items.includes(code)) {
                    message = `You already have the ${items[code].name}.`
                } else {
                    message = `You found a ${items[code].name}! You stash it away in your bag.`
                    user.items.push(code)
                    user.score += items[code].points || 1
                    await userModel.save(user)
                    await userModel.incrementStat('item', code, user.items.length)
                    logger.info(`${user.handle} found hidden item: ${items[code].name}`)
                }

            } else if (people[code] && people[code].scanable) {
                if (prevContact) {
                    message = `You look at your phone while standing around and re-read the message from ${people[code].name}: "${people[code].conversation[0].phrase}"`
                } else {
                    user.contacts.push({ id: code, type: 'npc' })
                    user.score += people[code].points || 1
                    message = `Your phone buzzes and you see a new text message. You don't recognize the number, but read it anyway.\n${people[code].name}: "${people[code].conversation[0].phrase}"`
                    
                    const npcContacts = user.contacts.filter((c) => c.type === 'npc').length
                    await userModel.incrementStat('npc', code, npcContacts)
                    logger.debug(`${user.handle} made new NPC contact with ${people[code].name}`)
                }
                user.convo = [code, 0]
                await userModel.save(user)

            } else {
                try {
                    const handle = await userModel.handleByCode(code)
                    if (handle) {
                        const contact = await userModel.get(code, handle)
                        message = `Your phone buzzes and you glance at it to see that ${handle} has sent you a message. They're over at the ${locations[contact.location].name}. You add them to your contact list!`
                        user.contacts.push({ id: code, type: 'player' })
                        user.score += 1

                        const playerContacts = user.contacts.filter((c) => c.type === 'player').length
                        await userModel.incrementStat('player', null, playerContacts)

                        if (socialNetworkThresholds[playerContacts]) {
                            message += `\nYou received the ${items[socialNetworkThresholds[playerContacts]].name}!`
                            user.items.push(socialNetworkThresholds[playerContacts])
                            user.score += items[socialNetworkThresholds[playerContacts]].points || 1
                            await userModel.incrementStat('item', socialNetworkThresholds[playerContacts], user.items.length)
                            logger.debug(`${user.handle} just received the ${items[socialNetworkThresholds[playerContacts]].name}`)
                        }

                        await userModel.save(user)
                        logger.debug(`${user.handle} just connected with ${handle}`)

                    } else if (handle === '') {
                        message = `That code looks vaguely familiar, but then you look up and realize there's no one here.`
                    }
                } catch(err) {
                    logger.debug(`Unable to find player contact: ${err.message || err}`)
                    message = null
                }
            }

            if (!message) {
                req.session.falseContacts++
                message = 'You look closely at the code you found, but can\'t make sense of it. Oh well.'
            } else {
                req.session.lastGoodContact = Date.now()
            }

            return message
        }
    } else {
        req.session.falseContacts++
        throw new AppError('You need to be logged in.', 401)
    }
}