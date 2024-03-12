const User = require('../models/user');

module.exports = (req,res,next) => {
    if(!req.session.isLoggedIn)
    {
        return res.redirect('/login');
    }
    User.findById(req.session.userid)
    .then(x => {
        const exists = x.trips.find(member => member.equals(req.session.tripid));
        if(!exists)
        {
            req.flash('error','You are not a member of the trip currently.');
            res.redirect("/home");
        }
    })
    .catch(err => {console.log(err);});

    next();
}