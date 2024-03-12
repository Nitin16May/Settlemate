const Trip = require('../models/trip');
const tokenize = require('../utils/tokenize');
const detokenize = require('../utils/detokenize');
const {PriorityQueue} = require('@datastructures-js/priority-queue');

exports.transfers = (req, res, next) => 
{
    const tripid = detokenize(req.session,req.body.tripid);
    const data = new Map();
    const net = new Map();
    Trip.findById(tripid)
    .select('transactions members')
    .populate({
            path: 'transactions',
            select: '_id owner currentStatus amt distributedAmong'
    })
    .populate({
        path: 'members',
        select: '_id name email upiid'
    })
    .then(x => {
        for(let i in x.members)
        {
            token = tokenize(req.session,x.members[i]._id);
            data.set(token,{
                id:token,
                name:x.members[i].name,
                email:x.members[i].email,
                upiid:x.members[i].upiid
            });
            net.set(token,0);
        }
        for(let i in x.transactions)
        {
            let a,token,div;
            if(x.transactions[i].currentStatus==0)
            {
                token = tokenize(req.session,x.transactions[i].owner);
                a = net.get(token);
                net.set(token,a-x.transactions[i].amt);
                div = x.transactions[i].distributedAmong.length;
                for(let j in x.transactions[i].distributedAmong)
                {
                    token = tokenize(req.session,x.transactions[i].distributedAmong[j]);
                    a = net.get(token);
                    net.set(token,a+x.transactions[i].amt/div);
                }
            }
        }
        const senders = new PriorityQueue((a, b) => {
            if (a.amt > b.amt) return 1;
            return -1;
          }
        );
        const receivers = new PriorityQueue((a, b) => {
            if (a.amt > b.amt) return 1;
            return -1;
          }
        );
        net.forEach (function(value, key) 
        {
            if(value<0)receivers.enqueue({amt:value,who:key});
            if(value>0)senders.enqueue({amt:value,who:key});
        });
        const payments = [];
        while(!senders.isEmpty() && !receivers.isEmpty())
        {
            let s = senders.dequeue();
            let r = receivers.dequeue();
            let sd=s.who;
            let rd=r.who;
            let sa=s.amt;
            let ra=r.amt;ra=ra*-1;
            if(ra==sa)payments.push({sender:data.get(sd),amt:sa,receiver:data.get(rd)});
            else if(ra>sa)
            {
                payments.push({sender:data.get(sd),amt:sa,receiver:data.get(rd)});
                receivers.enqueue({amt:sa-ra,who:rd});
            }
            else
            {
                payments.push({sender:data.get(sd),amt:ra,receiver:data.get(rd)});
                senders.enqueue({amt:sa-ra,who:sd});
            }
        }
        res.render('transfers',{
            payments:payments,
            tripid:tokenize(req.session,tripid),
            userName:req.session.userName
        });
    })
    .catch(err => {console.log(err);});
};

