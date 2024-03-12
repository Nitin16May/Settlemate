const jwt = require('jsonwebtoken');

function tokenize(session, data) {
    try {
        return jwt.sign({data:data}, session.tokens);
    } catch (error) {
        console.log(error);
    }
}

module.exports = tokenize;
