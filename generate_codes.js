const fs = require('fs')
const uuid = require('uuid')
const redis = require('redis')

const COUNT = 50
const FILENAME = 'codes.txt'
const BASE_URL = 'https://game.districtcon.org/contact/'
const REDIS_URL = process.env.REDIS_URL

const urls = []
const codes = []
for (let i=0; i<COUNT; ++i) {
    const code = uuid.v7()
    urls.push(`${BASE_URL}${code}`)
    codes.push(code)
}
console.log(`Generated ${urls.length} URLs with codes`)
fs.writeFileSync(FILENAME, urls.join('\n'))
console.log(`Wrote all URLs to ${FILENAME}`)

if (REDIS_URL) {
    const client = redis.createClient({
        url: REDIS_URL,
        socket: {
            tls: (process.env.REDIS_URL.match(/rediss:/) != null),
            rejectUnauthorized: false,
        }
    })
    client
        .on('error', (err) => {
            console.error(`ERROR from Redis: ${err.message || err}`)
            process.exit(1)
        })
        .connect()

    codes.forEach(async (code) => {
        await client.set(`${process.env.APP_NAME}_code_${code}`, "")
    })
    console.log(`Wrote ${codes.length} codes to redis`)
    client.quit()
}