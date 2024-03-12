const User = require('../models/user');
const Trip = require('../models/trip');
const tokenize = require('../utils/tokenize');
const detokenize = require('../utils/detokenize');

exports.main = (req, res, next) => 
{
    if(req.session.userid)
    {
        User.findById(req.session.userid)
        .then(x => {res.render('main',{isLoggedIn:req.session.isLoggedIn,name:x.name});});
    }
    else 
    {
        User.findById(req.session.userid)
        .then(x => {res.render('main',{isLoggedIn:false,name:''});});
    }
};

exports.home = (req, res, next) => 
{
    User.findById(req.session.userid)
    .then(userDoc => {
        let n=userDoc.trips.length;
        const mytrips = [];
        const tripPromises = [];
        for(let i=0;i<n;i++)
        {
            tripPromises.push(
            Trip.findById(userDoc.trips[i])
            .populate('owner','name')
            .then ((x) =>
            {
                const isTripAdmin = (x.owner._id.toString() === req.session.userid.toString());
                mytrips.push({
                    name:x.name,
                    adminName:x.owner.name,
                    isTripAdmin:isTripAdmin,
                    tripid:tokenize(req.session,x._id),
                    lastEdited:x.lastEdited
                })
            })
            .catch(err => {console.log(err);}));
        }
        Promise.all(tripPromises)
        .then(() => {
            mytrips.sort((a, b) => b.lastEdited - a.lastEdited);
            res.render('home',{
                errorMessage : req.flash('error'),
                userName:userDoc.name,
                mytrips:mytrips
            });
        })
        .catch(err => {console.log(err);});
    })
    .catch(err => {console.log(err);});
};

exports.profile = (req, res, next) => 
{
    User.findById(req.session.userid)
    .then(x => {
        res.render('profile',{
            errorMessage : req.flash('error'),
            name:x.name,
            email:x.email,
            upiid:x.upiid,
            isuser:true
        });
    })
    .catch(err => {console.log(err);});
};

exports.postprofile = (req, res, next) => 
{
    const userid = detokenize(req.session,req.body.userid);
    const isuser = (req.session.userid.toString() === userid.toString());
    
        User.findById(userid)
        .then(x => {
            res.render('profile',{
                errorMessage : req.flash('error'),
                name:x.name,
                email:x.email,
                upiid:x.upiid,
                isuser:isuser
            });
        })
        .catch(err => {console.log(err);});
};

exports.editprofile = (req, res, next) => 
{
    User.findById(req.session.userid)
    .then(x => {
        console.log(x);
        res.render('editprofile',{
            name:x.name,
            email:x.email,
            upiid:x.upiid
        });
    })
    .catch(err => {console.log(err);});
};

exports.posteditprofile = (req, res, next) => 
{
    User.findById(req.session.userid)
    .then(x => {
        x.name=req.body.name;
        x.upiid=req.body.upiid;
        return x.save();
    })
    .then(() => {
        req.flash('error','Profile Saved.');
        res.redirect('/profile');
    })
    .catch(err => {console.log(err);});
};