const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tripSchema = new Schema({
    name : {
        type : String,
        required : true
    },
    owner: {
        type : Schema.Types.ObjectId,
        ref:'User',
        required : true
    },
    invitationVersion:{
        type:Number,
        required:true
    },
    lastEdited : {
        type : Date,
        required : true
    },
    members : [
        {
            type : Schema.Types.ObjectId,
            ref:'User'
        }
    ],
    transactions : [
        {
            type : Schema.Types.ObjectId,
            ref:'Transaction'
        }
    ]
});
tripSchema.methods.addTransaction = function(transactionTBA) 
{
    this.transactions.push(transactionTBA);
    this.lastEdited=new Date();
    return this.save();
}
tripSchema.methods.addMember = function(memberTBA) 
{
    this.members.push(memberTBA);
    this.lastEdited=new Date();
    return this.save();
}
tripSchema.methods.removeMember = function(memberTBR) {
    this.lastEdited = new Date();
    this.members = this.members.filter(member => member.toString() !== memberTBR.toString());
    return this.save();
}
module.exports = mongoose.model('Trip',tripSchema);