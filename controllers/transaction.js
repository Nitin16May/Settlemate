const User = require('../models/user');
const Trip = require('../models/trip');
const Transaction = require('../models/transaction');
const tokenize = require('../utils/tokenize');
const detokenize = require('../utils/detokenize');

exports.posttransactions = (req, res, next) => {
    req.session.tripid = detokenize(req.session,req.body.tripid);
    res.redirect('/transactions');
};

exports.transactions = (req, res, next) => {
    const tripid = req.session.tripid;
    
    Trip.findById(tripid)
    .populate('transactions')
    .populate({
        path: 'transactions',
        populate: {
            path: 'owner',
            model: 'User',
            select: 'name email'
        }
    })
    .then ((x) =>
    {
        const isTripAdmin = (x.owner.toString() == req.session.userid);
        const cleanTransactions = [];
        for(let i in x.transactions)
        {
            cleanTransactions.push({
                transactionId:tokenize(req.session,x.transactions[i]._id),
                ownerId:tokenize(req.session,x.transactions[i].owner._id),
                ownerName:x.transactions[i].owner.name,
                ownerEmail:x.transactions[i].owner.email,
                currentStatus:x.transactions[i].currentStatus,
                amt:x.transactions[i].amt,
                name:x.transactions[i].name,
                lastEdited:x.transactions[i].lastEdited
            });
        }
        cleanTransactions.sort((a, b) => b.lastEdited - a.lastEdited);
        res.render('transactions',{
            errorMessage : req.flash('error'),
            name:x.name,
            isTripAdmin:isTripAdmin,
            tripid:tokenize(req.session,tripid),
            transactions:cleanTransactions,
            userName:req.session.userName
        });
    })
    .catch(err => {console.log(err);});
};

exports.addtransaction = async (req, res, next) => {
    const tripid = detokenize(req.session,req.body.tripid);
    Trip.findById(tripid)
    .populate('members','name email -_id')
    .then(x => {
        
        res.render('addtransaction', {
            userName:req.session.userName,
            name: x.name,
            tripid: tokenize(req.session,tripid),
            members: x.members
        })
    })     
    .catch(err => {console.log(err);});
};

exports.addingtransaction = (req, res, next) => {
    const tripid = detokenize(req.session,req.body.tripid);
    const members = [];
    const tripPromises = [];
    
    let ticks = req.body.ticks;
    if(ticks==undefined)
    {
        return res.redirect('/404');
    }
    if (!Array.isArray(ticks))ticks = [ticks];

    for(let i=0;i<ticks.length;i++)
    {
        tripPromises.push(
        User.findOne({email:ticks[i]})
        .then ((x) =>{members.push(x._id);})
        .catch(err => {console.log(err);}));
    }
    
    Promise.all(tripPromises)
    .then(() => {
        const transaction = new Transaction({
            name:req.body.name,
            owner:req.session.userid,
            inTrip:tripid,
            currentStatus:0,
            lastEdited:new Date(),
            amt:req.body.amt,
            distributedAmong:members
        });
        transaction.save()
        .then(result => {
            Trip.findById(tripid)
            .then(x => {
                x.addTransaction(result._id)
                .then(() => {
                    req.session.tripid = x._id;
                    req.flash('error','Transction has been added.');
                    res.redirect('/transactions');
                });
            })
            .catch(err => {
                console.log(err);
            });
        })
        .catch(err => {
            console.log(err);
        }); 
    })
    .catch(err => {console.log(err);});
};
exports.posttransaction = (req, res, next) => 
{
    req.session.transactionid = detokenize(req.session,req.body.transactionid);
    res.redirect('/transaction');
};
exports.transaction = (req, res, next) => 
{
    const transactionid = req.session.transactionid;
    Transaction.findById(transactionid)
    .populate('owner','_id name')
    .populate('inTrip','_id owner')
    .populate('distributedAmong','_id name email')
    .then(x => {
        let cleanDebts = [];
        const isTripAdmin = (req.session.userid.toString() === x.inTrip.owner._id.toString());
        const isTransactionAdmin = (req.session.userid.toString() === x.owner._id.toString());
        for(let i in x.distributedAmong)
        {
            cleanDebts.push({
                id:tokenize(req.session,x.distributedAmong[i]._id),
                name:x.distributedAmong[i].name,
                email:x.distributedAmong[i].email
            });
        }
        res.render('transaction',{
            errorMessage : req.flash('error'),
            transactionid:tokenize(req.session,transactionid),
            userName:req.session.userName,
            reason:x.name,
            amt:x.amt,
            currentStatus:x.currentStatus,
            tripid:tokenize(req.session,x.inTrip),
            ownerId:x.owner._id,
            ownerName:x.owner.name,
            isTripAdmin:isTripAdmin,
            isTransactionAdmin:isTransactionAdmin,
            debtor:cleanDebts
        });
    })
    .catch(x => {console.log(x);})
};

exports.edittransaction = (req, res, next) => {
    const transactionid = detokenize(req.session,req.body.transactionid);
    Transaction.findById(transactionid)
    .populate('owner','_id name')
    .populate('inTrip','_id owner members')
    .populate({
        path: 'inTrip',
        populate: {
            path: 'members',
            model: 'User',
            select: 'name _id email'
        }
    })
    .then(x => {
        let cleanDebts = [];
        const isTripAdmin = (req.session.userid.toString() === x.inTrip.owner._id.toString());
        const isTransactionAdmin = (req.session.userid.toString() === x.owner._id.toString());
        for(let i in x.inTrip.members)
        {
            const exists = x.distributedAmong.find(member => member.equals(x.inTrip.members[i]._id));
            let ok=false;
            if(exists)ok=true;
            cleanDebts.push({
                token:tokenize(req.session,x.inTrip.members[i]._id),
                name:x.inTrip.members[i].name,
                email:x.inTrip.members[i].email,
                isIn:ok
            });
        }
        res.render('edittransaction',{
            userName:req.session.userName,
            transactionid:tokenize(req.session,transactionid),
            reason:x.name,
            amt:x.amt,
            currentStatus:x.currentStatus,
            ownerId:x.owner._id,
            ownerName:x.owner.name,
            isTripAdmin:isTripAdmin,
            isTransactionAdmin:isTransactionAdmin,
            debtor:cleanDebts
        });
    })
    .catch(x => {console.log(x);})
};
exports.postedittransaction = (req, res, next) => {
    
    const transactionid = detokenize(req.session,req.body.transactionid);
    let debtors = req.body.debtorsToKeep;
    if(debtors===undefined)
    {
        return res.redirect('/404');
    }
    if (!Array.isArray(debtors))debtors = [debtors];
    
    const transactionPromises = [];

    transactionPromises.push(
    Transaction.findById(transactionid)
    .then(x => {
        const convertmembers = [];
        for(let i in debtors)
        {
            convertmembers.push(detokenize(req.session,debtors[i]));
        }
        x.update({membersTBA:convertmembers,name:req.body.name,amt:req.body.amt,currentStatus:req.body.currentStatus})
        .catch(err => {console.log(err);});
    })
    .catch(err => {console.log(err);}));

    Promise.all(transactionPromises)
    .then(() => {
        req.session.transactionid = transactionid;
        req.flash('error','New changes to transaction saved.');
        res.redirect('/transaction');
    })
    .catch(err => {console.log(err);});
};
