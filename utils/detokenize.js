const jwt = require('jsonwebtoken');

function tokenize(session, data) {
    return jwt.verify(data,session.tokens).data;
}

module.exports = tokenize;