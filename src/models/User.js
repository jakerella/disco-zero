const { Model, DataTypes } = require('sequelize')
const uuid = require('uuid')
const sequelize = require('../util/db.js').getConnection()
const AppError = require('../util/AppError.js')


class User extends Model {

    static async register(handle, code) {
        const errors = []
        if (!handle) {
            errors.push('Please provide handle (or name).')
        }
        if (!/[A-Za-z0-9\-]{40}/.test(`${code}`)) {
            errors.push('Please provide your attendee code. You might be able to ask a volunteer if you\'re not sure how to find that.')
        }

        if (errors.length) {
            throw new AppError(errors.join('\n'), 400)
        }

        const user = await User.create({
            id: uuid.v4(),
            handle,
            code
        })

        return { id: user.id, handle, code, create_time: user.create_time }
    }
}

User.init({
    id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    handle: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
}, {
    sequelize,
    modelName: 'user',
    timestamps: true,
    createdAt: 'create_time',
    updatedAt: false
})

module.exports = User
