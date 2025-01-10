const db = require('./db');
const sanitizeHtml = require('sanitize-html');

// 공통 함수: 사용자 인증 상태 확인
function authIsOwner(req) {
    return req.session.is_logined
        ? { name: req.session.name, login: true, cls: req.session.cls, loginId: req.session.loginid }
        : { name: 'Guest', login: false, cls: 'NON', loginId: '' };
}

// 공통 함수: EJS 렌더링 처리
function renderPage(res, body, context) {
    res.render('mainFrame', { ...context, body }, (err, html) => {
        if (err) {
            console.error(`Error rendering ${body}:`, err);
            res.status(500).send("Rendering error");
        } else {
            res.end(html);
        }
    });
}

// 공통 함수: SQL 실행
async function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// 공통 데이터 가져오기: boardtypes와 codes
async function fetchCommonData() {
    try {
        const [boardtypes, codes] = await Promise.all([
            runQuery('SELECT * FROM boardtype;'),
            runQuery('SELECT * FROM code;'),
        ]);
        return { boardtypes, codes };
    } catch (err) {
        console.error("Error fetching common data:", err);
        throw err;
    }
}

module.exports = {
    home: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        try {
            const commonData = await fetchCommonData();
            const products = await runQuery('SELECT * FROM product;');
            renderPage(res, 'product.ejs', { ...commonData, who: name, login, cls, products });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    categoryview: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        const categ = req.params.categ;
        const main_id = categ.slice(0, 4);
        const sub_id = categ.slice(4);
        try {
            const commonData = await fetchCommonData();
            const products = await runQuery(
                'SELECT * FROM product WHERE main_id = ? AND sub_id = ?',
                [main_id, sub_id]
            );
            renderPage(res, 'productCate.ejs', {
                ...commonData,
                who: name,
                login,
                cls,
                products,
                main_id,
                sub_id,
            });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    search: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        const queryParam = `%${sanitizeHtml(req.body.search)}%`;
        try {
            const commonData = await fetchCommonData();
            const products = await runQuery(
                `SELECT * FROM product 
                 WHERE name LIKE ? OR brand LIKE ? OR supplier LIKE ?`,
                [queryParam, queryParam, queryParam]
            );
            renderPage(res, 'product.ejs', {
                ...commonData,
                who: name,
                login,
                cls,
                products,
                searchQuery: req.body.search,
            });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    detail: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        const merId = req.params.merId;
        try {
            const commonData = await fetchCommonData();
            const products = await runQuery('SELECT * FROM product WHERE mer_id = ?', [merId]);
            renderPage(res, 'productDetail.ejs', {
                ...commonData,
                who: name,
                login,
                cls,
                products,
                mer_id: merId,
            });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    cartView: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        try {
            const commonData = await fetchCommonData();
            const carts = await runQuery(`
                SELECT c.cart_id, c.loginid, p.name AS customer_name, 
                       c.mer_id, pr.name AS product_name, c.date
                FROM cart c
                LEFT JOIN person p ON c.loginid = p.loginid
                LEFT JOIN product pr ON c.mer_id = pr.mer_id;
            `);
            renderPage(res, 'cartView', { ...commonData, who: name, login, cls, carts });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    cartUpdateView: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        const cartId = req.params.cart_id;
        try {
            const [cart, customers, products, commonData] = await Promise.all([
                runQuery('SELECT * FROM cart WHERE cart_id = ?', [cartId]),
                runQuery('SELECT loginid, name FROM person WHERE class = "CST";'),
                runQuery('SELECT mer_id, name FROM product;'),
                fetchCommonData(),
            ]);

            renderPage(res, 'cartU', {
                ...commonData,
                who: name,
                login,
                cls,
                cart: cart[0],
                customers,
                products,
            });
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    cartUpdate: async (req, res) => {
        const cartId = req.params.cart_id;
        const { customer, product } = req.body;
        try {
            const loginId = (await runQuery('SELECT loginid FROM person WHERE name = ?', [customer]))[0]?.loginid;
            const merId = (await runQuery('SELECT mer_id FROM product WHERE name = ?', [product]))[0]?.mer_id;

            await runQuery('UPDATE cart SET loginid = ?, mer_id = ? WHERE cart_id = ?', [loginId, merId, cartId]);
            res.redirect('/cartview');
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    cartDelete: async (req, res) => {
        const cartId = req.params.cart_id;
        try {
            await runQuery('DELETE FROM cart WHERE cart_id = ?', [cartId]);
            res.redirect('/cartview');
        } catch (error) {
            res.status(500).send("Database query error");
        }
    },

    purchaseView: (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
    
        // `purchase`, `person`, `product` 테이블을 조인하여 필요한 데이터 가져오기
        const sql = `
            SELECT 
                p.purchase_id,          -- Purchase ID
                p.loginid,              -- Customer Login ID
                per.name AS customer_name, -- Customer Name
                p.mer_id,               -- Product ID
                prod.name AS product_name, -- Product Name
                p.date,                 -- Purchase Date
                p.price,                -- Price
                p.point,                -- Points
                p.qty,                  -- Quantity
                p.total,                -- Total Price
                p.payYN,                -- Payment Status
                p.cancel,               -- Cancel Status
                p.refund                -- Refund Status
            FROM purchase p
            JOIN person per ON p.loginid = per.loginid
            JOIN product prod ON p.mer_id = prod.mer_id;
        `;
    
        // 코드와 boardtypes 데이터를 함께 가져오기
        const sqlCodes = `SELECT * FROM code;`;
        const sqlBoardtypes = `SELECT * FROM boardtype;`;
    
        db.query(sql, (error, purchaseResults) => {
            if (error) {
                console.error("Error fetching purchase data:", error);
                return res.status(500).send("Database query error");
            }
    
            db.query(sqlCodes, (error, codeResults) => {
                if (error) {
                    console.error("Error fetching codes data:", error);
                    return res.status(500).send("Database query error");
                }
    
                db.query(sqlBoardtypes, (error, boardtypeResults) => {
                    if (error) {
                        console.error("Error fetching boardtypes data:", error);
                        return res.status(500).send("Database query error");
                    }
    
                    const context = {
                        who: name,
                        login: login,
                        cls: cls,
                        body: 'purchaseView', // `purchaseView.ejs`를 body로 설정
                        purchases: purchaseResults, // 조인된 purchase 데이터
                        codes: codeResults,         // 코드 데이터
                        boardtypes: boardtypeResults // boardtype 데이터
                    };
    
                    // `mainFrame`에 데이터를 렌더링
                    res.render('mainFrame', context, (err, html) => {
                        if (err) {
                            console.error("Error rendering mainFrame with purchaseView:", err);
                            return res.status(500).send("Rendering error");
                        }
                        res.end(html);
                    });
                });
            });
        });
    },
    
    purchaseUpdateView: (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
        const purchaseId = req.params.purchase_id;
    
        const sql1 = `
            SELECT 
                p.purchase_id, p.loginid, per.name AS customer_name,
                p.mer_id, prod.name AS product_name,
                p.date, p.price, p.point, p.qty, p.total, 
                p.payYN, p.cancel, p.refund
            FROM purchase p
            JOIN person per ON p.loginid = per.loginid
            JOIN product prod ON p.mer_id = prod.mer_id
            WHERE p.purchase_id = ?;
        `;
    
        const sql2 = `SELECT name FROM person WHERE class = 'CST';`; // 고객 목록
        const sql3 = `SELECT mer_id, name FROM product;`; // 상품 목록
        const sql4 = `SELECT * FROM code;`; // codes 데이터
        const sql5 = `SELECT * FROM boardtype;`; // boardtypes 데이터
    
        db.query(sql1, [purchaseId], (error, purchaseResults) => {
            if (error) {
                console.error("Error fetching purchase data:", error);
                return res.status(500).send("Database query error");
            }
    
            db.query(sql2, (error, customerResults) => {
                if (error) {
                    console.error("Error fetching customer data:", error);
                    return res.status(500).send("Database query error");
                }
    
                db.query(sql3, (error, productResults) => {
                    if (error) {
                        console.error("Error fetching product data:", error);
                        return res.status(500).send("Database query error");
                    }
    
                    db.query(sql4, (error, codesResults) => {
                        if (error) {
                            console.error("Error fetching codes data:", error);
                            return res.status(500).send("Database query error");
                        }
    
                        db.query(sql5, (error, boardtypesResults) => {
                            if (error) {
                                console.error("Error fetching boardtypes data:", error);
                                return res.status(500).send("Database query error");
                            }
    
                            const context = {
                                who: name,
                                login: login,
                                cls: cls,
                                body: 'purchaseU', // 수정 화면
                                purchase: purchaseResults[0],
                                customers: customerResults,
                                products: productResults,
                                codes: codesResults, // 추가된 codes 데이터
                                boardtypes: boardtypesResults, // 추가된 boardtypes 데이터
                            };
    
                            res.render('mainFrame', context, (err, html) => {
                                if (err) {
                                    console.error("Error rendering purchaseU:", err);
                                    return res.status(500).send("Rendering error");
                                }
                                res.end(html);
                            });
                        });
                    });
                });
            });
        });
    },
    
    purchaseUpdate: (req, res) => {
        const purchaseId = req.params.purchase_id;
        const {
            customer, // 고객 이름
            product,  // 상품 ID
            price, point, qty,
            total, payYN, cancel, refund,
        } = req.body;
    
        const selectSql = `
            SELECT loginid, mer_id, price, point, qty, total, payYN, cancel, refund 
            FROM purchase 
            WHERE purchase_id = ?;
        `;        // 기존 데이터 가져오기
    
        db.query(selectSql, [purchaseId], (selectError, selectResults) => {
            if (selectError) {
                console.error('Error fetching current purchase data:', selectError);
                return res.status(500).send('Database query error');
            }
    
            if (selectResults.length === 0) {
                return res.status(404).send('Purchase not found');
            }
            const currentData = selectResults[0]; // 기존 데이터
    
            // 고객 이름으로 loginid 조회
            const getLoginIdSql = `
                SELECT loginid FROM person WHERE name = ?;
            `;
            db.query(getLoginIdSql, [customer], (loginIdError, loginIdResults) => {
                if (loginIdError) {
                    console.error('Error fetching loginid:', loginIdError);
                    return res.status(500).send('Database query error');
                }
    
                const newLoginid = loginIdResults.length > 0 ? loginIdResults[0].loginid : currentData.loginid; // 새 loginid 또는 기존 값
                const newMerId = product || currentData.mer_id;
                const newPrice = price || currentData.price;
                const newPoint = point || currentData.point;
                const newQty = qty || currentData.qty;
                const newTotal = total || currentData.total;
                const newPayYN = payYN || currentData.payYN;
                const newCancel = cancel || currentData.cancel;
                const newRefund = refund || currentData.refund;
    
                const updateSql = `
                    UPDATE purchase 
                    SET 
                        loginid = ?, mer_id = ?, price = ?, point = ?,
                        qty = ?, total = ?, payYN = ?, cancel = ?, refund = ?
                    WHERE purchase_id = ?;
                `;
    
                const updateValues = [
                    newLoginid, newMerId, newPrice, newPoint, newQty,
                    newTotal, newPayYN, newCancel, newRefund, purchaseId,
                ];
    
                db.query(updateSql, updateValues, (updateError, updateResults) => {
                    if (updateError) {
                        console.error('Error updating purchase:', updateError);
                        return res.status(500).send('Database query error');
                    }
                    console.log('Update successful:', updateResults);
                    res.redirect('/purchaseview');
                });
            });
        });
    },
    
   purchaseDelete: (req, res) => {
    const purchaseId = req.params.purchase_id;
    const sql = `DELETE FROM purchase WHERE purchase_id = ?;`;

    db.query(sql, [purchaseId], (error, results) => {
        if (error) {
            console.error("Error deleting purchase:", error);
            return res.status(500).send("Database query error");
        }
        res.redirect('/purchaseview');
        });
    },

    tableView: (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
    
        // 테이블 이름과 COMMENT 가져오는 SQL
        const sql = `
            SELECT 
                TABLE_NAME AS tableName, 
                TABLE_COMMENT AS tableComment
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'webdb2024';
        `;
        const sqlBoardtypes = `SELECT * FROM boardtype;`;
        const sqlCodes = `SELECT * FROM code;`;
    
        db.query(sql, (error, tableResults) => {        // 데이터베이스 쿼리 실행

            if (error) {
                console.error("Error fetching table information:", error);
                return res.status(500).send("Database query error");
            }
    
            db.query(sqlBoardtypes, (error, boardtypesResults) => {
                if (error) {
                    console.error("Error fetching boardtypes:", error);
                    return res.status(500).send("Database query error");
                }
    
                db.query(sqlCodes, (error, codesResults) => {
                    if (error) {
                        console.error("Error fetching codes:", error);
                        return res.status(500).send("Database query error");
                    }
    
                    const context = {
                        who: name,
                        login: login,
                        cls: cls,
                        body: 'tableManage', // tableManage.ejs 파일과 연결
                        tables: tableResults, // 테이블 정보
                        boardtypes: boardtypesResults, // boardtypes 데이터
                        codes: codesResults // codes 데이터
                    };
                    res.render('mainFrame', context, (err, html) => {
                        if (err) {
                            console.error("Error rendering tableManage:", err);
                            return res.status(500).send("Rendering error");
                        }
                        res.end(html);
                    });
                });
            });
        });
    },
    
    tableDetailView: (req, res) => {
        const { login, name, cls } = authIsOwner(req, res);
        const tableName = req.params.tableName;
    
        if (!tableName) {
            return res.status(400).send("Table name is required.");
        }
        const columnSql = `
            SELECT 
                COLUMN_NAME AS columnName, 
                COLUMN_COMMENT AS columnComment,
                COLUMN_KEY AS columnKey
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'webdb2024' 
            AND TABLE_NAME = ?
            AND COLUMN_KEY != 'PRI' -- PRIMARY KEY 제외
            ORDER BY ORDINAL_POSITION;`;
        const boardtypesSql = `SELECT * FROM boardtype;`;
        const codesSql = `SELECT * FROM code;`;
    
        db.query(columnSql, [tableName], (columnError, columnResults) => {
            if (columnError) {
                console.error("Error fetching column information:", columnError);
                return res.status(500).send("Database query error.");
            }
    
            if (columnResults.length === 0) {
                return res.status(404).send(`No columns found for table ${tableName}`);
            }
    
            // 동적으로 PRIMARY KEY 제외된 컬럼으로 SELECT 쿼리 생성
            const columnNames = columnResults.map(col => `\`${col.columnName}\``).join(', ');
            const dataSql = `SELECT ${columnNames} FROM ??;`; // 컬럼 이름만으로 SELECT
    
            db.query(dataSql, [tableName], (dataError, dataResults) => {
                if (dataError) {
                    console.error("Error fetching table data:", dataError);
                    return res.status(500).send("Database query error.");
                }
    
                db.query(boardtypesSql, (boardtypesError, boardtypesResults) => {
                    if (boardtypesError) {
                        console.error("Error fetching boardtypes data:", boardtypesError);
                        return res.status(500).send("Database query error.");
                    }

                    db.query(codesSql, (codesError, codesResults) => {
                        if (codesError) {
                            console.error("Error fetching codes data:", codesError);
                            return res.status(500).send("Database query error.");
                        }
    
                        const context = {
                            who: name,
                            login: login,
                            cls: cls,
                            body: 'tableView', // tableView.ejs를 렌더링
                            tableName: tableName,
                            columns: columnResults, // PRIMARY KEY 제외된 컬럼 정보
                            data: dataResults, // PRIMARY KEY 제외된 데이터
                            boardtypes: boardtypesResults,
                            codes: codesResults
                        };
    
                        res.render('mainFrame', context, (err, html) => {
                            if (err) {
                                console.error("Error rendering tableView:", err);
                                return res.status(500).send("Rendering error.");
                            }
                            res.end(html);
                        });
                    });
                });
            });
        });
    },
    analCustomer: async (req, res) => {
        const { login, name, cls } = authIsOwner(req);
        try {
            // 지역별 고객 비율 데이터 가져오기
            const percentageQuery = `SELECT 
                                        address, 
                                        ROUND((COUNT(*) / (SELECT COUNT(*) FROM person)) * 100, 2) AS rate
                                    FROM person
                                    GROUP BY address; `;
            const percentage = await runQuery(percentageQuery);
            const commonData = await fetchCommonData();            // 공통 데이터 가져오기
            renderPage(res, 'ceoAnal.ejs', {     // mainFrame.ejs에 데이터를 포함하여 렌더링
                ...commonData, // 공통 데이터 추가
                who: name,
                login: login,
                cls: cls,
                percentage: percentage,
            });
        } catch (error) {
            console.error("Error fetching customer analysis data:", error);
            res.status(500).send("Database query error");
        }
    },
    
}