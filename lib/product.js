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
        var sql2 = ` select * from product;`
        var sql3 = `SELECT * FROM code;`;

        db.query(sql1 + sql2 ,(error,results)=>{
            db.query(sql3, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'product.ejs',
                    cls : cls,
                    boardtypes : results[0],
                    products: results[1],
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
        var sql1 = `SELECT main_id, sub_id, main_name, sub_name FROM code;`
        var sql2 = `select * from boardtype;`
        var sql3 = `SELECT * FROM code;`;


        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        db.query(sql1+sql2, (error, results) => {
            if (error) {
                throw error;
            }
            db.query(sql3, (error, codes)=>{
                var context = {
                    who : name,
                    login : login,
                    body : 'productCU.ejs',
                    cls : cls,
                    editing: false,
                    categorys: results[0],
                    boardtypes : results[1],
                    codes : codes,
                    product: {
                        category: ""
                    },
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

    create_process : (req,res)=>{
        var product = req.body;
        var file = req.file;
        sntzedCategory = sanitizeHtml(product.category)
        var main_id = sntzedCategory.substr(0,4);
        var sub_id = sntzedCategory.substr(4,4);
        sntzedMerId = sanitizeHtml(product.merId)
        sntzedName = sanitizeHtml(product.name)
        sntzedPrice = parseInt(sanitizeHtml(product.price))
        sntzedStock = parseInt(sanitizeHtml(product.stock))
        sntzedBrand = sanitizeHtml(product.brand)
        sntzedSupplier = sanitizeHtml(product.supplier)
        sntzedFile = file
        sntzedSaleYn = sanitizeHtml(product.sale_yn)
        sntzedSalePrice = parseInt(sanitizeHtml(product.sale_price))
    
        var sntzedFile = file ? file.filename : "";
        if (!sntzedSalePrice) {
            sntzedSalePrice = null;
        }
        
        db.query('SELECT COUNT(*) AS num FROM product WHERE mer_id = ?', 
            [sntzedMerId], (error, products) => {
                if (error) {
                    console.error(error);
                    return res.send(`<script type='text/javascript'>alert("상품 추가 중 오류가 발생했습니다."); 
                                    window.location.href='/product/create';</script>`);
                }
                if (products[0].num > 0) {
                    res.send(`<script type='text/javascript'>alert("중복된 상품입니다."); 
                    setTimeout("location.href='/product/create'", 1000);
                    </script>`);
                } else {
                    db.query(
                        `INSERT INTO product (main_id, sub_id, name, price, stock, brand, supplier, image, sale_yn, sale_price)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [main_id, sub_id, sntzedName, sntzedPrice, sntzedStock, sntzedBrand, sntzedSupplier, sntzedFile,sntzedSaleYn, sntzedSalePrice],
                        (error, result) => {
                            if (error) {
                                console.error(error);
                                return res.send(`<script type='text/javascript'>alert("상품 추가 중 오류가 발생했습니다."); 
                                                window.location.href='/product/create';</script>`);
                            }
                            res.redirect('/product/view');
                        });
                }
            });
    },

    update: (req, res) => {
        var {login, name, cls} = authIsOwner(req,res)

        if (cls !== 'MNG') {
            return res.send("<script>alert('권한이 없습니다.'); window.location.href='/';</script>");
        }
        var sntzedMerId = sanitizeHtml(req.params.merId);

        var sql1 = `select * from boardtype`;
        var sql2 = `SELECT * FROM product WHERE mer_id = ?`;
        var sql3 = `SELECT main_id, sub_id, main_name, sub_name FROM code;`;
        var sql4 = `SELECT * FROM code;`;

        db.query(sql1,(err,result) => {
            db.query(sql2, [sntzedMerId], (error, results) => {
                if(error) {
                    throw error;
                }
                if (results.length === 0) {
                    return res.send("<script>alert('수정할 데이터가 없습니다.'); window.location.href='/product/view';</script>");
                }
                var product = results[0];
                db.query(sql3, (error, category) => {
                    if (error) {
                        throw error;
                    }
                    db.query(sql4, (error, codes)=>{
                        var context = {
                            who: name,
                            login: login,
                            body: 'productCU.ejs',
                            cls: cls,
                            product: product,
                            editing: true,
                            merId: product.mer_id,
                            categorys: category,
                            boardtypes: result,
                            codes : codes
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
        });
    },

    update_process : (req,res)=>{
        var product = req.body;
        var file = req.file;
        sntzedCategory = sanitizeHtml(product.category)
        var main_id = sntzedCategory.substr(0,4);
        var sub_id = sntzedCategory.substr(4,4);
        sntzedMerId = sanitizeHtml(product.merId)
        sntzedName = sanitizeHtml(product.name)
        sntzedPrice = parseInt(sanitizeHtml(product.price))
        sntzedStock = parseInt(sanitizeHtml(product.stock))
        sntzedBrand = sanitizeHtml(product.brand)
        sntzedSupplier = sanitizeHtml(product.supplier)
        sntzedSaleYn = sanitizeHtml(product.sale_yn)
        sntzedSalePrice = parseInt(sanitizeHtml(product.sale_price))

        // 이미지 파일이 있을 경우에만 sntzedFile 설정
        var sntzedFile = file ? file.filename : product.currentImage; // currentImage -> 기존 이미지 경로        
        if (!sntzedSalePrice) {
            sntzedSalePrice = null;
        }

        db.query(`UPDATE product SET main_id=?, sub_id=?, name=?, price=?, stock=?, brand=?, supplier=?, image=?, sale_yn=?, sale_price=? WHERE mer_id=?`,
            [main_id, sub_id, sntzedName, sntzedPrice, sntzedStock, sntzedBrand, sntzedSupplier, sntzedFile, sntzedSaleYn, sntzedSalePrice, sntzedMerId], (error, result) => {
                if(error) {
                    throw error;
                }
                res.writeHead(302, { Location: `/product/view` });
                res.end();            
            }
        );
    },

    delete_process : (req,res)=>{
        var sntzedMerId = sanitizeHtml(req.params.merId);

        db.query(`DELETE FROM product WHERE mer_id = ?`, 
            [sntzedMerId], (error, result) => {
                if (error) {
                    return res.send(`<script>alert('상품 삭제 중 오류가 발생했습니다.'); window.location.href='/product/view';</script>`);
                }
                res.writeHead(302, { Location: `/product/view` });
                res.end();  
            });
    }
}