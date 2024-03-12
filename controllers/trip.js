const User = require('../models/user');
const Trip = require('../models/trip');
const Transaction = require('../models/transaction');
const jwt = require('jsonwebtoken');
const tokenize = require('../utils/tokenize');
const detokenize = require('../utils/detokenize');
const secretKey = 'dfgdfgherh546456fghrt67';

exports.createtrip = (req, res, next) => {
    res.render('createtrip',{userName:req.session.userName});
};
exports.creatingtrip = (req, res, next) => 
{
    const trip = new Trip({
        name:req.body.name,
        owner:req.session.userid,
        lastEdited:new Date(),
        invitationVersion:1,
        members:[req.session.userid],
        transactions:[]
    });
    trip.save()
    .then(result => {
        User.findById(req.session.userid)
        .then(userDoc => {
            userDoc.addTrip(result._id)
            .then(() =>{
                req.session.tripid = result._id;
                req.flash('error','Trip created successfully.');
                res.redirect('/trip');
            });
        })
        .catch(err => {console.log(err);});
    })
    .catch(err => {
        console.log(err);
    });
};

exports.tripInvite = (req, res, next) => 
{
    const encryptedToken = req.params.token;
    try {
        const y = jwt.verify(encryptedToken,secretKey);
        console.log(y);
        const tripid = y.tripid; 
        const version = y.Version; 
        Trip.findById(tripid)
        .then(x => {
            if(x.invitationVersion === version)
            {
                const exists = x.members.find(member => member.equals(req.session.userid));
                if(exists)
                {
                    req.session.tripid = x._id;
                    req.flash('error','You are already added to the trip.');
                    res.redirect('/trip');
                }
                else
                {
                    x.addMember(req.session.userid)
                    .then(() => {
                        User.findById(req.session.userid)
                        .then(y => {
                            y.addTrip(tripid)
                            .then(() => {
                                req.session.tripid = x._id;
                                req.flash('error','Successfully added to the trip.');
                                res.redirect('/trip');
                            })
                            .catch(err => {console.log(err);});
                        })
                        .catch(err => {console.log(err);});
                    })
                    .catch(err => {console.log(err);});
                }
            }
            else
            {
                req.flash('error','Invitation link has been reset.');
                return res.redirect('/home');
            }
        })
        .catch(err => {console.log(err);});
    } catch (error) 
    {
        console.log(error);
    }
};

exports.resetInvite = (req, res, next) => 
{
    const tripid = detokenize(req.session,req.body.tripid);
    const adminId = detokenize(req.session,req.body.adminId);
    if(adminId.toString() === req.session.userid.toString()){
    Trip.findById(tripid)
    .then(x => {
        x.invitationVersion = x.invitationVersion+1;
        x.lastEdited = new Date();
        x.save();
        req.session.tripid = tripid;
        req.flash('error','Invitation link reset successful.');
        res.redirect('/trip');
    })
    .catch(err => {console.log(err);});
    }
    else {
        req.session.tripid = tripid;
        req.flash('error','Only trip admin can reset invitation link.');
        res.redirect('/trip');
    }
};
exports.posttrip = (req, res, next) => 
{
    req.session.tripid=detokenize(req.session,req.body.tripid);
    res.redirect('/trip');
};

exports.trip = (req, res, next) => 
{
    const tripid = req.session.tripid;
    console.log(tripid);
    Trip.findById(tripid)
    .populate('owner','name email')
    .populate('members','name email -_id')
    .then ((x) =>
    {
        const isTripAdmin = (x.owner._id.toString() == req.session.userid.toString());
        const invitation = jwt.sign({ tripid:tripid,Version:x.invitationVersion },secretKey);
        const invitationLink = `http://127.0.0.1:3000/invite/${invitation}`;
        res.render('trip',{
            errorMessage : req.flash('error'),
            userName:req.session.userName,
            name:x.name,
            adminName:x.owner.name,
            adminId:tokenize(req.session,x.owner._id),
            isTripAdmin:isTripAdmin,
            tripid:tokenize(req.session,tripid),
            members:x.members,
            invitation:invitationLink
            // transactions:x.transactions
        });
    })
    .catch(err => {console.log(err);});
};

exports.edittrip = (req, res, next) => {
    const tripid = detokenize(req.session,req.body.tripid);
    Trip.findById(tripid)
    .populate('owner','name email')
    .populate('members','name email _id')
    .then ((x) =>
    {
        const isTripAdmin = (x.owner._id.toString() == req.session.userid.toString());
        const members = [];
        if(isTripAdmin){
            for(let i in x.members)members.push({
                name:x.members[i].name,
                email:x.members[i].email,
                token:tokenize(req.session,x.members[i]._id)
            });
            res.render('edittrip',{
                userName:req.session.userName,
                name:x.name,
                adminEmail:x.owner.email,
                tripid:tokenize(req.session,tripid),
                members:members
            });
        }
        else {
            req.session.tripid=tripid;
            req.flash('error','Only trip admin can remove members.');
            res.redirect('/trip');
        }
    })
    .catch(err => {console.log(err);});
};

exports.postedittrip = (req, res, next) => {
    const tripid = detokenize(req.session,req.body.tripid);
    const memberTBD = detokenize(req.session,req.body.memberDel);

    const bothPromises = [];

    bothPromises.push(
    Trip.findById(tripid)
    .populate('transactions')
    .then(x => {
        x.removeMember(memberTBD)
        .catch(err => {console.log(err);});

        for (let i in x.transactions) 
        {
            const f = x.transactions[i].distributedAmong.find(member => memberTBD.toString()===member.toString());
            let exists=false;
            if(f)exists=true;
            if(x.transactions[i].owner.toString()===memberTBD.toString())exists=true; 
            if(exists)
            {
                bothPromises.push(
                    Transaction.findById(x.transactions[i]._id)
                    .then(y => {y.setstatus(1)})
                    .catch(err => {console.log(err);}));
            }
        }
    })
    .catch(err => {console.log(err);}));

    bothPromises.push(
    User.findById(memberTBD)
    .then(x => { 
            x.removeTrip(tripid)
            .catch(err => {console.log(err);});
    })
    .catch(err => {console.log(err);}));

    Promise.all(bothPromises)
    .then(() => {
        req.session.tripid=tripid;
        req.flash('error','Successfully Removed.');
        res.redirect('/trip');
    });
};