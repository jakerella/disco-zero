
const uuid = require('uuid')

function uuidValid(v) {
    return uuid.validate(v) && uuid.version(v) === 7
}

module.exports = {
    uuidValid
}