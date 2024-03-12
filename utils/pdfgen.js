const User = require('../models/user');
const Trip = require('../models/trip');
const Transaction = require('../models/transaction');
const PDFDocument = require('pdfkit');
const {PriorityQueue} = require('@datastructures-js/priority-queue');

function buildPDF(tripid,dataCallback,endCallback) 
{
    Trip.findById(tripid)
    .populate({
    path: 'owner',
    select: '_id name email'
    })
    .populate({
    path: 'transactions',
    select: 'owner name currentStatus amt distributedAmong'
    })
    .populate({
    path: 'members',
    select: '_id name email upiid'
    })
    .then(x => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
              top: 20,
              bottom: 20,
              left: 20,
              right: 20
            }
          });
        doc.on('data',dataCallback);
        doc.on('end',endCallback);
        doc
        .fontSize(30)
        .text(x.name);
        doc
        .fontSize(15)
        .text('Mananged By : '+x.owner.name + ' | ' + x.owner.email);
        doc.moveDown();
        let tripcost=0;
        for(let i in x.transactions)
        {
            tripcost=tripcost+x.transactions[i].amt;
        }
        doc
        .fontSize(15)
        .text('Total Trip Expense : '+tripcost);
        doc.moveDown();
        doc
        .fontSize(15)
        .text('Members : ');
        const data = new Map();
        const net = new Map();
        for(let i in x.members)
        {
            doc
            .fontSize(15)
            .text(' - '+x.members[i].name + ' | ' + x.members[i].email);
            let token = x.members[i]._id.toString();;
            data.set(token,{
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
                token = x.transactions[i].owner.toString();;
                a = net.get(token);
                net.set(token,a-x.transactions[i].amt);
                div = x.transactions[i].distributedAmong.length;
                for(let j in x.transactions[i].distributedAmong)
                {
                    token = x.transactions[i].distributedAmong[j].toString();
                    a = net.get(token);
                    net.set(token,a+x.transactions[i].amt/div);
                }
            }
        }
        doc.addPage();
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

        doc
        .fontSize(30)
        .text('Minimum Count of Transfers to Settle Up');
        doc.moveDown();
        let tn=1;
        for(let i in payments)
        {
            doc
            .fontSize(20)
            .text('Transfer '+tn);
            tn=tn+1;

            doc
            .fontSize(15)
            .text('Sender : '+payments[i].sender.name+' | '+payments[i].sender.email);

            doc
            .fontSize(15)
            .text('Amount : '+payments[i].amt);

            doc
            .fontSize(15)
            .text('Recceiver : '+payments[i].receiver.name+' | '+payments[i].receiver.email);

            doc
            .fontSize(15)
            .text('UPI ID : '+payments[i].receiver.upiid);

            doc.moveDown();
        }
        for(let i in x.members)
        {
            doc.addPage();
            doc
            .fontSize(30)
            .text(x.members[i].name+' | '+x.members[i].email);
            doc.moveDown();
            let usercost=0;
            let lended=0;
            for(let j in x.transactions)
            {
                if(x.transactions[j].currentStatus==0)
                {
                    const exists = x.transactions[j].distributedAmong.find(tr => tr.toString()===x.members[i]._id.toString());
                    if(exists)
                    {
                        let div = x.transactions[j].distributedAmong.length;
                        if(x.members[i]._id.toString()===x.transactions[j].owner.toString())
                        {
                            lended = lended + x.transactions[j].amt - x.transactions[j].amt / div;
                            usercost = usercost + x.transactions[j].amt;
                        }
                        else
                        {
                            usercost = usercost + x.transactions[j].amt/div;
                        }
                    }
                    else if(x.members[i]._id.toString()===x.transactions[j].owner.toString())
                    {
                        lended = lended+ x.transactions[j].amt;
                    }
                }
            }
            usercost=usercost.toFixed(2);
            lended=lended.toFixed(2);
            doc
            .fontSize(15)
            .text('Your Total Expense : '+usercost);
            doc.moveDown();
            doc
            .fontSize(15)
            .text('Your Total Reimbursement : '+lended);
            doc.moveDown();
            doc
            .fontSize(15)
            .text('Distribution : ');
            doc.moveDown();
            for(let j in x.transactions)
            {
                if(x.transactions[j].currentStatus==0)
                {
                    const exists = x.transactions[j].distributedAmong.find(tr => tr.toString()===x.members[i]._id.toString());
                    if(exists)
                    {
                        let div = x.transactions[j].distributedAmong.length;
                        if(x.members[i]._id.toString()===x.transactions[j].owner.toString())
                        {
                            let netamount = (x.transactions[j].amt).toFixed(2);
                            let netamount1 = (x.transactions[j].amt/div).toFixed(2);
                            doc
                            .fontSize(15)
                            .text(' + '+netamount+ ' due to ' + x.transactions[j].name);
                            doc
                            .fontSize(15)
                            .text(' - '+netamount1+ ' due to ' + x.transactions[j].name);
                        }
                        else
                        {
                            doc
                            .fontSize(15)
                            .text(' - '+(x.transactions[j].amt/div).toFixed(2)+ ' due to ' + x.transactions[j].name);
                        }
                    }
                    else if(x.members[i]._id.toString()===x.transactions[j].owner.toString())
                    {
                        let netamount=(x.transactions[j].amt).toFixed(2);
                        doc
                        .fontSize(15)
                        .text(' + '+netamount+ ' due to ' + x.transactions[j].name);
                    }
                }
            }
        }
        doc.addPage();
        doc
        .fontSize(30)
        .text('Active Transactions');
        doc.moveDown();
        for(let i in x.transactions)
        {
            if(x.transactions[i].currentStatus===0)
            {
                doc
                .fontSize(15)
                .text('Added & Payed By : '+ data.get(x.transactions[i].owner.toString()).name + ' | ' + data.get(x.transactions[i].owner.toString()).email);
                doc
                .fontSize(15)
                .text('Amount : '+ x.transactions[i].amt);
                doc
                .fontSize(15)
                .text('Reason : '+ x.transactions[i].name);
                doc
                .fontSize(15)
                .text('Distributed Amoung : ');
                for(let j in x.transactions[i].distributedAmong)
                {
                    doc
                    .fontSize(15)
                    .text(' - ' + data.get(x.transactions[i].distributedAmong[j].toString()).name + ' | ' + data.get(x.transactions[i].distributedAmong[j].toString()).email);
                }
                doc.moveDown();
                doc.moveDown();
            }
        }doc.addPage();
        doc
        .fontSize(30)
        .text('Removed Transactions');
        doc.moveDown();
        for(let i in x.transactions)
        {
            if(x.transactions[i].currentStatus===1)
            {
                doc
                .fontSize(15)
                .text('Added & Payed By : '+ data.get(x.transactions[i].owner.toString()).name + ' | ' + data.get(x.transactions[i].owner.toString()).email);
                doc
                .fontSize(15)
                .text('Amount : '+ x.transactions[i].amt);
                doc
                .fontSize(15)
                .text('Reason : '+ x.transactions[i].name);
                doc
                .fontSize(15)
                .text('Distributed Amoung : ');
                for(let j in x.transactions[i].distributedAmong)
                {
                    doc
                    .fontSize(15)
                    .text(' - ' + data.get(x.transactions[i].distributedAmong[j].toString()).name + ' | ' + data.get(x.transactions[i].distributedAmong[j].toString()).email);
                }
                doc.moveDown();
                doc.moveDown();
            }
        }doc.addPage();
        doc
        .fontSize(30)
        .text('Admin Removed Transactions');
        doc.moveDown();
        for(let i in x.transactions)
        {
            if(x.transactions[i].currentStatus===2)
            {
                doc
                .fontSize(15)
                .text('Added & Payed By : '+ data.get(x.transactions[i].owner.toString()).name + ' | ' + data.get(x.transactions[i].owner.toString()).email);
                doc
                .fontSize(15)
                .text('Amount : '+ x.transactions[i].amt);
                doc
                .fontSize(15)
                .text('Reason : '+ x.transactions[i].name);
                doc
                .fontSize(15)
                .text('Distributed Amoung : ');
                for(let j in x.transactions[i].distributedAmong)
                {
                    doc
                    .fontSize(15)
                    .text(' - ' + data.get(x.transactions[i].distributedAmong[j].toString()).name + ' | ' + data.get(x.transactions[i].distributedAmong[j].toString()).email);
                }
                doc.moveDown();
                doc.moveDown();
            }
        }
        doc.end();
    })
    .catch(err => {console.log(err)});
}

module.exports = {buildPDF};
