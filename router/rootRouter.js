const express= require('express');
const router= express.Router();

var root = require('../lib/root');

router.get('/', (req,res)=>{
    root.home(req,res)
})

router.get('/category/:categ', (req, res)=>{
    root.categoryview(req,res)
})

router.post('/search', (req, res)=>{
    root.search(req,res)
})

router.get('/detail/:merId', (req, res)=>{
    root.detail(req,res)
})

//cartview => 11장 29p cart, person, product 를 join
router.get('/cartview', (req, res) => {         //관리자용 cart 수정삭제 화면
    root.cartView(req, res);
});

router.get('/cartupdate/:cart_id', (req, res) => {          //관리자용 cart 수정화면
    root.cartUpdateView(req, res);  
});

router.post('/cartupdate/:cart_id', (req, res) => {         //관리자용 cart 수정 로직
    root.cartUpdate(req, res);
});

router.get('/cartdelete/:cart_id', (req, res) => {          //관리자용 cart 삭제 로직
    root.cartDelete(req, res);
});

//purchaseview => 11장 32p purchase, person, product 를 join
router.get('/purchaseview', (req, res)=>{        //관리자용 purchase 수정삭제 화면       
    root.purchaseView(req, res);
})

router.get('/purchaseupdate/:purchase_id', (req, res) => {          //관리자용 purchase 수정화면
    root.purchaseUpdateView(req, res);  
});

router.post('/purchaseupdate/:purchase_id', (req, res) => {         //관리자용 purchase 수정 로직
    root.purchaseUpdate(req, res);
});

router.get('/purchasedelete/:purchase_id', (req, res) => {          //관리자용 purchase 삭제 로직
    root.purchaseDelete(req, res);
});

router.get('/table', (req, res)=>{        //35p     
    root.tableView(req, res);
})

router.get('/table/view/:tableName', (req, res)=>{        //35p     
    root.tableDetailView(req, res);
})

router.get('/anal/customer', (req, res)=>{            
    root.analCustomer(req, res);
})

module.exports = router;