const db = require('./db');
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

module.exports = {
    // 메인 컨텍스트에 필요한 변수 추가
    addMainContext: (req, callback) => {
        const { loginId, name, login, cls } = authIsOwner(req);

        // boardtypes, codes 데이터를 가져옴
        const sqlBoardTypes = `SELECT * FROM boardtype;`;
        const sqlCodes = `SELECT * FROM code;`;

        db.query(sqlBoardTypes, (error, boardtypes) => {
            if (error) return callback(error);

            db.query(sqlCodes, (error, codes) => {
                if (error) return callback(error);

                // 모든 데이터 컨텍스트에 포함
                callback(null, { loginId, name, login, cls, boardtypes, codes, who: name });
            });
        });
    },

    purchasedetail: (req, res) => {
        const merId = req.params.merId;

        const sqlProduct = `SELECT * FROM product WHERE mer_id = ?;`;

        // 메인 컨텍스트를 먼저 불러옴
        module.exports.addMainContext(req, (error, mainContext) => {
            if (error) return res.status(500).send("Database query error: boardtype or codes");

            db.query(sqlProduct, [merId], (error, products) => {
                if (error) return res.status(500).send("Database query error: product");

                const context = {
                    ...mainContext,
                    body: 'purchaseDetail.ejs',
                    products,
                    mer_id: merId,
                };

                res.render('mainFrame', context, (err, html) => {
                    if (err) {
                        console.error("Error rendering mainFrame:", err);
                        return res.status(500).send("Rendering error");
                    }
                    res.end(html);
                });
            });
        });
    },

    purchase: (req, res) => {
        const merId = sanitizeHtml(req.body.mer_id);
        const qty = parseInt(sanitizeHtml(req.body.qty), 10);
        var sntzedDate = require('./board').dateOfEightDigit(); 
        const { loginId } = authIsOwner(req);
    
        const sqlProduct = `SELECT * FROM product WHERE mer_id = ?;`;
        const sqlInsertPurchase = `
            INSERT INTO purchase (loginid, mer_id, date, price, point, qty, total, payYN, cancel, refund)
            VALUES (?, ?, ?, ?, 0, ?, ?, 'Y', 'N', 'N');
        `;
        const sqlGetPurchases = `
            SELECT pur.*, prod.name AS productName, prod.image 
            FROM purchase pur
            JOIN product prod ON pur.mer_id = prod.mer_id
            WHERE pur.loginid = ?;
        `;
    
        db.query(sqlProduct, [merId], (error, productResults) => {
            if (error) return res.status(500).send("Database query error: product");
    
            if (productResults.length === 0) {
                return res.status(404).send("Product not found");
            }
    
            const product = productResults[0];
            const total = qty * product.price;
    
            db.query(
                sqlInsertPurchase,
                [loginId, merId, sntzedDate, product.price, qty, total],
                (error) => {
                    if (error) return res.status(500).send("Database query error: purchase");
    
                    db.query(sqlGetPurchases, [loginId], (error, purchases) => {
                        if (error) return res.status(500).send("Database query error: fetching purchases");
    
                        module.exports.addMainContext(req, (error, mainContext) => {
                            if (error) return res.status(500).send("Database query error: boardtype or codes");
    
                            const context = {
                                ...mainContext,
                                body: 'purchase.ejs',
                                total,
                                product,
                                qty,
                                purchases, // 추가된 purchases 데이터
                            };
    
                            res.render('mainFrame', context, (err, html) => {
                                if (err) {
                                    console.error("Error rendering purchase.ejs:", err);
                                    return res.status(500).send("Rendering error");
                                }
                                res.end(html);
                            });
                        });
                    });
                }
            );
        });
    },
    

    getPurchases: (req, res) => {
        const { loginId } = authIsOwner(req);

        const sqlGetPurchases = `
            SELECT pur.*, prod.name AS productName, prod.image 
            FROM purchase pur
            JOIN product prod ON pur.mer_id = prod.mer_id
            WHERE pur.loginid = ?;
        `;

        db.query(sqlGetPurchases, [loginId], (error, purchases) => {
            if (error) return res.status(500).send("Database query error: purchases");

            module.exports.addMainContext(req, (error, mainContext) => {
                if (error) return res.status(500).send("Database query error: boardtype or codes");

                const context = {
                    ...mainContext,
                    body: 'purchase.ejs',
                    purchases,
                };

                res.render('mainFrame', context, (err, html) => {
                    if (err) {
                        console.error("Error rendering purchase.ejs:", err);
                        return res.status(500).send("Rendering error");
                    }
                    res.end(html);
                });
            });
        });
    },

    cancelPurchase: (req, res) => {
        const purchaseId = req.params.purchaseId;
        const sqlCancel = `UPDATE purchase SET cancel = 'Y' WHERE purchase_id = ?;`;

        db.query(sqlCancel, [purchaseId], (error) => {
            if (error) return res.status(500).send("Database query error: cancel");

            module.exports.getPurchases(req, res);
        });
    },
    
    cart: (req, res) => {
        const { mer_id } = req.body;
        const { loginId } = authIsOwner(req);
        const sntzedDate = require('./board').dateOfEightDigit(); // 현재 날짜 가져오기
    
        // 유효성 검사
        if (!mer_id || isNaN(mer_id)) {
            console.error('Invalid mer_id:', mer_id);
            return res.status(400).send('Invalid product ID');
        }
    
        // cart 테이블에서 동일한 mer_id가 존재하는지 확인
        const checkQuery = `SELECT * FROM cart WHERE loginid = ? AND mer_id = ?`;
        db.query(checkQuery, [loginId, mer_id], (err, results) => {
            if (err) {
                console.error('Cart Check Error:', err.message);
                return res.status(500).send('Database query error: cart check');
            }
    
            if (results.length > 0) {
                // 동일 제품이 이미 존재하면 알림
                return res.send(`
                    <script>
                        alert("장바구니에 이미 있는 제품입니다.");
                        window.location.href = "/purchase/cart";
                    </script>
                `);
            }
    
            // cart 테이블에 데이터 추가
            const insertQuery = `
                INSERT INTO cart (loginid, mer_id, date)
                VALUES (?, ?, ?)
            `;
            db.query(insertQuery, [loginId, mer_id, sntzedDate], (err) => {
                if (err) {
                    console.error('Cart Insert Error:', err.message);
                    return res.status(500).send('Database query error: cart insert');
                }
    
                // 장바구니 페이지로 리다이렉트
                res.redirect('/purchase/cart');
            });
        });
    },    
    
    getCart: (req, res) => {
        const { loginId } = authIsOwner(req);
    
        const selectQuery = `
            SELECT 
                c.cart_id, c.mer_id, c.date, 
                p.name, p.price, p.image
            FROM cart c
            JOIN product p ON c.mer_id = p.mer_id
            WHERE c.loginid = ?
        `;
    
        db.query(selectQuery, [loginId], (err, carts) => {
            if (err) {
                console.error('Cart Select Error:', err.message);
                return res.status(500).send('Database query error: cart');
            }
    
            module.exports.addMainContext(req, (err, mainContext) => {
                if (err) {
                    console.error('Main Context Error:', err.message);
                    return res.status(500).send('Database query error: boardtype or codes');
                }
    
                const context = {
                    ...mainContext,
                    body: 'cart.ejs',
                    carts, // 장바구니 데이터
                };
    
                res.render('mainFrame', context, (err, html) => {
                    if (err) {
                        console.error('Cart Render Error:', err.message);
                        return res.status(500).send('Rendering error');
                    }
                    res.end(html);
                });
            });
        });
    },    

    deleteCart: (req, res) => {
        const selectedIds = req.body.selected_ids; // 선택된 cart_id 값 (콤마로 구분된 문자열)
    
        if (!selectedIds || selectedIds.trim() === '') {
            console.error('No cart IDs selected for deletion');
            return res.redirect('/purchase/cart'); // 선택된 항목이 없으면 리다이렉트
        }
        const cartIds = selectedIds.split(','); // 문자열을 배열로 변환

        // cart 테이블에서 해당 cart_id 항목 삭제
        const deleteQuery = `DELETE FROM cart WHERE cart_id IN (${cartIds.map(() => '?').join(',')})`;
        db.query(deleteQuery, cartIds, (err) => {
            if (err) {
                console.error('Cart Delete Error:', err.message);
                return res.status(500).send('장바구니 삭제 중 문제가 발생했습니다.');
            }
    
            console.log('Deleted cart IDs:', cartIds); // 삭제된 ID 로그 확인
            res.redirect('/purchase/cart');            // 삭제 후 장바구니 페이지로 리다이렉트
        });
    },

    checkout: (req, res) => {
        const { loginId } = authIsOwner(req);
        const cartIds = req.body.checkout_ids.split(','); // 선택된 cart_id 목록
        const quantities = req.body.quantities.split(',').map(Number); // 수량 배열
        const sntzedDate = require('./board').dateOfEightDigit();
    
        if (!cartIds || cartIds.length === 0) {
            return res.send(`
                <script>
                    alert("구매할 상품을 선택해주세요.");
                    window.location.href = "/purchase/cart";
                </script>
            `);
        }
    
        // 선택된 항목을 가져오기 위한 쿼리
        const selectQuery = `
            SELECT c.cart_id, c.mer_id, p.price
            FROM cart c
            JOIN product p ON c.mer_id = p.mer_id
            WHERE c.cart_id IN (${cartIds.map(() => '?').join(',')})
        `;
    
        db.query(selectQuery, cartIds, (err, results) => {
            if (err) {
                console.error('Cart Select Error:', err.message);
                return res.status(500).send('Database query error: cart select');
            }
    
            if (results.length === 0) {
                return res.send(`
                    <script>
                        alert("선택한 상품을 찾을 수 없습니다.");
                        window.location.href = "/purchase/cart";
                    </script>
                `);
            }
    
            // 개별 항목을 purchase 테이블에 삽입
            const insertQuery = `
                INSERT INTO purchase (loginid, mer_id, date, price, point, qty, total, payYN, cancel, refund)
                VALUES (?, ?, ?, ?, 0, ?, ?, 'Y', 'N', 'N')
            `;
    
            let completedInserts = 0; // 삽입 완료된 수 확인
    
            results.forEach((item, index) => {
                const qty = quantities[index];
                const total = item.price * qty;
    
                db.query(insertQuery, [loginId, item.mer_id, sntzedDate, item.price, qty, total], (err) => {
                    if (err) {
                        console.error('Purchase Insert Error:', err.message);
                        return res.status(500).send('Database query error: purchase insert');
                    }
    
                    completedInserts++;
                    if (completedInserts === results.length) {
                        // 모든 삽입이 완료되면 cart 테이블에서 해당 항목 삭제
                        const deleteQuery = `
                            DELETE FROM cart WHERE cart_id IN (${cartIds.map(() => '?').join(',')})
                        `;
                        db.query(deleteQuery, cartIds, (err) => {
                            if (err) {
                                console.error('Cart Delete Error:', err.message);
                                return res.status(500).send('Database query error: cart delete');
                            }
    
                            // 삭제 완료 후 리다이렉트
                            res.send(`
                                <script>
                                    alert("결제가 완료되었습니다.");
                                    window.location.href = "/purchase";
                                </script>
                            `);
                        });
                    }
                });
            });
        });
    },
};
