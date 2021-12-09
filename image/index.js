var http = require('http');
var fs = require('fs');
var url = require('url');

//创建服务器
http.createServer(function(request, response) {
    //从文件系统中去请求的文件内容.
    // 如43.110.23.440:80/index.js,那么request.url为/index.js,request.url.substr(1)为index.js
    // 访问端口的话，request.url为/，那么直接返回主页面
    if (request.url == '/') {
        fs.readFile('index.html', function(err, data) {
            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                response.writeHead(404, { 'Content-Type': 'text/html' });
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                response.writeHead(200, { 'Content-Type': 'text/html' });

                //写会回相应内容
                response.write(data.toString());
            }
            //发送响应数据
            response.end();
        });
    }
    // 访问这个端口的话，就访问数据库
    // else if (request.url == '/login') {
    //     var mysql = require('../lib/node_modules/mysql');
    //     var connection = mysql.createConnection({
    //         host: 'localhost',
    //         user: 'root',
    //         password: '582825762w',
    //         database: 'home'
    //     });
    //     connection.connect();
    //     console.log(request.data)
    // } 
    else {
        //解析请求，包括文件名
        var pathname = url.parse(request.url).pathname;
        //输出请求的文件名
        console.log("Request for " + pathname + "  received.");
        console.log(request.url);
        //当请求css文件夹时，url解析后为/css/xxxx.css,firstDir为xxxx.css,设置文件返回类型是text/css
        var firstDir = pathname && pathname.split('/')[2];
        var ContentType = null;

        // 用.作为分隔符来判断文件类型，直接访问端口一律默认为请求html文件
        if (firstDir && firstDir.split('.')[1] === 'css') {
            ContentType = { 'Content-Type': 'text/css' };
        } else if (firstDir && firstDir.split('.')[1] === 'js') {
            ContentType = { 'Content-Type': 'text/javascript' }
        } else if (firstDir && firstDir.split('.')[1] === 'png') {
            ContentType = { 'Content-Type': 'image/png' }
        } else if (firstDir && firstDir.split('.')[1] === 'jpg') {
            ContentType = { 'Content-Type': 'image/jpg' }
        } else if (firstDir && firstDir.split('.')[1] === 'gif') {
            ContentType = { 'Content-Type': 'image/gif' }
        } else {
            ContentType = { 'Content-Type': 'text/html' }
        }
        fs.readFile(pathname.substr(1), function(err, data) {
            console.log('______________path')
            console.log(pathname.substr(1))
            console.log('______________path')
            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                response.writeHead(404, { 'Content-Type': 'text/html' });
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                response.writeHead(200, ContentType);

                //写会回相应内容
                response.write(data.toString());
            }
            //发送响应数据
            response.end();
        });
    }
}).listen(80);

console.log('Server running at http://127.0.0.1:80/');