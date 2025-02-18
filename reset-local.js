
;(async () => {

    const redis = require('redis')
    const crypto = require('crypto')
    const REDIS_URL = 'redis://:@localhost:6379'


    const client = redis.createClient({
        url: REDIS_URL,
        socket: {
            tls: (REDIS_URL.match(/rediss:/) != null),
            rejectUnauthorized: false,
        }
    })
    client
        .on('error', (err) => {
            console.error(`ERROR from Redis: ${err.message || err}`)
            process.exit(1)
        })
        .connect()


    // USER DATA
    const temppass = '1234'
    const users = [
        { handle: 'jordan', code: '01942561-fd77-74af-bc19-6a3aa4073e25', admin: true },
        { handle: 'mary', code: '019447a5-3ce4-7001-82b4-3ba40036d146' },
        { handle: 'roro', code: '019447a3-9628-71fa-8f1d-dd3b55167a8a' },
        { handle: 'hilda', code: '019447a5-3ce4-7001-82b3-d6c246919796' },
        { handle: 'romeo', code: '019447a5-3ce4-7001-82b3-ee3ef976da51' },
        { handle: 'l337-h4x0r', code: '019447a3-9628-71fa-8f1d-f5a07c3fa6b7' },
        { handle: 'c-3po', code: '019447a3-9628-71fa-8f1e-5fe305037922' },
        { handle: 'the-picard', code: '019447a5-3ce4-7001-82b4-0b6b3d25f443' },
        { handle: 'beans', code: '019447a5-3ce4-7001-82b3-fe3cb366f466' },
        { handle: 'HELLO', code: '019447a3-9629-73d8-9f40-f2e34b42627e' }
    ]
    const startLoc = '0193feed-2940-71ba-9fc5-64122b4b79ff'
    const template = {
        pass: crypto.createHash('sha256').update(`${temppass}-$3458BHG34gr6yjdg783%%3`).digest('hex'),
        score: 10,
        location: startLoc,
        items: [],
        visited: [startLoc],
        contacts: [],
        convo: null
    }


    // REMOVE ALL users
    console.log('Collecting all user keys...')
    const userKeys = await client.keys(`disco_user_*`)
    for (let i=0; i<userKeys.length; ++i) {
        const user = JSON.parse(await client.get(userKeys[i]))
        console.log(`  ... retrieved ${user.handle} ...`)
        await client.set(`disco_code_${user.code}`, '')
        await client.del(`disco_user_${user.handle}`)
        await client.del(`disco_user_${user.handle}`)
        await client.zRem('leaderboard', user.handle)
        console.log(`  ... done removing all traces of ${user.handle}.`)
    }
    console.log('Collecting all stat keys...')
    const statKeys = [
        ...(await client.keys(`disco_statbyid_*`)),
        ...(await client.keys(`disco_statbycount_*`))
    ]
    console.log(`  ... removing ${statKeys.length} stat keys...`)
    for (let i=0; i<statKeys.length; ++i) {
        await client.del(statKeys[i])
    }
    console.log(`  ... done.`)

    // RE-ADD specified users
    console.log(`Re-adding ${users.length} users`)
    for (let i=0; i<users.length; ++i) {
        await client.set(`disco_code_${users[i].code}`, users[i].handle)
        await client.set(`disco_user_${users[i].handle}`, JSON.stringify({...template, handle: users[i].handle, code: users[i].code, isAdmin: users[i].admin }))
        await client.incr(`disco_statbyid_loc_${startLoc}`)
        await client.incr(`disco_statbycount_loc_1`)
        await client.zAdd('leaderboard', { score: 10, value: users[i].handle })
        console.log(`  ... added ${users[i].handle}`)
    }
    console.log(`  ... ${users.length} users added with stats`)

    client.quit()
})()