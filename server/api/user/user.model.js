'use strict';

import crypto from 'crypto';
var mongoose = require('bluebird').promisifyAll(require('mongoose'));
import {Schema} from 'mongoose';
import {preRemoveHook} from '../../config/multer';
let preRemoveAvatar = preRemoveHook('avatar');

const authTypes = ['github', 'twitter', 'facebook', 'google'];

var UserSchema = new Schema({
	avatar: String,
	firstName: {
		type: String,
		required: true,
		maxlength: 32,
		canUpdate: true
	},
	lastName: {
		type: String,
		required: true,
		maxlength: 32,
		canUpdate: true
	},
	email: { //see path validate
		type: String,
		lowercase: true
	},
	birthDate: {
		type: Date,
		required: true
	},
	regDate: {
		type: Date,
		required: true,
		default: Date.now
	},
	country: {
		type: String,
		canUpdate: true
	},
	city: {
		type: String,
		canUpdate: true
	},
	education: {
		type: {},
		canUpdate: true
	},
	work: {
		type: {},
		canUpdate: true
	},
	gender: {
		type: String,
		required: true,
		uppercase: true,
		enum: ['M', 'F']
	},
	role: {
		type: String,
		required: true,
		default: 'user'
	},
	password: String, //see path validate
	provider: {
		type: String,
		required: true
	},
	salt: String, //auto generated
	facebook: {},
	vk: {},
	tests: [{
		_id: { type: Schema.Types.ObjectId, ref: 'Test'},
		passingDate: { type: Date, default: Date.now },
		answers: {},
		result: {}
	}]
});

/**
 * Virtuals
 */

// Public profile information
UserSchema
    .virtual('profile')
    .get(function () {
        return {
            'name': this.name,
            'role': this.role
        };
    });

// Non-sensitive info we'll be putting in the token
UserSchema
    .virtual('token')
    .get(function () {
        return {
            '_id': this._id,
            'role': this.role
        };
    });

UserSchema
	.virtual('age')
	.get(function () {
		var today = new Date();
		var birthDate = new Date(this.birthDate);
		var age = today.getFullYear() - birthDate.getFullYear();
		var m = today.getMonth() - birthDate.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	});

UserSchema
	.virtual('fullName')
	.get(function () {
		return this.firstName + ' ' + this.lastName;
	});

/**
 * Validations
 */

// Validate empty email
UserSchema
    .path('email')
    .validate(function (email) {
        if (authTypes.indexOf(this.provider) !== -1) {
            return true;
        }
        return email.length;
    }, 'Email не может быть пустым');

// Validate empty password
UserSchema
    .path('password')
    .validate(function (password) {
        if (authTypes.indexOf(this.provider) !== -1) {
            return true;
        }
        return password.length;
    }, 'Пароль не может быть пустым');

// Validate email is not taken
UserSchema
    .path('email')
    .validate(function (value, respond) {
        var self = this;
        return this.constructor.findOneAsync({email: value})
            .then(function (user) {
                if (user) {
                    if (self.id === user.id) {
                        return respond(true);
                    }
                    return respond(false);
                }
                return respond(true);
            })
            .catch(function (err) {
                throw err;
            });
    }, 'Указанный email уже используется');

var validatePresenceOf = function (value) {
    return value && value.length;
};

/**
 * Pre-save hook
 */
UserSchema
    .pre('save', function (next) {
        // Handle new/update passwords
        if (!this.isModified('password')) {
            return next();
        }

        if (!validatePresenceOf(this.password) && authTypes.indexOf(this.provider) === -1) {
            next(new Error('Неправильный пароль'));
        }

        // Make salt with a callback
        this.makeSalt((saltErr, salt) => {
            if (saltErr) {
                next(saltErr);
            }
            this.salt = salt;
            this.encryptPassword(this.password, (encryptErr, hashedPassword) => {
                if (encryptErr) {
                    next(encryptErr);
                }
                this.password = hashedPassword;
                next();
            });
        });
    });

UserSchema
	.pre('remove', preRemoveAvatar);

/**
 * Methods
 */
UserSchema.methods = {
    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} password
     * @param {Function} callback
     * @return {Boolean}
     * @api public
     */
    authenticate(password, callback) {
        if (!callback) {
            return this.password === this.encryptPassword(password);
        }

        this.encryptPassword(password, (err, pwdGen) => {
            if (err) {
                return callback(err);
            }

            if (this.password === pwdGen) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    },

    /**
     * Make salt
     *
     * @param {Number} byteSize Optional salt byte size, default to 16
     * @param {Function} callback
     * @return {String}
     * @api public
     */
    makeSalt(byteSize, callback) {
        var defaultByteSize = 16;

        if (typeof arguments[0] === 'function') {
            callback = arguments[0];
            byteSize = defaultByteSize;
        } else if (typeof arguments[1] === 'function') {
            callback = arguments[1];
        }

        if (!byteSize) {
            byteSize = defaultByteSize;
        }

        if (!callback) {
            return crypto.randomBytes(byteSize).toString('base64');
        }

        return crypto.randomBytes(byteSize, (err, salt) => {
            if (err) {
                callback(err);
            } else {
                callback(null, salt.toString('base64'));
            }
        });
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @param {Function} callback
     * @return {String}
     * @api public
     */
    encryptPassword(password, callback) {
        if (!password || !this.salt) {
            return null;
        }

        var defaultIterations = 10000;
        var defaultKeyLength = 64;
        var salt = new Buffer(this.salt, 'base64');

        if (!callback) {
            return crypto.pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength)
                .toString('base64');
        }

        return crypto.pbkdf2(password, salt, defaultIterations, defaultKeyLength, (err, key) => {
            if (err) {
                callback(err);
            } else {
                callback(null, key.toString('base64'));
            }
        });
    }
};

export { UserSchema };
export default mongoose.model('User', UserSchema);
