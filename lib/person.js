var db = require('./db');
const path = require('path');
var sanitizeHtml = require('sanitize-html');

function authIsOwner(req,res){
    var name = 'Guest';
    var login = false;
    var cls = 'NON';
    if(req.session.is_logined){
        name = req.session.name;
        login = true;
        cls = req.session.cls;
    }
    return {name,login,cls}
}


module.exports = {
    view : (req,res)=>{
        var {login, name, cls} = authIsOwner(req,res)

        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        var sql1 = `select * from boardtype;`
        var sql2 = ` select * from person;`
        var sql3 = `SELECT * FROM code;`;

        db.query(sql1 + sql2 ,(error,results)=>{
            db.query(sql3, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'person.ejs',
                    cls : cls,
                    grade : 'S',
                    boardtypes : results[0],
                    persons: results[1],
                    codes : codes
                };

                req.app.render('mainFrame', context, (err, html) => {
                    if(err){
                        throw err;
                    }
                    res.end(html);  });
                })
            
        });
    },

    create : (req,res)=>{
        var {login, name, cls} = authIsOwner(req,res)
        var sql1 = `SELECT class FROM person;`
        var sql2 = `SELECT grade FROM person;`
        var sql3 = `SELECT * from boardtype;`
        var sql4 = `SELECT * FROM code;`;


        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        db.query(sql1 + sql2 + sql3, (error, results) => {
            db.query(sql4, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'personCU.ejs',
                    cls : cls,
                    grade : 'S',
                    editing: false,
                    register: false,
                    personClass: results[0],
                    personGrade: results[1],
                    boardtypes : results[2],
                    codes : codes
                };
                req.app.render('mainFrame', context, (err, html) => {
                    if(err){
                        throw err;
                    }
                    res.end(html);
                });
            })
            
        });
    },

    create_process: (req, res) => {
        var person = req.body;
        var sntzedLoginId = sanitizeHtml(person.loginid);
        var sntzedPassword = sanitizeHtml(person.password);
        var sntzedName = sanitizeHtml(person.name);
        var sntzedAddress = sanitizeHtml(person.address);
        var sntzedTel = sanitizeHtml(person.tel);
        var sntzedBirth = sanitizeHtml(person.birth);
        var sntzedClass = sanitizeHtml(person.class);
        var sntzedGrade = sanitizeHtml(person.grade);
    
        db.query('SELECT COUNT(*) AS num FROM person WHERE loginid = ?', 
            [sntzedLoginId], (error, persons) => {
                if (error) {
                    console.error(error);
                    return res.send(`<script type='text/javascript'>alert("코드 추가 중 오류가 발생했습니다."); 
                                    window.location.href='/person/create';</script>`);
                }
                if (persons[0].num > 0) {
                    res.send(`<script type='text/javascript'>alert("중복된 코드입니다."); 
                    setTimeout("location.href='/person/create'", 1000);
                    </script>`);
                } else {
                    db.query(
                        `INSERT INTO person (loginid, password, name, address, tel, birth, class, grade)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [sntzedLoginId, sntzedPassword, sntzedName, sntzedAddress, sntzedTel, sntzedBirth, sntzedClass, sntzedGrade],
                        (error, result) => {
                            if (error) {
                                console.error(error);
                                return res.send(`<script type='text/javascript'>alert("코드 추가 중 오류가 발생했습니다."); 
                                                window.location.href='/person/create';</script>`);
                            }
                            res.redirect('/person/view');
                        });
                }
            });
    },

    update: (req, res) => {
        var { login, name, cls } = authIsOwner(req, res);
    
        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        var sql = `SELECT * FROM person WHERE loginid = ?`;
        var sql2 = `SELECT * FROM code;`;

        var sntzedLoginId = sanitizeHtml(req.params.loginId);

        db.query(`select * from boardtype`,(err,result) => {
            db.query(sql, [sntzedLoginId], (error, results) => {
                if(error) {
                    throw error;
                }
                if (results.length === 0) {
                    return res.send("<script>alert('수정할 데이터가 없습니다.'); window.location.href='/code/view';</script>");
                }
                db.query(sql2, (error, codes)=>{
                    var person = results[0];
                    var context = {
                        who: name,
                        login: login,
                        cls: cls,
                        grade: 'S',
                        body: 'personCU.ejs',
                        editing: true,
                        register: false,
                        boardtypes: result,
                        person: person,
                        codes:codes
                    };
                    req.app.render('mainFrame', context, (err, html) => {
                        if (err) {
                            throw err;
                        }
                        res.end(html);
                    });
                })
                
            });
        });
    },

    update_process: (req, res) => {
        var person = req.body;
        var sntzedLoginId = sanitizeHtml(person.loginid);
        var sntzedPassword = sanitizeHtml(person.password);
        var sntzedName = sanitizeHtml(person.name);
        var sntzedAddress = sanitizeHtml(person.address);
        var sntzedTel = sanitizeHtml(person.tel);
        var sntzedBirth = sanitizeHtml(person.birth);
        var sntzedClass = sanitizeHtml(person.class);
        var sntzedGrade = sanitizeHtml(person.grade);
    
        db.query(
            `UPDATE person SET password = ?, name = ?, address = ?, tel = ?, birth = ?, class = ?, grade = ? WHERE loginid = ?`,
            [sntzedPassword, sntzedName, sntzedAddress, sntzedTel, sntzedBirth, sntzedClass, sntzedGrade, sntzedLoginId],
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.send(`<script type='text/javascript'>alert("고객 수정 중 오류가 발생했습니다."); 
                                    window.location.href='/person/update';</script>`);
                }
                res.redirect('/person/view');
            }
        );
    },    

    delete_process : (req,res)=>{
        var sntzedLoginId = sanitizeHtml(req.params.loginId);

        db.query(`DELETE FROM person WHERE loginid = ?`, 
            [sntzedLoginId], (error, result) => {
                if (error) {
                    return res.send(`<script>alert('고객 삭제 중 오류가 발생했습니다.'); window.location.href='/person/view';</script>`);
                }
                res.writeHead(302, { Location: `/person/view` });
                res.end();  
            });
    }
}