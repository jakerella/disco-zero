const fs = require('fs')
const uuid = require('uuid')
const redis = require('redis')

const COUNT = 10
const FILENAME = 'codes.txt'
const BASE_URL = 'https://game.districtcon.org/contact/'
const REDIS_URL = null  // process.env.REDIS_URL

;(async () => {
    const urls = []
    const codes = []
    for (let i=0; i<COUNT; ++i) {
        const code = uuid.v7({ msecs: Math.floor(Math.random() * 159619437448) + 1577854800000 })
        urls.push(`${BASE_URL}${code}`)
        codes.push(code)

        console.log(code)
    }

    console.log(`Generated ${urls.length} URLs with codes`)
    
    fs.writeFileSync(FILENAME, urls.join('\n'))
    console.log(`Wrote all URLs to ${FILENAME}`)

    // For reading a big file of codes in order to write them to redis
    // const codes = fs.readFileSync('disco_lobbycon_codes.txt').toString().split('\n').map((u) => {
    //     return u.split('/contact/')[1]
    // })

    if (REDIS_URL) {
        console.log('REDIS_URL present, writing to data store...')
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
    
        // const keys = await client.keys('*')
        // if (keys.length) {
        //     for (let i=0; i<keys.length; ++i) {
        //         const result = await client.del(keys[i])
        //         if (result !== 1) {
        //             console.warn(`did not delete code ${i} from redis (${keys[i]}): ${result}`)
        //         }
        //     }
        // }
    
        let count = 0
        console.log(`Attempting to write ${codes.length} codes to redis...`)
        for (let i=0; i<codes.length; ++i) {
            const result = await client.set(`disco_code_${codes[i]}`, "")
            if (result !== 'OK') {
                console.warn(`did not write code ${i} to redis (${codes[i]}): ${result}`)
            } else {
                count++
            }
        }
        console.log(`Wrote ${count} codes to redis`)
    
        client.quit()
    }
})()
