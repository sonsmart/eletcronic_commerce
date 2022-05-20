export function register(app, fs, connection) {
    // 注册页面
    app.get("/inputRegisterMess.html", function(req, res) {
            fs.readFile('inputRegisterMess.html', function(err, data) {
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
    app.post("/inputRegisterMess", function(req, res) {
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
        connection.query(chat, data, function(err, result) {
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
                connection.query(insert, data, function(err, result) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }
                    console.log("创建购物车成功");
                });
                // 插入数据     
                insert = 'insert into user(phone,username,e_mail,password) values(?,?,?,?);';
                data = [phone, username, e_mail, password];
                connection.query(insert, data, function(err, result) {
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
}