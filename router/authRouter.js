const express = require('express');
var router = express.Router()

var auth = require('../lib/auth');

router.get('/login',(req, res)=>{
    auth.login(req, res);
});

router.post('/login_process',(req, res)=>{
    auth.login_process(req, res);
});

router.get('/logout_process',(req,res)=>{
    auth.logout_process(req,res);
});

router.get('/register',(req, res) =>{
    auth.register(req,res);
});

router.post('/register_process',(req,res)=>{
    auth.register_process(req,res);
})

module.exports = router;