export function login(app, fs, connection, map_manager, map_salesman, map_token) {
    app.get("/login", function(req, res) { //登录       
            fs.readFile('login.html', function(err, data) {
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
    app.post("/login", function(req, res) {
        //  获得账号密码        
        let { phone, password } = req.body;
        // 查询管理员所有数据
        var chat = 'SELECT * FROM manager where phone=? and password=?';
        var data = [phone, password];
        connection.query(chat, data, function(err, result) {
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
                console.log('管理员api发送了')
                    // res.redirect('./admin/index.html');
                return;
            } else {
                // 查询所有销售人员数据
                chat = 'SELECT * FROM salesman where account=? and password=?';
                data = [phone, password];
                connection.query(chat, data, function(err, result) {
                    if (err) {
                        console.log('查询销售人员数据 error---', err.message);
                        return;
                    }
                    if (result.length != 0) {
                        console.log('销售人员登录成功了')
                        let temp = new Date().getTime();
                        map_salesman.set(temp.toString(), phone);
                        res.cookie('m_token', temp);
                        res.send('salesman login');
                        // res.redirect('./salesman/index.html');
                        return;
                    } else {
                        chat = 'SELECT 1 FROM user where phone=? and password=? limit 1';
                        connection.query(chat, data, function(err, result) {
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

            }
        })
    });
}