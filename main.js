//.env
require('dotenv').config();

// express와 views 정의
const express = require('express');
const app = express();
var session = require('express-session'); // session 모듈 추가
var MySqlStore = require('express-mysql-session')(session);
var bodyParser = require('body-parser'); 

var options = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: process.env.DB_MULTIPLE_STATEMENTS === 'true'
};

var sessionStore = new MySqlStore(options);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore
}));


app.set('views',__dirname+'/views');
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


var rootRouter = require('./router/rootRouter');
var authRouter = require('./router/authRouter');
var codeRouter = require('./router/codeRouter');
var personRouter = require('./router/personRouter');
var productRouter = require('./router/productRouter');
var boardRouter = require('./router/boardRouter');
var purchaseRouter = require('./router/purchaseRouter');

app.use(express.static('public'));
app.use('/',rootRouter);
app.use('/auth',authRouter);
app.use('/code',codeRouter);
app.use('/person',personRouter);
app.use('/product',productRouter);
app.use('/board',boardRouter);
app.use('/purchase',purchaseRouter);

app.get('/favicon.ico', (req, res) => res.writeHead(404));
app.listen(3000, () => console.log('Example app listening on port 3000'));

