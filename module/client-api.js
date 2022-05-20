export function clientAPI(app, fs, connection, map_token, each_route, send_email, isLogin) {

    // 商品列表的接口
    each_route.get('/goods', isLogin, function(req, res) {
            // 查询所有数据
            var chat = 'SELECT * FROM goods';
            connection.query(chat, function(err, result) {
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
    each_route.post('/goods_detail', isLogin, function(req, res) {
            //  获得商品id        
            let { goods_number } = req.body;
            if (goods_number) {
                var chat = 'select * from goods where goods_number=?';
                var data = [goods_number];
                connection.query(chat, data, function(err, result) {
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
    each_route.post('/add_goods', isLogin, function(req, res) {
            //  获得商品id        
            let { goods_number, buy_num } = req.body;
            const { token } = req.cookies;
            let phone = map_token.get(token.toString());
            if (goods_number) {
                // 先找出订单号
                let order_num = '';
                var chat = 'select order_num from the_order where phone=? and payment_state=0;';
                var data = [phone];
                connection.query(chat, data, function(err, result) {
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
                        connection.query(insert, data, function(err, result) {
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
    each_route.post('/shop_car', isLogin, function(req, res) {
            //  获得商品id        
            // let { goods_number, buy_num } = req.body;
            const { token } = req.cookies;
            let phone = map_token.get(token.toString());
            // 先找出订单号
            let order_num = '';
            var chat = 'select order_num from the_order where phone=? and payment_state=0;';
            var data = [phone];
            connection.query(chat, data, function(err, result) {
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
                    connection.query(chat, data, function(err, result) {
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
    each_route.post('/order_message', isLogin, function(req, res) {
            //  获得商品id        
            let { rev_name, rev_license, rev_phone, rev_place, payment_style } = req.body;
            const { token } = req.cookies;
            let phone = map_token.get(token.toString());

            // 先找出订单号
            let order_num = '';
            var chat = 'select order_num from the_order where phone=? and payment_state=0';
            var data = [phone];
            connection.query(chat, data, function(err, result) {
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
                    connection.query(chat, data, function(err, result) {
                            if (err) {
                                console.log(' 找出该订单包含的所有商品[SELECT ERROR] - ', err.message);
                                return;
                            } else {
                                for (let i = 0; i < result.length; i++) {
                                    //修改存量
                                    update = `update goods set sales_volume = sales_volume+?,storage = storage-? where goods_number=?;`;
                                    data = [result[i].buy_num, result[i].buy_num, result[i].goods_number];
                                    connection.query(update, data, function(err, result) {
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
                    let pay_time = new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
                    update = `update the_order set pay_time=?, rev_name=?,rev_license=?,rev_phone=?,rev_place=?,payment_style=?,payment_state=1  WHERE phone=? and payment_state=0;`;
                    data = [pay_time, rev_name, rev_license, rev_phone, rev_place, payment_style, phone];
                    connection.query(update, data, function(err, result) {
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
                    connection.query(insert, data, function(err, result) {
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
            connection.query(chat, data, function(err, result) {
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
    each_route.post('/buy_a_time', isLogin, function(req, res) {
            //  获得商品id        
            let { rev_name, rev_license, rev_phone, rev_place, payment_style, goods_number, buy_num } = req.body;
            const { token } = req.cookies;
            let phone = map_token.get(token.toString());
            //修改存量
            update = `update goods set sales_volume = sales_volume+1,storage = storage-1 where goods_number=?;`;
            data = [goods_number];
            connection.query(update, data, function(err, result) {
                    if (err) {
                        console.log('更新商品库存和销量[SELECT ERROR] - ', err.message);
                        return;
                    }
                    console.log('更新商品库存和销量成功');
                })
                // 创建新的购物车
            let temp = (new Date().getTime() * 2).toString();
            let pay_time = new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
            var insert = 'insert into  the_order(order_num,phone,payment_state,rev_name, rev_license, rev_phone, rev_place, payment_style,pay_time) values(?,?,1,?,?,?,?,?,?);';
            var data = [temp, phone, rev_name, rev_license, rev_phone, rev_place, payment_style, pay_time]
            res.send(true);
            connection.query(insert, data, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log("创建购物车成功");
            });
            // 更新购买记录
            insert = 'insert into  order_goods(goods_number,buy_num,order_num) values(?,?,?);';
            var data = [goods_number, buy_num, temp]
            connection.query(insert, data, function(err, result) {
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
            connection.query(chat, data, function(err, result) {
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
        // 商品详情页面,用来统计浏览记录
    app.get('/showDetail.html', isLogin, function(req, res) {
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
                connection.query(chat, data, function(err, result) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }
                    if (result.length != 0) {
                        console.log('该浏览记录存在');
                        var update = "update user_view set view_number = view_number+1 where goods_number=?;"
                        connection.query(update, data, function(err, result) {
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
                        data = [goods_number, phone]
                        connection.query(insert, data, function(err, result) {
                            if (err) {
                                console.log('[SELECT ERROR] - ', err.message);
                                return;
                            } else {
                                console.log('更新浏览记录成功');
                            }
                        })
                    }
                })
                fs.readFile('./showDetail.html', function(err, data) {
                    res.send(data);
                });
            } else {
                res.send('没有商品id,请求失败')
            }

        })
        // get请求返回商品列表页面
    app.get("/byPageShow.html", function(req, res) { //登录       
        fs.readFile('byPageShow.html', function(err, data) {
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
}