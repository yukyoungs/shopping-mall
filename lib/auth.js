var db = require('./db');
var sanitizeHtml = require('sanitize-html');

function authIsOwner(req,res){
    var name = 'Guest';
    var login = false;
    var cls = 'NON';
    if(req.session.is_logined){
        name = req.session.name;
        login = true;
        cls = req.session.cls ;
    }
    return {name,login,cls}
}

module.exports = {
    login : (req,res)=>{
        var {name, login, cls} = authIsOwner(req,res);
        var sql = `select * from boardtype;`
        var sql2 = `SELECT * FROM code;`;

        db.query(sql ,(error,results)=>{
            db.query(sql2, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'login.ejs',
                    cls : cls,
                    boardtypes : results,
                    codes : codes
                };
                req.app.render('mainFrame',context, (err, html)=>{
                    res.end(html); })
            });
        })
            
    },

    login_process : (req,res)=>{
        var post = req.body;
        var sntzedLoginid = sanitizeHtml(post.loginid);
        var sntzedPassword = sanitizeHtml(post.password);
        db.query('select count(*) as num from person where loginid = ? and password = ?',    
        [sntzedLoginid,sntzedPassword],(error, results)=>{
            if (results[0].num === 1){
                db.query('select name, class,loginid, grade from person where loginid = ? and password = ?',
                [sntzedLoginid,sntzedPassword],(error, result)=>{
                req.session.is_logined = true;
                req.session.loginid = result[0].loginid
                req.session.name = result[0].name
                req.session.cls = result[0].class
                req.session.grade = result[0].grade
                res.redirect('/');
            })
        }
        else { req.session.is_logined = false;
            req.session.name = 'Guest';
            req.session.cls = 'NON';
            return res.send('<script>alert("아이디 또는 비밀번호가 잘못되었습니다."); window.location.href="/";</script>');
        }
        })
    },
    
    logout_process : (req, res) => {
        req.session.destroy((err)=>{
            res.redirect('/');
        })
    },

    register: (req, res) => {
        var { name, login, cls } = authIsOwner(req, res);
        var sql = `select * from boardtype;`
        var sql2 = `SELECT * FROM code;`;

        db.query(sql ,(error,results)=>{
            if (login) {
                return res.redirect('/'); 
            }
            db.query(sql2, (error, codes)=>{
                var context = {
                    who: name,    
                    login: login,
                    body: 'personCU.ejs', 
                    cls: cls,
                    boardtypes : results,
                    register : true,
                    codes : codes,
                };
            
                req.app.render('mainFrame',context, (err, html)=>{
                    res.end(html);  
                });
            })
            
        });
    },
    
    
    register_process : (req,res) =>{
        var post = req.body;
        var sntzedLoginid = sanitizeHtml(post.loginid);
        var sntzedPassword = sanitizeHtml(post.password);
        var sntzedName = sanitizeHtml(post.name);
        var sntzedAddress = sanitizeHtml(post.address);
        var sntzedTel = sanitizeHtml(post.tel);
        var sntzedBirth = sanitizeHtml(post.birth);
        
        db.query('SELECT COUNT(*) AS num FROM person WHERE loginid = ? OR password = ?', 
            [sntzedLoginid, sntzedPassword], (error, results) => {
                if (error) {
                    console.error(error);
                    return res.send(`<script type='text/javascript'>alert("회원가입 중 오류가 발생했습니다."); 
                                    window.location.href='/';</script>`);
                }
            if (results[0].num > 0) {
                res.send(`<script type='text/javascript'>alert("중복된 id입니다.")
                        setTimeout("location.href='http://localhost:3000/'",1000); </script>`);
            } else {
                db.query(
                    `INSERT INTO person (loginid, password, name, address, tel, birth, class, grade)
                    VALUES (?, ?, ?, ?, ?, ?, "CST", "S")`,
                    [sntzedLoginid, sntzedPassword, sntzedName, sntzedAddress, sntzedTel, sntzedBirth],
                    (error, result) => {
                        if (error) {
                            console.error(error);
                            return res.send(`<script type='text/javascript'>alert("회원가입 중 오류가 발생했습니다."); 
                                            window.location.href='/';</script>`);
                        }
                        res.redirect('/');
                    });
            }
        });
    },
}