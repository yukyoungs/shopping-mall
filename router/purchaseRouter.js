const express= require('express');
const router= express.Router();

var purchase = require('../lib/purchase');

router.get('/detail/:merId', (req, res)=>{
    purchase.purchasedetail(req,res)
})          // 구매버튼 눌렀을 때 수량 입력하는

router.post('/', (req, res)=>{
    purchase.purchase(req,res)
})          // (구매창에서 입력한 수량과 제품을) 결제 창에(purchase 테이블에) 저장해서 나타냄

router.get('/', (req, res) => {
    purchase.getPurchases(req, res);
});         // get 요청

router.post('/cancel/:purchaseId', (req, res) => {
    purchase.cancelPurchase(req, res);
});         //구매 취소 cancel update

router.post('/cart', (req, res)=>{
    purchase.cart(req,res)
})          // (구매창에서 입력한 수량과 제품을) 장바구니 창에(cart 테이블에) 저장해서 나타냄

router.get('/cart', (req, res) => {
    purchase.getCart(req, res); // 장바구니 조회
});

router.post('/cart/delete', (req, res) => {
    purchase.deleteCart(req, res); // 삭제 요청을 처리하는 함수 호출
});

// 새로 추가된 결제 처리
router.post('/checkout', (req, res) => {
    purchase.checkout(req, res);
});

module.exports = router;