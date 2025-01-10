var db = require('./db');
var sanitizeHtml = require('sanitize-html');

function authIsOwner(req, res) {
    var name = 'Guest';
    var login = false;
    var cls = 'NON';
    var loginId = '';
    if (req.session.is_logined) {
        name = req.session.name;
        login = true;
        cls = req.session.cls;
        loginId = req.session.loginid;
    }
    return { loginId, name, login, cls };
}

function authCheck(cls, requiredRole, res, redirectUrl = '/') {
    if (cls !== requiredRole) {
        res.send(`<script>alert('권한이 없습니다.'); window.location.href='${redirectUrl}';</script>`);
        return false;
    }
    return true;
}

function handleError(res, message, redirectUrl = '/') {
    res.send(`<script>alert('${message}'); window.location.href='${redirectUrl}';</script>`);
}

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

function renderPage(req, res, template, context) {
    req.app.render(template, context, (err, html) => {
        if (err) {
            console.error(err);
            handleError(res, '페이지 렌더링 중 오류가 발생했습니다.');
        } else {
            res.end(html);
        }
    });
}

async function fetchCommonData() {
    const boardtypes = await runQuery('SELECT * FROM boardtype');
    const codes = await runQuery('SELECT * FROM code');
    return { boardtypes, codes };
}

module.exports = {
    typeview: async (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
        if (!authCheck(cls, 'MNG', res)) return;

        try {
            const { boardtypes, codes } = await fetchCommonData();
            const context = { who: name, login, body: 'boardtype.ejs', cls, boardtypes, codes };
            renderPage(req, res, 'mainFrame', context);
        } catch (error) {
            handleError(res, '데이터 조회 중 오류가 발생했습니다.');
        }
    },

    typecreate: async (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
        if (!authCheck(cls, 'MNG', res)) return;

        try {
            const { boardtypes, codes } = await fetchCommonData();
            const context = { who: name, login, body: 'boardtypeCU.ejs', cls, editing: false, boardtypes, codes };
            renderPage(req, res, 'mainFrame', context);
        } catch (error) {
            handleError(res, '데이터 조회 중 오류가 발생했습니다.');
        }
    },

    typecreate_process: async (req, res) => {
        const { type_id, title, description, numPerPage, write_YN, re_YN } = req.body;
        const sanitizedData = [type_id, title, description, numPerPage, write_YN, re_YN].map(sanitizeHtml);

        try {
            const existingCount = await runQuery('SELECT COUNT(*) AS num FROM boardtype WHERE type_id = ?', [sanitizedData[0]]);
            if (existingCount[0].num > 0) {
                return handleError(res, '중복된 게시판 종류입니다.', '/board/type/create');
            }

            await runQuery(
                `INSERT INTO boardtype (title, description, numPerPage, write_YN, re_YN) VALUES (?, ?, ?, ?, ?)`,
                sanitizedData.slice(1)
            );
            res.redirect('/board/type/view');
        } catch (error) {
            handleError(res, '게시판 종류 추가 중 오류가 발생했습니다.', '/board/type/create');
        }
    },

    typeupdate: async (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
        const sanitizedTypeId = sanitizeHtml(req.params.typeId);
        if (!authCheck(cls, 'MNG', res)) return;

        try {
            const { boardtypes, codes } = await fetchCommonData();
            const boardtype = await runQuery('SELECT * FROM boardtype WHERE type_id = ?', [sanitizedTypeId]);
            if (!boardtype.length) {
                return handleError(res, '수정할 데이터가 없습니다.', '/board/type/view');
            }

            const context = { who: name, login, body: 'boardtypeCU.ejs', cls, editing: true, boardtype: boardtype[0], boardtypes, codes };
            renderPage(req, res, 'mainFrame', context);
        } catch (error) {
            handleError(res, '데이터 조회 중 오류가 발생했습니다.', '/board/type/view');
        }
    },

    typeupdate_process: async (req, res) => {
        const { type_id, title, description, numPerPage, write_YN, re_YN } = req.body;
        const sanitizedData = [title, description, numPerPage, write_YN, re_YN, sanitizeHtml(type_id)];

        try {
            await runQuery(
                `UPDATE boardtype SET title = ?, description = ?, numPerPage = ?, write_YN = ?, re_YN = ? WHERE type_id = ?`,
                sanitizedData
            );
            res.redirect('/board/type/view');
        } catch (error) {
            handleError(res, '게시판 종류 수정 중 오류가 발생했습니다.', `/board/type/update/${sanitizedData[5]}`);
        }
    },

    typedelete_process: async (req, res) => {
        const sanitizedTypeId = sanitizeHtml(req.params.typeId);

        try {
            await runQuery(`DELETE FROM boardtype WHERE type_id = ?`, [sanitizedTypeId]);
            res.redirect('/board/type/view');
        } catch (error) {
            handleError(res, '게시판 종류 삭제 중 오류가 발생했습니다.', '/board/type/view');
        }
    },

    view: (req, res) => {
        var { login, name, cls } = authIsOwner(req, res);
        var sntzedTypeId = sanitizeHtml(req.params.typeId);
        var pNum = req.params.pNum;
    
        // 첫 번째 쿼리: 모든 boardtype을 가져옴
        var sql1 = `SELECT * FROM boardtype;`;
        db.query(sql1, (error, boardtypes) => {
            if (error) {
                console.error("Error fetching boardtype data:", error);
                return res.send("<script>alert('게시판 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
            }
    
            // 두 번째 쿼리: 특정 type_id에 해당하는 boardtype을 가져옴
            var sql2 = `SELECT * FROM boardtype WHERE type_id = ?;`;
            db.query(sql2, [sntzedTypeId], (error, boardTypeResult) => {
                if (error || boardTypeResult.length === 0) {
                    console.error("Error fetching specific boardtype:", error);
                    return res.send("<script>alert('특정 게시판 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                }
    
                var numPerPage = boardTypeResult[0].numPerPage;
    
                // 세 번째 쿼리: 총 게시물 수를 가져옴
                var sql3 = `SELECT COUNT(*) AS total FROM board WHERE type_id = ?;`;
                db.query(sql3, [sntzedTypeId], (error, countResult) => {
                    if (error) {
                        console.error("Error fetching board count:", error);
                        return res.send("<script>alert('게시물 수 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                    }
    
                    var offs = (pNum - 1) * numPerPage;
                    var totalPages = Math.ceil(countResult[0].total / numPerPage);
    
                    // 네 번째 쿼리: 특정 type_id에 해당하는 게시물 목록을 가져옴
                    var sql4 = `SELECT b.board_id AS board_id, b.title AS title, b.date AS date, p.name AS name 
                                FROM board b 
                                INNER JOIN person p ON b.loginid = p.loginid 
                                WHERE b.type_id = ? AND b.p_id = ?
                                ORDER BY date DESC, board_id DESC 
                                LIMIT ? OFFSET ?`;
                    
                    db.query(sql4, [sntzedTypeId, 0, numPerPage, offs], (err, boards) => {
                        if (err) {
                            console.error("Error fetching board data:", err);
                            return res.send("<script>alert('게시물 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                        }
    
                        // 다섯 번째 쿼리: 코드 데이터를 가져옴
                        var sql5 = `SELECT * FROM code;`;
                        db.query(sql5, (error, codes) => {
                            if (error) {
                                console.error("Error fetching codes:", error);
                                return res.send("<script>alert('코드 데이터 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                            }
    
                            // 모든 데이터를 context로 전달하여 렌더링
                            var context = {
                                who: name,
                                login: login,
                                cls: cls,
                                body: 'board.ejs',
                                boards: boards,
                                boardtypes: boardtypes,
                                boardTypeTitle: boardTypeResult[0].title,
                                boardTypeId: boardTypeResult[0].type_id,
                                totalPages: totalPages,
                                pNum: pNum,
                                codes: codes,
                            };
                            console.log("Context:", context); // 렌더링 전 context 객체 내용 확인

                            req.app.render('mainFrame', context, (err, html) => {
                                if (err) {
                                    console.error("Error rendering page:", err);
                                    return res.send("<script>alert('페이지 렌더링 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                                }
                                res.end(html);
                            });
                        });
                    });
                });
            });
        });
    },
    

    create: (req, res) => {
        var { loginId, login, name, cls } = authIsOwner(req, res);
        var sntzedTypeId = sanitizeHtml(req.params.typeId);
        var sql1 = `SELECT * FROM boardtype;`; 
        var sql2 = `SELECT * FROM boardtype WHERE type_id = ${sntzedTypeId};`; 
        var sql3 = `SELECT * FROM code;`;


        db.query(sql1+ sql2,[sntzedTypeId], (error, results) => {
            if (error) {
                console.error(error);
                return res.send("<script>alert('게시판 조회 중 오류가 발생했습니다.'); window.location.href='/';</script>");
            }
            db.query(sql3, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'boardCRU.ejs',
                    cls : cls,
                    boardtypes : results[0],
                    boardtype : results[1],
                    title : 'create',
                    loginId : loginId,
                    writeYN: results[1][0].write_YN,
                    codes:codes,
                };

                req.app.render('mainFrame', context, (err, html) => {
                    if (err) {
                        console.error(err);
                        return res.send("<script>alert('페이지 렌더링 중 오류가 발생했습니다.'); window.location.href='/';</script>");
                    }
                    res.end(html);
                });
            })

            
        });
    },    

    dateOfEightDigit : ()=>{
        var today = new Date();
        var year = String(today.getFullYear());
        var month ;
        var day ;
        var hour;
        var minute;
        var second;
        if (today.getMonth() < 9)
            month = "0" + String(today.getMonth()+1);
        else
            month = String(today.getMonth()+1);

        if (today.getDate() < 10)
            day = "0" + String(today.getDate());
        else
            day = String(today.getDate());

        hour = String(today.getHours());
        minute = String(today.getMinutes());
        second = String(today.getSeconds());

        return year +"." + month + "." + day + " : " + hour + "시 " + minute + "분 " + second + "초";
    },

    create_process: (req, res) => {
        var board = req.body;
        var sntzedTypeId = sanitizeHtml(board.type_id);
        var sntzedTitle = sanitizeHtml(board.title);
        var sntzedContent = sanitizeHtml(board.content);
        var sntzedPassword = sanitizeHtml(board.password);
        var sntzedDate = require('./board').dateOfEightDigit(); 
        var sntzedLoginId = sanitizeHtml(req.session.loginid);
    
        var sql1 = `SELECT * FROM boardtype;`;
        var sql2 = `SELECT * FROM boardtype WHERE type_id = '${sntzedTypeId}';`;
        var sql3 = `SELECT COUNT(*) AS total FROM board WHERE type_id = '${sntzedTypeId}';`;
        
        db.query(sql1 + sql2 + sql3, (error, results) => {
            if (error) {
                console.error(error);
                return res.send(`<script type='text/javascript'>alert("게시물 추가 중 오류가 발생했습니다."); 
                    window.location.href='/board/create/${sntzedTypeId}';</script>`);
            }
            db.query(
                `INSERT INTO board (type_id, p_id, title, content, date, loginid, password)
                VALUES (?, 0, ?, ?, ?, ?, ?)`,
                [sntzedTypeId, sntzedTitle, sntzedContent, sntzedDate, sntzedLoginId, sntzedPassword],
                (insertError, insertResult) => {
                    if (insertError) {
                        console.error(insertError);
                        return res.send(`<script type='text/javascript'>alert("게시물 저장 중 오류가 발생했습니다.");
                            window.location.href='/board/create/${sntzedTypeId}';</script>`);
                    }
                    res.redirect(`/board/view/${sntzedTypeId}/1`);
                }
            );
        });
    },

    detail: (req, res) => {
        var { loginId, name, login, cls } = authIsOwner(req, res);
        var sntzedboardId = sanitizeHtml(req.params.boardId);
        var pNum = sanitizeHtml(req.params.pNum);
        var sql1 = 'SELECT * FROM boardtype;';
        var sql2 = 'SELECT * FROM board LEFT JOIN person ON board.loginid = person.loginid WHERE board_id = ?;';
        var sql3 = `SELECT * FROM code;`;

        
        db.query(sql1 + sql2, [sntzedboardId], (err, results) => {
            if (err) throw err;
            
            db.query(sql3, (error, codes)=>{
                var context = {
                    who: name,
                    login: login,
                    body: 'boardCRU.ejs',
                    cls: cls,
                    boardtypes: results[0],
                    boardjoin: results[1],
                    loginId: loginId,
                    title: 'detail',
                    pNum: pNum,
                    codes:codes,
                };
                res.render('mainFrame', context, (err, html) => {
                    res.end(html);
                });
            });
        })
           
    },

    update : (req, res) => {
        var {loginId, name, login, cls} = authIsOwner(req, res);
        var sntzedboardId = sanitizeHtml(req.params.boardId);
        var sntzedtypeId = sanitizeHtml(req.params.typeId);
        var pNum = sanitizeHtml(req.params.pNum);
        if (login == false){
            res.end(`<script type='text/javascript'>
                alert("Login required ~~~");
                setTimeout("location.href='http://localhost:3000/'", 1000);
                </script>`);
        }
        var sql1 = 'select * from boardtype;';
        var sql2 = 'select * from boardtype where type_id = ?;'
        var sql3 = 'select board.password as bp, type_id, board_id, title, name, content from board left join person on board.loginid = person.loginid where board_id = ?;';
        var sql4 = `SELECT * FROM code;`;

        db.query(sql1 + sql2 + sql3, [sntzedtypeId, sntzedboardId],(err, results) => {
            if (err){
                throw err;
            }
            db.query(sql4, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'boardCRU.ejs',
                    cls : cls,
                    boardtypes : results[0],
                    boardtype : results[1],
                    boardjoin : results[2],
                    loginId: loginId,
                    title : 'update',
                    pNum : pNum,
                    codes:codes,
                };
                res.render('mainFrame', context, (err, html) => {
                    res.end(html);
                });
            })
            
        });
    },

    update_process: (req, res) => {
        var { name, login, cls } = authIsOwner(req, res);
        var post = req.body;
    
        // 입력값을 sanitize 처리
        var sntzedBoardId = sanitizeHtml(post.board_id);
        var sntzedTypeId = sanitizeHtml(post.type_id);
        var sntzedTitle = sanitizeHtml(post.title);
        var sntzedPassword = sanitizeHtml(post.password);
        var sntzedRealPassword = sanitizeHtml(post.realPassword);
        var sntzedContent = sanitizeHtml(post.content);
        var sntzedpNum = sanitizeHtml(post.pNum);
    
        // 관리자가 아닌 경우 비밀번호 확인
        if (cls !== 'MNG') {
            if (sntzedPassword !== sntzedRealPassword) {
                return res.send(`
                    <script type="text/javascript">
                        alert("비밀번호가 일치하지 않습니다.");
                        window.location.href='/board/update/${sntzedBoardId}/${sntzedTypeId}/${sntzedpNum}';
                    </script>
                `);
            }
        }
    
        // 업데이트 쿼리 실행
        db.query(
            `UPDATE board SET title = ?, content = ? WHERE board_id = ?`,
            [sntzedTitle, sntzedContent, sntzedBoardId],
            (err, result) => {
                if (err) {
                    console.error("Error updating board:", err);
                    return res.send(`
                        <script type="text/javascript">
                            alert("게시물 수정 중 오류가 발생했습니다.");
                            window.location.href='/board/update/${sntzedBoardId}/${sntzedTypeId}/${sntzedpNum}';
                        </script>
                    `);
                }
    
                // 수정 성공 시 해당 게시판 보기 페이지로 리다이렉트
                res.redirect(`/board/view/${sntzedTypeId}/${sntzedpNum}`);
            }
        );
    },
    

    delete_process : (req, res) => {
        var {name, login, cls} = authIsOwner(req, res);
        if (login == false){
            return res.end(`<script type='text/javascript'>
                alert("Login required ~~~");
                setTimeout("location.href='http://localhost:3000/'", 1000);
                </script>`);
        }
        var boardId = sanitizeHtml(req.params.boardId);
        var typeId = sanitizeHtml(req.params.typeId);
        var pNum = sanitizeHtml(req.params.pNum);
        db.query('delete from board where board_id = ?',
            [boardId], (err, result) => {
                if (err) {
                    throw err;
                }
                res.redirect(`/board/view/${typeId}/${pNum}`);
            }
        )  
    },
}