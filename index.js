import { map_manager, map_token, manager_isLogin, isLogin, map_salesman, salesman_isLogin } from './module/check.js';
import { send_email } from './module/email.js'
import { admin } from './module/admin.js';
import { login } from './module/login.js';
import { clientCss } from './module/client-css.js';
import { register } from './module/register.js';
import { clientAPI } from './module/client-api.js';
import { salesman } from './module/salesman.js';
import http from 'http'
import fs from 'fs';
import url from 'url';
import express from "../lib/node_modules/express/index.js"
import path from "path"
import bodyParser from "../lib/node_modules/body-parser/index.js"
import crypto from "crypto"
import cookieParser from "../lib/node_modules/cookie-parser/index.js"
const app = express();
import mysql from '../lib/node_modules/mysql/index.js';
import ejs from "../lib/node_modules/ejs/lib/ejs.js"
app.set("view engine", "html");
app.engine("html", ejs.__express);
app.use(bodyParser.urlencoded({ extended: true })); //用于解析post参数
app.use(cookieParser());
//导入nodemailer
import nodeMailer from "../lib/node_modules/nodemailer/lib/nodemailer.js"
import { query } from '../lib/node_modules/express/lib/express.js'
// 连接数据库
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '582825762w',
    database: 'ele_com'
});
connection.connect();
// 定时查询数据库一次，保证mysql八小时内通信一次
function interal() {
    var chat_interal = 'SELECT * FROM user';
    var data_interal = [];
    connection.query(chat_interal, data_interal, function(err, result) {
        if (err) {
            console.log('查询管理员数据 error---', err.message);
            return;
        }
        console.log('hello')
    })
}
setInterval(interal, 3600000);

// 利用express模块化来写数据接口
const admin_route = express.Router();
// 将路由和请求路径进行匹配
app.use('/admin', admin_route);
// 管理系统管理员页面-管理员的api
admin(admin_route, app, manager_isLogin, url, fs, connection);

// 利用express模块化来写数据接口
const salesman_route = express.Router();
// 将路由和请求路径进行匹配
app.use('/salesman', salesman_route);
// 管理系统销售人员页面-销售人员的api
salesman(salesman_route, salesman_isLogin, url, fs, connection, map_salesman)

// 登录页面-登录验证api
login(app, fs, connection, map_manager, map_salesman, map_token)
    // 客户端页面必须的样式接口
clientCss(app, fs)
    // 注册页面-注册api
register(app, fs, connection)
    // 利用express模块化来写数据接口

const each_route = express.Router();
// 将路由和请求路径进行匹配
app.use('/database', each_route)
clientAPI(app, fs, connection, map_token, each_route, send_email, isLogin);

// 返回其他数据和页面
app.get('*', isLogin, function(req, res, text) {
    //从文件系统中去请求的文件内容.
    // 如43.110.23.440:80/index.js,那么req.url为/index.js,req.url.substr(1)为index.js
    // 访问端口的话，req.url为/，那么直接返回主页面
    if (req.url == '/' || req.url == '/index' || req.url == '/index.html') {
        fs.readFile('byPageShow.html', function(err, data) {
            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                res.writeHead(404, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });

                //写会回相应内容
                res.write(data);
            }
            //发送响应数据
            res.end();
        });
    } else {
        //解析请求，包括文件名
        var pathname = url.parse(req.url).pathname;
        //输出请求的文件名
        console.log("req for " + pathname + "  received.");
        console.log(req.url);
        //当请求css文件夹时，url解析后为/css/xxxx.css,firstDir为xxxx.css,设置文件返回类型是text/css
        var firstDir = pathname && pathname.split('/')[2];
        var ContentType = null;
        // 文件格式
        let type_of_file = "";
        // 用.作为分隔符来判断文件类型，直接访问端口一律默认为请求html文件
        if (firstDir && firstDir.split('.')[1] === 'css') {
            ContentType = {
                'Content-Type': 'text/css'
            };
            type_of_file = '.css'
        } else if (firstDir && firstDir.split('.')[1] === 'js') {
            ContentType = {
                'Content-Type': 'text/javascript'
            }
            type_of_file = ".js"
        } else if (firstDir && firstDir.split('.')[1] === 'png') {
            ContentType = { 'Content-Type': 'image/png' }
            type_of_file = ".png"
        } else if (firstDir && firstDir.split('.')[1] === 'jpg') {
            ContentType = { 'Content-Type': 'image/jpg' }
            type_of_file = ".jpg"
        } else if (firstDir && firstDir.split('.')[1] === 'gif') {
            ContentType = { 'Content-Type': 'image/gif' }
            type_of_file = ".gif"
        } else {
            ContentType = {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-store'
            }
            type_of_file = ".html"
        }
        console.log('______________path')
        console.log('./' + pathname.substr(1))
        console.log('______________path')
        fs.readFile('./' + pathname.substr(1), function(err, data) {

            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                res.writeHead(404, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                res.writeHead(200, ContentType);

                //写会回相应内容
                res.write(data);
            }
            //发送响应数据
            res.end();
        });
    }
})
app.use((req, res, next) => {
    console.log('hello')
})

app.listen(81, () => {
    console.log("http://localhost:81已经打开")
});