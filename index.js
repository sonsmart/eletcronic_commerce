var http = require('http');
var fs = require('fs');
var url = require('url');
const express = require("../lib/node_modules/express");
const path = require("path");
const bodyParser = require("../lib/node_modules/body-parser");
const crypto = require("crypto");
const cookieParser = require("../lib/node_modules/cookie-parser");
const app = express();
var mysql = require('../lib/node_modules/mysql');
app.set("view engine", "html");
app.engine("html", require("../lib/node_modules/ejs").__express);
app.use(bodyParser.urlencoded({ extended: true })); //用于解析post参数
app.use(cookieParser());
//导入nodemailer
const nodeMailer = require("../lib/node_modules/nodemailer");
const { query } = require('../lib/node_modules/express');
// 连接数据库
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '582825762w',
    database: 'ele_com'
});
connection.connect();
// 定时查询数据库一次，保证mysql八小时内通信一次
function interal()
{
    var chat_interal = 'SELECT * FROM user';
    var data_interal = [];
    connection.query(chat_interal, data_interal, function (err, result) {
        if (err) {
            console.log('查询管理员数据 error---', err.message);
            return;
        }
        console.log('hello')        
    })
}
setInterval(interal,3600000);

//  定义一个map存储各个账号及其token
var map_token = new Map();
// 定义一个管理员map，存储所有正在登录的管理员
var map_manager = new Map();
//一个中间件 检测cookie上面使用username属性 如果有 那么证明登录成功过 否正跳到登录页面
function manager_isLogin(req, res, next) {
    const { m_token } = req.cookies;
    //  没登录就去登录
    if (m_token) { //如果存在
        //  判断m_token是否合法      
        //  查看map    
        console.log('管理员m_token存在');
        if (map_manager.has(m_token.toString())) {
            next();
            console.log('管理员m_token合法');
        } else {
            res.redirect("/login")
            console.log('管理员m_token不合法，去登录');
        }
        //  next();
    } else {
        console.log('m_token不存在');
        res.redirect("/login");
    }

}
//一个中间件 检测cookie上面使用username属性 如果有 那么证明登录成功过 否正跳到登录页面
function isLogin(req, res, next) {
    const { token } = req.cookies;
    //  没登录就去登录
    if (token) { //如果存在
        //  判断token是否合法      
        //  查看map    
        console.log('token存在');
        console.log('_____________________token:')
        console.log(token)
        console.log('_____________________token:')
        console.log('____________________map:')
        console.dir(map_token)
        console.log('____________________map:')
        if (map_token.has(token.toString())) {
            next();
            console.log('token合法');
        } else {
            res.redirect("/login")
            console.log('token不合法，去登录');
        }
        //  next();
    } else {
        console.log('token不存在');
        res.redirect("/login");
    }

}
// 定义一个发送电子邮件的函数
function send_email(to) {
    //创建一个传送器
    const transporter = nodeMailer.createTransport({
        host: "smtp.qq.com", //邮件发送的域名，我们这里使用的是QQ的服务
        port: 587, // SMTP端口号
        secure: false, //secure:true for port 465, secure:false for port 587
        auth: {
            user: "582825762@qq.com", //邮件发送方的邮箱
            pass: "bcpszqzxfcpebcii" //我们开启POP服务生成的授权码
        }
    })
    //配置发件箱和收件箱的信息
    const mailOptions = {
        from: "582825762@qq.com", //发件箱
        to: to, //收件箱地址
        subject: "发货通知", //邮件的标题
        html: new Date().getFullYear() + `年` + (new Date().getMonth() + 1) + `月` + new Date().getDate() + `日` + (new Date().getHours() < 10 ? '0' + new Date().getHours() : new Date().getHours()) + `:` + (new Date().getMinutes() < 10 ? '0' + new Date().getMinutes() : new Date().getMinutes()) + `的订单已经为您发货`
    }
    // 发送邮件：
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            throw new Error("邮件发送失败!")
            return
        }
        console.log(info.response)
    })
}
// get请求返回登录页面
app.get("/login", function (req, res) { //登录       
    fs.readFile('login.html', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'text/html' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'text/html' });
            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})

//  post发送登录数据到后端
app.post("/login", function (req, res) {
    //  获得账号密码        
    let { phone, password } = req.body;
    //  查询结果
    let chat_result;
    // 查询所有数据
    var chat = 'SELECT * FROM manager where phone=? and password=?';
    var data = [phone, password];
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('查询管理员数据 error---', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('管理员登录成功了')
            let temp = new Date().getTime();
            map_manager.set(temp.toString(), phone);
            res.cookie('m_token', temp);
            res.send('manager login');
            // res.redirect('./manager');
            return;
        } else {
            chat = 'SELECT 1 FROM user where phone=? and password=? limit 1';
            connection.query(chat, data, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('该用户存在');
                    // 利用时间戳当作token
                    let temp = new Date().getTime();
                    map_token.set(temp.toString(), phone);
                    // 返回一个带有token的响应

                    // res.cookie('userinfo','cookie111',{maxAge:60000,path:'/news',httpOnly:true}) maxage是指定有效时间，单位为秒，path是指定有效路径
                    // HttpOnly默认fals不允许客户端脚本访问，允许后端进行访问，也允许nodejs进行访问，但不允许前端的js代码进行访问
                    res.cookie('token', temp);
                    res.send('login success');
                } else {
                    console.log('该用户不存在')
                    res.send("login fail");

                }
            });
        }
    })
});

// 利用express模块化来写数据接口
const admin_route = express.Router();
// 将路由和请求路径进行匹配
app.use('/admin', admin_route);
// 返回购买记录
admin_route.get('/api/buy.json',manager_isLogin, function (req, res, text) {    
    //  查询结果
    let chat_result;
    // 查询所有数据
    var chat = 'SELECT a.username,a.phone,a.e_mail, b.book_name,d.buy_num,c.pay_time FROM user a,goods b,the_order c,order_goods d  where a.phone = c.phone and c.order_num = d.order_num and d.goods_number = b.goods_number';   
    data = []
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Cache-Control': 'no-store'
    });   
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('查询购买数据 error---', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('购买信息查询成功');            
            let ans = {
                "code":0,
                "msg":'',
                "count":1000,
                "data":[]
            }
            ans.data = result;            
            ans = JSON.stringify(ans)
            console.dir(ans);
            fs.writeFile('./admin/api/buy.json',ans,function(err,data){
                if(err)
                {
                    console.log('写入buy.json错误:buy.json'+data)
                }
                else
                {
                    fs.readFile('./admin/api/buy.json',function(err,result)
                    {
                        if(err)
                        {
                            console.log('读入buy.json错误:buy.json'+result)
                        }
                        else
                        {
                            console.log('发送数据前')
                            res.write(result);
                            console.log('发送数据后')
                            res.end()  
                        }   
                    })
                }
            })               
        } else {
            res.write({status:0});           
            res.end()  
        }        
    })   
   
})
// 返回浏览记录
admin_route.get('/api/visit.json',manager_isLogin, function (req, res, text) {    
    //  查询结果
    let chat_result;
    // 查询所有数据
    var chat = 'SELECT a.username,a.phone,a.e_mail, b.book_name,c.view_number FROM user a,goods b,user_view c where a.phone = c.phone and c.goods_number = b.goods_number';   
    data = []
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Cache-Control': 'no-store'
    });   
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('查询浏览数据 error---', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('浏览信息查询成功');            
            let ans = {
                "code":0,
                "msg":'',
                "count":1000,
                "data":[]
            }
            ans.data = result;            
            ans = JSON.stringify(ans)
            console.dir(ans);
            fs.writeFile('./admin/api/visit.json',ans,function(err,data){
                if(err)
                {
                    console.log('写入visit.json错误:visit.json'+data)
                }
                else
                {
                    fs.readFile('./admin/api/visit.json',function(err,result)
                    {
                        if(err)
                        {
                            console.log('读入visit.json错误:visit.json'+result)
                        }
                        else
                        {
                            console.log('发送数据前')
                            res.write(result);
                            console.log('发送数据后')
                            res.end()  
                        }   
                    })
                }
            })               
        } else {
            res.write({status:0});           
            res.end()  
        }        
    })   
   
})
// 返回销售状态
admin_route.get('/api/order.json',manager_isLogin, function (req, res, text) {        
    //  查询结果
    let chat_result;
    // 查询所有数据
    var chat = 'SELECT goods_number,book_name,original_price,now_price,sales_volume,storage FROM goods';   
    data = []
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Cache-Control': 'no-store'
    });   
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('查询销售数据 error---', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('销售信息查询成功');            
            let ans = {
                "code":0,
                "msg":'',
                "count":1000,
                "data":[]
            }
            ans.data = result;            
            ans = JSON.stringify(ans)
            console.dir(ans);
            fs.writeFile('./admin/api/order.json',ans,function(err,data){
                if(err)
                {
                    console.log('写入order.json错误:order.json'+data)
                }
                else
                {
                    fs.readFile('./admin/api/order.json',function(err,result)
                    {
                        if(err)
                        {
                            console.log('读入order.json错误:order.json'+result)
                        }
                        else
                        {
                            console.log('发送数据前')
                            res.write(result);
                            console.log('发送数据后')
                            res.end()  
                        }   
                    })
                }
            })               
        } else {
            res.write({status:0});           
            res.end()  
        }        
    })   
   
})
// 返回商品信息
admin_route.get('/api/goods.json',manager_isLogin, function (req, res, text) {        
    //  查询结果
    let chat_result;
    // 查询所有数据
    var chat = 'SELECT goods_number,original_price,now_price,book_name,storage,author,press,publication_date,thumbnail FROM goods';   
    data = []
    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Cache-Control': 'no-store'
    });   
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('查询商品数据 error---', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('商品信息查询成功');            
            let ans = {
                "code":0,
                "msg":'',
                "count":1000,
                "data":[]
            }
            ans.data = result;            
            ans = JSON.stringify(ans)
            console.dir(ans);
            fs.writeFile('./admin/api/goods.json',ans,function(err,data){
                if(err)
                {
                    console.log('写入goods.json错误:goods.json'+data)
                }
                else
                {
                    fs.readFile('./admin/api/goods.json',function(err,result)
                    {
                        if(err)
                        {
                            console.log('读入goods.json错误:goods.json'+result)
                        }
                        else
                        {
                            console.log('发送数据前')
                            res.write(result);
                            console.log('发送数据后')
                            res.end()  
                        }   
                    })
                }
            })               
        } else {
            res.write({status:0});           
            res.end()  
        }        
    })   
   
})
// 添加商品信息
admin_route.post('/api/add_goods.json',manager_isLogin, function (req, res, text) { 
    console.log('收到了添加商品的请求');
    let temp = (new Date().getTime() * 3).toString();         
    let { book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,img_string} = req.body;   
    // 查询所有数据
    var insert = 'insert into goods (book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,sales_volume,goods_number,thumbnail) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?);';
    var data = [book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,temp,img_string];
    connection.query(insert, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        console.log('添加成功');
        res.send('添加成功');
    });
})
// 修改商品信息
admin_route.post('/api/edit_goods.json',manager_isLogin, function (req, res, text) { 
    console.log('收到了修改商品的请求');
    let { book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,goods_number,img_string } = req.body;   
    // 查询所有数据
    var update = 'update goods set book_name=?,original_price=?,now_price=?,storage=?,shipping_merchant=?,service_merchant=?,author=?,press=?,publication_date=?,isbn_num=?,folio=?,page=?,version=?,author_introduce=?,content_introduce=?,thumbnail=? where goods_number=? ;';
    var data = [book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,img_string,goods_number];
    connection.query(update, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        console.log('修改成功');
        res.send('修改成功');
    });
})
// 删除商品信息
admin_route.post('/api/delete_goods.json',manager_isLogin, function (req, res, text) { 
    console.log('收到了删除商品的请求');
    let { goods_number } = req.body;   
    // 查询所有数据
    var delete_d = 'DELETE FROM goods WHERE goods_number=?';
    var data = [goods_number];
    connection.query(delete_d, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        console.log('删除成功');
        res.send('删除成功');
    });
})
admin_route.get('*', manager_isLogin, function (req, res, text) {  
        //解析请求，包括文件名
        var pathname = url.parse(req.url).pathname;
        //输出请求的文件名
        console.log("req for " + pathname + "  received.");
        console.log(req.url);
        //当请求css文件夹时，url解析后为/css/xxxx.css,firstDir为xxxx.css,设置文件返回类型是text/css       
        var ContentType = null;
        // 文件格式
        let type_of_file = "";
        console.log('文件类型'+pathname.split('.')[pathname.split('.').length-1]);
        // 用.作为分隔符来判断文件类型，直接访问端口一律默认为请求html文件
        if (pathname && pathname.split('.')[pathname.split('.').length-1] === 'css') {
            ContentType = {
                'Content-Type': 'text/css'
            };
            type_of_file = '.css'
        } else if (pathname && pathname.split('.')[pathname.split('.').length-1] === 'js') {
            ContentType = {
                'Content-Type': 'text/javascript'
            }
            type_of_file = ".js"
        } else if (pathname && pathname.split('.')[pathname.split('.').length-1] === 'png') {
            ContentType = { 'Content-Type': 'image/png' }
            type_of_file = ".png"
        } else if (pathname && pathname.split('.')[pathname.split('.').length-1] === 'jpg') {
            ContentType = { 'Content-Type': 'image/jpg' }
            type_of_file = ".jpg"
        } else if (pathname && pathname.split('.')[pathname.split('.').length-1] === 'gif') {
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
        fs.readFile('./admin/' + pathname.substr(1), function (err, data) {
            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                res.writeHead(404, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });
                console.log('读取失败'+pathname)
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                res.writeHead(200, ContentType);         
                console.log('读取文件'+pathname)
                //写会回相应内容
                res.write(data);
            }
            //发送响应数据
            res.end();
        });
    
})
// 管理系统的接口↑
// 响应登录的样式↓
app.get("/css/page.css", function (req, res) { //登录       
    fs.readFile('./css/page.css', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'text/css' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'text/css' });

            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})
app.get("/image/login/loginPic.jpg", function (req, res) { //登录       
    fs.readFile('./image/login/loginPic.jpg', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'image/jpg' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'image/jpg' });

            //写会回相应内容
            res.write(data);
        }
        //发送响应数据
        res.end();
    });
})
app.get("/image/icon/pwd-icons-new.png", function (req, res) { //登录       
    fs.readFile('./image/icon/pwd-icons-new.png', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'image/png' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'image/png' });

            //写会回相应内容
            res.write(data);
        }
        //发送响应数据
        res.end();
    });
})
app.get("/css/reset.css", function (req, res) { //登录       
    fs.readFile('./css/reset.css', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'text/css' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'text/css' });

            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})
app.get("/js/jquey-1.8.0.min.js", function (req, res) { //登录       
    fs.readFile('./js/jquey-1.8.0.min.js', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'text/javascript' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'text/javascript' });

            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})
app.get("/image/icon/litIcon.ico", function (req, res) { //登录       
    fs.readFile('./image/icon/litIcon.ico', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'image/x-icon' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'image/x-icon' });

            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})
// 响应登录的样式↑
// 注册页面
app.get("/inputRegisterMess.html", function (req, res) {
    fs.readFile('inputRegisterMess.html', function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            res.writeHead(404, { 'Content-Type': 'text/html' });
        } else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            res.writeHead(200, { 'Content-Type': 'text/html' });

            //写会回相应内容
            res.write(data.toString());
        }
        //发送响应数据
        res.end();
    });
})
// 注册的数据接口
app.post("/inputRegisterMess", function (req, res) {
    let { phone, username, e_mail, password } = req.body;
    //  password = crypto.createHmac("md5", "cyl").update(password).digest("hex");
    //  User.create({ username, password }, function(err, doc) {
    //      if (err) { //对错误处理
    //      }
    //      //目前对账号的唯一性不做要求
    //      if (doc) { //注册成功
    //          res.cookie("username", username);
    //          res.redirect("/main");
    //          res.end();
    //      }
    //  })
    // 查询所有数据
    var chat = 'SELECT 1 FROM user where phone=? limit 1';
    var data = [phone];
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('注册的用户早已存在');
            res.send("has_exist")

        } else {
            res.send("register_success")
            console.log('注册的用户不存在')
            // 创建购物车
            let temp = (new Date().getTime() * 2).toString();
            var insert = 'insert into  the_order(order_num,phone,payment_state) values(?,?,0);';
            var data = [temp, phone]
            connection.query(insert, data, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log("创建购物车成功");
            });
            // 插入数据     
            insert = 'insert into user(phone,username,e_mail,password) values(?,?,?,?);';
            data = [phone, username, e_mail, password];
            connection.query(insert, data, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log("success!!");
            });
            //  connection.end();

        }
    });


})
// 响应注册页面的样式↓
app.get('/css/newUser.css', function (req, res) {
    res.setHeader('Content-Type', 'text/css');
    fs.readFile('./css/newUser.css', function (err, data) {
        res.send(data);
    });
});
app.get('/image/register_bg.jpg', function (req, res) {
    res.setHeader('Content-Type', 'image/jpg');
    fs.readFile('./image/register_bg.jpg', function (err, data) {
        res.send(data);
    });
});
app.get('/image/sprite.png', function (req, res) {
    res.setHeader('Content-Type', 'image/png');
    fs.readFile('./image/sprite.png', function (err, data) {
        res.send(data);
    });
});
// 响应注册页面的样式↑
// 响应公安样式
app.get('/picture/gongan', function (req, res) {
    res.setHeader('Content-Type', 'text/png');
    fs.readFile('./image/gongan.png', function (err, data) {
        res.send(data);
    });
});
// 商品详情页面,用来统计浏览记录
app.get('/showDetail.html', isLogin, function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    // 正则表达式筛选商品id
    let regexp = /goods_number=/g;
    if (regexp.test(req.url)) {
        console.log('商品详情');
        console.dir(req.url.split('goods_number=')[1]);
        console.log('商品详情');
        let goods_number = req.url.split('goods_number=')[1];
        var chat = 'select * from user_view where goods_number=?';
        var data = [goods_number];
        connection.query(chat, data, function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            if (result.length != 0) {
                console.log('该浏览记录存在');
                var update = "update user_view set view_number = view_number+1 where goods_number=?;" 
                connection.query(update, data, function (err, result) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    } else {
                        console.log('更新浏览记录成功');                   
                    }
                })               
            } else {
                console.log('该浏览记录不存在');
                const { token } = req.cookies;
                let phone = map_token.get(token.toString());
                var insert = "insert into  user_view(goods_number,phone,view_number) values(?,?,1);" 
                data = [goods_number,phone]
                connection.query(insert, data, function (err, result) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    } else {
                        console.log('更新浏览记录成功');                        
                    }
                })               
            }
        })
        fs.readFile('./showDetail.html', function (err, data) {
            res.send(data);
        });
    }
    else {
        res.send('没有商品id,请求失败')
    }

})

// 利用express模块化来写数据接口
const each_route = express.Router();
// 将路由和请求路径进行匹配
app.use('/database', each_route)
// 商品列表的接口
each_route.get('/goods', isLogin, function (req, res) {
    // 查询所有数据
    var chat = 'SELECT * FROM goods';
    connection.query(chat, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('有商品信息');
            res.send(result)
        } else {
            console.log('没有商品信息')
        }
    });
})
//  商品详情的接口
each_route.post('/goods_detail', isLogin, function (req, res) {
    //  获得商品id        
    let { goods_number } = req.body;
    if (goods_number) {
        var chat = 'select * from goods where goods_number=?';
        var data = [goods_number];
        connection.query(chat, data, function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            if (result.length != 0) {
                console.log('该商品存在');
                res.send(result);
            } else {
                console.log('该商品不存在');
                res.send('无该商品的数据');
            }
        })
    } else {
        res.send('无该商品的数据');
    }
})
//  添加购物车的接口
each_route.post('/add_goods', isLogin, function (req, res) {
    //  获得商品id        
    let { goods_number, buy_num } = req.body;
    const { token } = req.cookies;
    let phone = map_token.get(token.toString());
    if (goods_number) {
        // 先找出订单号
        let order_num = '';
        var chat = 'select order_num from the_order where phone=? and payment_state=0;';
        var data = [phone];
        connection.query(chat, data, function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            if (result.length != 0) {
                console.log('该商品存在');
                order_num = result[0].order_num;
                console.log(result)
                // 再插入数据
                console.log('buynum:' + buy_num)
                console.log('goods_number:' + goods_number)
                console.log('order_num:' + order_num)
                var insert = "insert into order_goods (goods_number,buy_num,order_num) values(?,?,?);"
                data = [goods_number, buy_num, order_num]
                connection.query(insert, data, function (err, result) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    } else {
                        console.log('插入数据成功');
                        res.send('插入数据成功')
                    }
                })

            } else {
                console.log('该商品不存在');
            }
        })

    } else {
        res.send('无该商品的数据');
    }
})
//  从购物车表获得信息的接口
each_route.post('/shop_car', isLogin, function (req, res) {
    //  获得商品id        
    // let { goods_number, buy_num } = req.body;
    const { token } = req.cookies;
    let phone = map_token.get(token.toString());
    // 先找出订单号
    let order_num = '';
    var chat = 'select order_num from the_order where phone=? and payment_state=0;';
    var data = [phone];
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('该订单存在');
            order_num = result[0].order_num;
            console.log(result)
            // 最后根据订单号返回所有商品信息
            chat = `select * from the_order a,order_goods b,goods c
                            where c.goods_number=b.goods_number
                            and a.order_num=b.order_num 
                            and b.order_num=?;`;
            data = [order_num];
            connection.query(chat, data, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('该订单存在');
                    res.send(result);
                } else {
                    console.log('该订单不存在');
                    res.send(false);
                }
            })

        } else {
            console.log('该订单不存在');
            res.send(false);
        }
    })


})
// 从购物车提交订单信息的接口
each_route.post('/order_message', isLogin, function (req, res) {
    //  获得商品id        
    let { rev_name, rev_license, rev_phone, rev_place, payment_style } = req.body;
    const { token } = req.cookies;
    let phone = map_token.get(token.toString());

    // 先找出订单号
    let order_num = '';
    var chat = 'select order_num from the_order where phone=? and payment_state=0';
    var data = [phone];
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('找出订单[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            console.log('该订单存在');
            order_num = result[0].order_num;
            console.log(result)
            // 找出该订单包含的所有商品，更新销量与库存
            chat = 'select a.goods_number,buy_num from order_goods a,goods b where a.order_num = ? and a.goods_number = b.goods_number'
            data = [order_num]
            connection.query(chat, data, function (err, result) {
                if (err) {
                    console.log(' 找出该订单包含的所有商品[SELECT ERROR] - ', err.message);
                    return;
                } else {
                    for (let i = 0; i < result.length; i++) {
                        //修改存量
                        update = `update goods set sales_volume = sales_volume+?,storage = storage-? where goods_number=?;`;
                        data = [result[i].buy_num, result[i].buy_num, result[i].goods_number];
                        connection.query(update, data, function (err, result) {
                            if (err) {
                                console.log('更新商品库存和销量[SELECT ERROR] - ', err.message);
                                return;
                            }
                            console.log('更新商品库存和销量成功');
                        })
                    }

                }
            })
            // 填入信息，结束订单
            let pay_time = new Date().getFullYear()+'年'+(new Date().getMonth()+1)+'月'+new Date().getDate()+'日'+new Date().getHours()+':'+new Date().getMinutes()+':'+new Date().getSeconds();
            update = `update the_order set pay_time=?, rev_name=?,rev_license=?,rev_phone=?,rev_place=?,payment_style=?,payment_state=1  WHERE phone=? and payment_state=0;`;
            data = [pay_time,rev_name, rev_license, rev_phone, rev_place, payment_style, phone];
            connection.query(update, data, function (err, result) {
                if (err) {
                    console.log('更新订单[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log('更新订单成功');
            })
            // 创建新的购物车
            let temp = (new Date().getTime() * 2).toString();
            var insert = 'insert into  the_order(order_num,phone,payment_state) values(?,?,0);';
            var data = [temp, phone]
            connection.query(insert, data, function (err, result) {
                if (err) {
                    console.log('创建购物车[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log("创建购物车成功");
                res.send(true);
            });

        } else {
            console.log('该订单不存在');

        }
    })

    //同时找出电子邮箱发送邮件
    chat = 'select e_mail from user where phone=?';
    data = [phone];
    let email_url = '';
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            email_url = result[0].e_mail
            send_email(email_url);
            console.log('该电子邮箱已注册');
            return;
        } else {
            console.log('该电子邮箱未注册');
            return;
        }
    })
})
// 从单次购买提交订单信息的接口
each_route.post('/buy_a_time', isLogin, function (req, res) {
    //  获得商品id        
    let { rev_name, rev_license, rev_phone, rev_place, payment_style, goods_number, buy_num } = req.body;
    const { token } = req.cookies;
    let phone = map_token.get(token.toString());

    // 创建新的购物车
    let temp = (new Date().getTime() * 2).toString();
    let pay_time = new Date().getFullYear()+'年'+(new Date().getMonth()+1)+'月'+new Date().getDate()+'日'+new Date().getHours()+':'+new Date().getMinutes()+':'+new Date().getSeconds();
    var insert = 'insert into  the_order(order_num,phone,payment_state,rev_name, rev_license, rev_phone, rev_place, payment_style,pay_time) values(?,?,1,?,?,?,?,?,?);';
    var data = [temp, phone, rev_name, rev_license, rev_phone, rev_place, payment_style,pay_time]
    res.send(true);
    connection.query(insert, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        console.log("创建购物车成功");
    });
    insert = 'insert into  order_goods(goods_number,buy_num,order_num) values(?,?,?);';
    var data = [goods_number, buy_num, temp]
    connection.query(insert, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        console.log("插入订单商品表成功");
    });

    //同时找出电子邮箱发送邮件
    chat = 'select e_mail from user where phone=?';
    data = [phone];
    let email_url = '';
    connection.query(chat, data, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (result.length != 0) {
            email_url = result[0].e_mail
            send_email(email_url);
            console.log('该电子邮箱已注册');
            return;
        } else {
            console.log('该电子邮箱未注册');
            return;
        }
    })
})
// 返回其他数据和页面
app.get('*', isLogin, function (req, res, text) {
    //从文件系统中去请求的文件内容.
    // 如43.110.23.440:80/index.js,那么req.url为/index.js,req.url.substr(1)为index.js
    // 访问端口的话，req.url为/，那么直接返回主页面
    if (req.url == '/'||req.url == '/index'||req.url == '/index.html') {
        fs.readFile('byPageShow.html', function (err, data) {
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
    }    
    else {
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
        fs.readFile('./' + pathname.substr(1), function (err, data) {

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
// 错误处理中间件
// app.use((err, req, res, next) => {
//     res.status(500).send(err.message);
// })
app.use((req, res, next) => {
    console.log('hello')
})

app.listen(80, () => {
    console.log("http://localhost:80已经打开")
});