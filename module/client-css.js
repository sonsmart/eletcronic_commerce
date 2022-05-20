export function clientCss(app, fs) {
    app.get("/css/page.css", function(req, res) { //登录       
        fs.readFile('./css/page.css', function(err, data) {
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
    app.get("/image/login/loginPic.jpg", function(req, res) { //登录       
        fs.readFile('./image/login/loginPic.jpg', function(err, data) {
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
    app.get("/image/icon/pwd-icons-new.png", function(req, res) { //登录       
        fs.readFile('./image/icon/pwd-icons-new.png', function(err, data) {
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
    app.get("/css/reset.css", function(req, res) { //登录       
        fs.readFile('./css/reset.css', function(err, data) {
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
    app.get("/js/jquey-1.8.0.min.js", function(req, res) { //登录       
        fs.readFile('./js/jquey-1.8.0.min.js', function(err, data) {
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
    app.get("/image/icon/litIcon.ico", function(req, res) { //登录       
        fs.readFile('./image/icon/litIcon.ico', function(err, data) {
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
    app.get('/css/newUser.css', function(req, res) {
        res.setHeader('Content-Type', 'text/css');
        fs.readFile('./css/newUser.css', function(err, data) {
            res.send(data);
        });
    });
    app.get('/image/register_bg.jpg', function(req, res) {
        res.setHeader('Content-Type', 'image/jpg');
        fs.readFile('./image/register_bg.jpg', function(err, data) {
            res.send(data);
        });
    });
    app.get('/image/sprite.png', function(req, res) {
        res.setHeader('Content-Type', 'image/png');
        fs.readFile('./image/sprite.png', function(err, data) {
            res.send(data);
        });
    });
    // 响应公安样式
    app.get('/picture/gongan', function(req, res) {
        res.setHeader('Content-Type', 'text/png');
        fs.readFile('./image/gongan.png', function(err, data) {
            res.send(data);
        });
    });
}