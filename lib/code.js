var db = require('./db');
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
        var sql2 = ` select * from code;`

        db.query(sql1 + sql2, (error, results) => {
            var context = {
                who : name,
                login : login,
                body : 'code.ejs',
                cls : cls,
                boardtypes : results[0],
                codes: results[1]
            };

            req.app.render('mainFrame', context, (err, html) => {
                if(err){
                    throw err;
                }
                res.end(html);
            });
        });
    },
    
    create : (req,res)=>{
        var {login, name, cls} = authIsOwner(req,res)
        var sql1 = `select * from boardtype;`
        var sql2 = `SELECT * FROM code;`;


        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        db.query(sql1, (error, results)=>{
            db.query(sql2, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'codeCU.ejs',
                    cls : cls,
                    editing: false,
                    boardtypes : results,
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
        var code = req.body;
        var sntzedMainId = sanitizeHtml(code.main_id);
        var sntzedSubId = sanitizeHtml(code.sub_id);
        var sntzedMainName = sanitizeHtml(code.main_name);
        var sntzedSubName = sanitizeHtml(code.sub_name);
        var sntzedStart = sanitizeHtml(code.start);
        var sntzedEnd = sanitizeHtml(code.end);
        
        db.query('SELECT COUNT(*) AS num FROM code WHERE main_id = ? AND sub_id = ? AND start = ?', 
            [sntzedMainId, sntzedSubId, sntzedStart], (error, codes) => {
                if (error) {
                    console.error(error);
                    return res.send(`<script type='text/javascript'>alert("코드 추가 중 오류가 발생했습니다."); 
                                    window.location.href='/code/create';</script>`);
                }
                if (codes[0].num > 0) {
                    res.send(`<script type='text/javascript'>alert("중복된 코드입니다."); 
                    setTimeout("location.href='/code/create'", 1000);
                    </script>`);
                } else {
                    db.query(
                        `INSERT INTO code (main_id, sub_id, main_name, sub_name, start, end)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [sntzedMainId, sntzedSubId, sntzedMainName, sntzedSubName, sntzedStart, sntzedEnd],
                        (error, result) => {
                            if (error) {
                                console.error(error);
                                return res.send(`<script type='text/javascript'>alert("코드 추가 중 오류가 발생했습니다."); 
                                                window.location.href='/code/create';</script>`);
                            }
                            res.redirect('/code/view');
                        });
                }
            });
    },
    

    update: (req, res) => {
        var {login, name, cls} = authIsOwner(req,res)

        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        var sntzedMainId = sanitizeHtml(req.params.main); 
        var sntzedSubId = sanitizeHtml(req.params.sub); 
        var sntzedStart = sanitizeHtml(req.params.start); 

        var sql1 = `select * from boardtype`;
        var sql2 = `SELECT * FROM code WHERE main_id = ? AND sub_id = ? AND start = ?`;
        var sql3 = `SELECT * FROM code;`;

        db.query(sql1,(err,result) => {
            db.query(sql2, [sntzedMainId, sntzedSubId, sntzedStart], (error, results) => {
                if(error) {
                    throw error;
                }
                if (results.length === 0) {
                    return res.send("<script>alert('수정할 데이터가 없습니다.'); window.location.href='/code/view';</script>");
                }
                db.query(sql3, (error, codes)=>{
                    var topicData = results[0];
                    var context = {
                        who: name,
                        login: login,
                        body: 'codeCU.ejs',
                        cls: cls,
                        code: topicData,
                        editing: true,
                        main_id: topicData.main_id,
                        sub_id: topicData.sub_id,
                        start: topicData.start,
                        boardtypes : result,
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

    update_process : (req,res)=>{
        var code = req.body;
        var sntzedMainId = sanitizeHtml(code.main);
        var sntzedSubId = sanitizeHtml(code.sub);
        var sntzedMainName = sanitizeHtml(code.main_name);
        var sntzedSubName = sanitizeHtml(code.sub_name);
        var sntzedStart = sanitizeHtml(code.start);
        var sntzedEnd = sanitizeHtml(code.end);

        db.query(`UPDATE code SET main_name = ?, sub_name = ?, end = ? WHERE main_id = ? AND sub_id = ? AND start = ?`,
            [sntzedMainName, sntzedSubName, sntzedEnd, sntzedMainId, sntzedSubId, sntzedStart], (error, result) => {
                if(error) {
                    throw error;
                }
                res.writeHead(302, { Location: `/code/view` });
                res.end();            
            }
        );
    },
    
    delete_process : (req,res)=>{
        var sntzedMainId = sanitizeHtml(req.params.main);
        var sntzedSubId = sanitizeHtml(req.params.sub);
        var sntzedStart = sanitizeHtml(req.params.start);
    
        db.query(`DELETE FROM code WHERE main_id = ? AND sub_id = ? AND start = ?`, 
            [sntzedMainId, sntzedSubId, sntzedStart], (error, result) => {
                if (error) {
                    return res.send(`<script>alert('코드 삭제 중 오류가 발생했습니다.'); window.location.href='/code/view';</script>`);
                }
                res.writeHead(302, { Location: `/code/view` });
                res.end();  
            });
    }
}