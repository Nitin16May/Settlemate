const User = require('../models/user');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const secret = 'fgvgf675dsf6eg78r4g8wer';
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '21ucs149@gmail.com',
      pass: 'zcechgtieivarhpz',
    },
  });

exports.getsignup = (req, res, next) => {
    res.render('signup',{
        errorMessage : req.flash('error')
    });
};

exports.postsignup = (req, res, next) => {
    const name = req.body.name.trim();
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    User.findOne({email:email})
        .then(userDoc => {
        if(userDoc)
        {
            req.flash('error','Email already exists.');
            return res.redirect('/signup');
        }
        return bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                name:name,
                email:email,
                password:hashedPassword,
                upiid:"",
                verified:false,
                trips:[]
            });
            user.save()
            .then(result => {
                const user_id = jwt.sign({id:result._id}, secret);
                const link = `http://127.0.0.1:3000/verify/${user_id}`;
                const mail = {
                    from:'21ucs149@gmail.com',
                    to:email,
                    subject:'SettleMate Verify Email',
                    html: '<p>Hello ' + result.name + ' click here to <a href="'+link+'"> verify</a> your mail. </p>'
                };
                transporter.sendMail(mail);
                req.flash('error','Verification link has been sent to your mail.');
                res.redirect('/login');
            });;
        })
    })
    .catch(err => {
        console.log(err);
    });
};

exports.verify = (req,res,next) => {
    const id = jwt.verify(req.params.id,secret).id;
    console.log(id);
    User.findById(id)
    .then(result =>{
        result.verified=true;
        result.save().then(() => {
            req.flash('error','Your email has been Verified.');
            res.redirect('/login');
        });
    })
    .catch(err => {
        console.log(err);
    });
};

exports.getlogin = (req, res, next) => {
    res.render('login',{
        errorMessage : req.flash('error')
    });
};
exports.postlogin = (req, res, next) => {
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    User.findOne({email:email})
        .then(userDoc => {
        if(!userDoc)
        {
            req.flash('error','No such account with this email');
            return res.redirect('/login');
        }
        if(!userDoc.verified)
        {
            req.flash('error','Email not verified. Verification mail sent again.');
            const user_id = jwt.sign({id:userDoc._id}, secret);
            const link = `http://127.0.0.1:3000/verify/${user_id}`;
                const mail = {
                    from:'21ucs149@gmail.com',
                    to:email,
                    subject:'SettleMate Verify Email',
                    html: '<p>Hello ' + userDoc.name + ' click here to <a href="'+link+'"> verify</a> your mail. </p>'
                };
                transporter.sendMail(mail);
                return res.redirect('/login');
        }
        bcrypt.compare(password,userDoc.password)
        .then(result => {
            if(result) {
                req.session.userid=userDoc._id;
                req.session.userName=userDoc.name;
                req.session.isLoggedIn=true;
                req.session.tokens = crypto.randomBytes(16).toString('hex');;
                req.flash('error','Welcome '+userDoc.name);
                return req.session.save(() => {
                    res.redirect('/home');
                })
            }
            req.flash('error','Password is incorrect.');
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
        });
    })
    .catch(err => {
        console.log(err);
    });
};
exports.logout = (req, res, next) => {
    req.session.destroy(() => {
        res.redirect('/');
    })
};
exports.sendreset = (req, res, next) => {
    res.render('reset',{
        errorMessage : req.flash('error')
    });
};
exports.sendingreset = (req, res, next) => {
    const email = req.body.email;
    User.findOne({email:email})
        .then(userDoc => {
        if(!userDoc)
        {
            req.flash('error','No such account with this email');
            return res.redirect('/sendreset');
        }
        if(!userDoc.verified)
        {
            req.flash('error','Email not verified. Verification mail sent again.');
            const user_id = jwt.sign({id:userDoc._id}, secret);
            const link = `http://127.0.0.1:3000/verify/${user_id}`;
                const mail = {
                    from:'21ucs149@gmail.com',
                    to:email,
                    subject:'SettleMate Verify Email',
                    html: '<p>Hello ' + userDoc.name + ' click here to <a href="'+link+'"> verify</a> your mail. </p>'
                };
                transporter.sendMail(mail);
                return res.redirect('/sendreset');
        }
        const user_id = jwt.sign({id:userDoc._id}, secret, { expiresIn: '1h' });
        const link = `http://127.0.0.1:3000/reset/${user_id}`;
        const mail = {
            from:'21ucs149@gmail.com',
            to:email,
            subject:'SettleMate Reset Password',
            html: '<p>Hello ' + userDoc.name + ' click here to <a href="'+link+'"> reset</a> your password. Valid for 1 hour. </p>'
        };
        transporter.sendMail(mail);
        req.flash('error','Reset link has been sent to your mail.');
        res.redirect('/login');
    })
    .catch(err => {
        console.log(err);
    });
};
exports.reset = (req, res, next) => {
    const id = jwt.verify(req.params.id,secret).id;
    console.log(id);
    User.findById(id)
    .then(result =>{
        res.render('resetpass',{
            email:result.email
        });
    })
    .catch(err => {
        console.log(err);
    });
};

exports.resetting = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password.trim();
    User.findOne({email:email})
        .then(userDoc => {
        return bcrypt.hash(password, 12)
        .then(hashedPassword => {
            userDoc.password = hashedPassword;
            userDoc.save()
            .then(result => {
                req.flash('error','Password has been reset. Login using your new password.');
                res.redirect('/login');
            });;
        })
    })
    .catch(err => {
        console.log(err);
    });
};
