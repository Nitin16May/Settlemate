const path = require('path');
const express = require('express');

const userController = require(path.join(__dirname,'../','controllers','user'));
const tripController = require(path.join(__dirname,'../','controllers','trip'));
const transactionController = require(path.join(__dirname,'../','controllers','transaction'));
const transferController = require(path.join(__dirname,'../','controllers','transfer'));
const pdfController = require(path.join(__dirname,'../','controllers','pdf'));
const isAuth = require(path.join(__dirname,'../','utils','isauth'));
const isintrip = require(path.join(__dirname,'../','utils','isintrip'));

const router = express.Router();

router.use('/home',isAuth,userController.home);
router.get('/profile',isAuth,userController.profile);
router.post('/profile',isAuth,userController.postprofile);
router.get('/editprofile',isAuth,userController.editprofile);
router.post('/editprofile',isAuth,userController.posteditprofile);


router.use('/invite/:token',isAuth,tripController.tripInvite);

router.post('/trip',isAuth,isintrip,tripController.posttrip);
router.get('/trip',isAuth,isintrip,tripController.trip);
router.post('/edittrip',isAuth,isintrip,tripController.edittrip);
router.post('/editingtrip',isAuth,isintrip,tripController.postedittrip);
router.use('/resetinvite',isAuth,isintrip,tripController.resetInvite);
router.get('/createtrip',isAuth,isintrip,tripController.createtrip);
router.post('/createtrip',isAuth,isintrip,tripController.creatingtrip);

router.post('/transactions',isAuth,isintrip,transactionController.posttransactions);
router.get('/transactions',isAuth,isintrip,transactionController.transactions);
router.post('/addtransaction',isAuth,isintrip,transactionController.addtransaction);
router.post('/addingtransaction',isAuth,isintrip,transactionController.addingtransaction);
router.post('/transaction',isAuth,isintrip,transactionController.posttransaction);
router.get('/transaction',isAuth,isintrip,transactionController.transaction);
router.post('/edittransaction',isAuth,isintrip,transactionController.edittransaction);
router.post('/editingtransaction',isAuth,isintrip,transactionController.postedittransaction);

router.post('/transfers',isAuth,isintrip,transferController.transfers);
router.post('/generatePDF',isAuth,isintrip,pdfController.generatePDF);

router.get('/',userController.main);




module.exports = router;