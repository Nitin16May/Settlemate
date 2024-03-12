const path = require('path');
const express = require('express');

const authController = require(path.join(__dirname,'../','controllers','auth'));

const router = express.Router();

router.get('/signup',authController.getsignup);
router.post('/signup',authController.postsignup);
router.get('/login',authController.getlogin);
router.post('/login',authController.postlogin);
router.post('/logout',authController.logout);
router.use('/verify/:id',authController.verify);
router.get('/sendreset',authController.sendreset);
router.post('/sendreset',authController.sendingreset);
router.get('/reset/:id',authController.reset);
router.post('/resetting',authController.resetting);

module.exports = router;