const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password : {
        type: String,
        required: true
    },
    verified : {
        type: Boolean,
        required: true
    },
    upiid : {
        type: String
    },
    trips : [
        {
            type : Schema.Types.ObjectId,
            ref:'Trip'
        }
    ]
});
userSchema.methods.addTrip = function(tripTBA) {
    const tripIndex = this.trips.findIndex(x => {
        return tripTBA === x;
    });
    if(tripIndex==-1)
    {
        this.trips.push(tripTBA);
    }
    return this.save();
}
userSchema.methods.removeTrip = function(tripTBR) {
    this.trips = this.trips.filter(tripId => tripId.toString() !== tripTBR.toString());
    return this.save();
}
module.exports = mongoose.model('User',userSchema);