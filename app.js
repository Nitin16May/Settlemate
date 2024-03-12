const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const sessionstore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const normalRoutes = require('./routes/normal');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

// const MongoDB_URI = 'mongodb+srv://settlematenode:YsPYjCr8fOmY8uQx@settlemate.gkzs0vn.mongodb.net/?retryWrites=true&w=majority';
const MongoDB_URI = 'mongodb://127.0.0.1:27017/testsettlemate';

const app = express();
const store = new sessionstore({
    uri:MongoDB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf();

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,'public')));
app.use(session({
    secret: 'Nitin',
    resave: false,  
    saveUninitialized:false,
    store:store
}));
app.use(csrfProtection);
app.use(flash());

app.use((req,res,next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use(authRoutes);
app.use(normalRoutes);

app.use(errorController.get404);

mongoose.connect(MongoDB_URI)
.then(result => {
    console.log('Database Connected!');
    app.listen(3000);
}).catch(err => {
    console.log(err);
});