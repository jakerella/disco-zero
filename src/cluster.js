const cluster = require('node:cluster')
const process = require('node:process')
const main = require('./server.js')

// FROM https://devcenter.heroku.com/articles/node-concurrency
const numOfWorkers = (
    process.env.HEROKU_AVAILABLE_PARALLELISM ||
    process.env.WEB_CONCURRENCY ||
    1)

if (cluster.isPrimary) {
    console.log(`Primary cluster instance running on PID ${process.pid}`)
    
    for (let i = 0; i < numOfWorkers; ++i) { cluster.fork() }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died (code: ${code}; signal: ${signal})`)
    })

} else {

    main()
    console.log(`Worker started on PID ${process.pid}`)

}