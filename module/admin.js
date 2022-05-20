export function admin(admin_route, app, manager_isLogin, url, fs, connection) {
    // 返回购买记录
    admin_route.get('/api/buy.json', manager_isLogin, function(req, res, text) {
            //  查询结果
            let chat_result;
            // 查询所有数据
            var chat = 'SELECT a.username,a.phone,a.e_mail, b.book_name,d.buy_num,c.pay_time FROM user a,goods b,the_order c,order_goods d  where a.phone = c.phone and c.order_num = d.order_num and d.goods_number = b.goods_number';
            let data = []
            res.writeHead(200, {
                'Content-Type': 'text/json',
                'Cache-Control': 'no-store'
            });
            connection.query(chat, data, function(err, result) {
                if (err) {
                    console.log('查询购买数据 error---', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('购买信息查询成功');
                    let ans = {
                        "code": 0,
                        "msg": '',
                        "count": 1000,
                        "data": []
                    }
                    ans.data = result;
                    ans = JSON.stringify(ans)
                    console.dir(ans);
                    fs.writeFile('./admin/api/buy.json', ans, function(err, data) {
                        if (err) {
                            console.log('写入buy.json错误:buy.json' + data)
                        } else {
                            fs.readFile('./admin/api/buy.json', function(err, result) {
                                if (err) {
                                    console.log('读入buy.json错误:buy.json' + result)
                                } else {
                                    console.log('发送数据前')
                                    res.write(result);
                                    console.log('发送数据后')
                                    res.end()
                                }
                            })
                        }
                    })
                } else {
                    res.end('{"code": 0}')
                }
            })

        })
        // 返回浏览记录
    admin_route.get('/api/visit.json', manager_isLogin, function(req, res, text) {
            //  查询结果
            let chat_result;
            // 查询所有数据
            var chat = 'SELECT a.username,a.phone,a.e_mail, b.book_name,c.view_number FROM user a,goods b,user_view c where a.phone = c.phone and c.goods_number = b.goods_number;';
            let data = []
            res.writeHead(200, {
                'Content-Type': 'text/json',
                'Cache-Control': 'no-store'
            });
            connection.query(chat, data, function(err, result) {
                if (err) {
                    console.log('查询浏览数据 error---', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('浏览信息查询成功');
                    let ans = {
                        "code": 0,
                        "msg": '',
                        "count": 1000,
                        "data": []
                    }
                    ans.data = result;
                    ans = JSON.stringify(ans)
                    console.dir(ans);
                    fs.writeFile('./admin/api/visit.json', ans, function(err, data) {
                        if (err) {
                            console.log('写入visit.json错误:visit.json' + data)
                        } else {
                            fs.readFile('./admin/api/visit.json', function(err, result) {
                                if (err) {
                                    console.log('读入visit.json错误:visit.json' + result)
                                } else {
                                    console.log('发送数据前')
                                    res.write(result);
                                    console.log('发送数据后')
                                    res.end()
                                }
                            })
                        }
                    })
                } else {
                    res.end('{"code": 0}')
                }
            })

        })
        // 返回销售状态
    admin_route.get('/api/order.json', manager_isLogin, function(req, res, text) {
            //  查询结果
            let chat_result;
            // 查询所有数据
            var chat = 'SELECT goods_number,book_name,original_price,now_price,sales_volume,storage FROM goods';
            let data = []
            res.writeHead(200, {
                'Content-Type': 'text/json',
                'Cache-Control': 'no-store'
            });
            connection.query(chat, data, function(err, result) {
                if (err) {
                    console.log('查询销售数据 error---', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('销售信息查询成功');
                    let ans = {
                        "code": 0,
                        "msg": '',
                        "count": 1000,
                        "data": []
                    }
                    ans.data = result;
                    ans = JSON.stringify(ans)
                    console.dir(ans);
                    fs.writeFile('./admin/api/order.json', ans, function(err, data) {
                        if (err) {
                            console.log('写入order.json错误:order.json' + data)
                        } else {
                            fs.readFile('./admin/api/order.json', function(err, result) {
                                if (err) {
                                    console.log('读入order.json错误:order.json' + result)
                                } else {
                                    console.log('发送数据前')
                                    res.write(result);
                                    console.log('发送数据后')
                                    res.end()
                                }
                            })
                        }
                    })
                } else {
                    res.end('{"code": 0}')
                }
            })

        })
        // 返回商品信息
    admin_route.get('/api/goods.json', manager_isLogin, function(req, res, text) {
            //  查询结果
            let chat_result;
            // 查询所有数据
            var chat = 'SELECT goods_number,original_price,now_price,book_name,storage,author,press,publication_date,thumbnail FROM goods';
            let data = []
            res.writeHead(200, {
                'Content-Type': 'text/json',
                'Cache-Control': 'no-store'
            });
            connection.query(chat, data, function(err, result) {
                if (err) {
                    console.log('查询商品数据 error---', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('商品信息查询成功');
                    let ans = {
                        "code": 0,
                        "msg": '',
                        "count": 1000,
                        "data": []
                    }
                    ans.data = result;
                    ans = JSON.stringify(ans)
                    console.dir(ans);
                    fs.writeFile('./admin/api/goods.json', ans, function(err, data) {
                        if (err) {
                            console.log('写入goods.json错误:goods.json' + data)
                        } else {
                            fs.readFile('./admin/api/goods.json', function(err, result) {
                                if (err) {
                                    console.log('读入goods.json错误:goods.json' + result)
                                } else {
                                    console.log('发送数据前')
                                    res.write(result);
                                    console.log('发送数据后')
                                    res.end()
                                }
                            })
                        }
                    })
                } else {
                    res.end('{"code": 0}')
                }
            })

        })
        // 返回销售人员信息
    admin_route.get('/api/salesman.json', manager_isLogin, function(req, res, text) {
            //  查询结果
            let chat_result;
            // 查询所有数据
            var chat = 'SELECT id,account,password FROM salesman';
            let data = []
            res.writeHead(200, {
                'Content-Type': 'text/json',
                'Cache-Control': 'no-store'
            });
            connection.query(chat, data, function(err, result) {
                if (err) {
                    console.log('查询销售人员信息 error---', err.message);
                    return;
                }
                if (result.length != 0) {
                    console.log('销售人员信息查询成功');
                    let ans = {
                        "code": 0,
                        "msg": '',
                        "count": 1000,
                        "data": []
                    }
                    ans.data = result;
                    ans = JSON.stringify(ans)
                    console.dir(ans);
                    fs.writeFile('./admin/api/salesman.json', ans, function(err, data) {
                        if (err) {
                            console.log('写入salesman.json错误:salesman.json' + data)
                        } else {
                            fs.readFile('./admin/api/salesman.json', function(err, result) {
                                if (err) {
                                    console.log('读入salesman.json错误:salesman.json' + result)
                                } else {
                                    console.log('发送数据前')
                                    res.write(result);
                                    console.log('发送数据后')
                                    res.end()
                                }
                            })
                        }
                    })
                } else {
                    res.end('{"code": 0}')
                }
            })

        })
        // 添加商品信息
    admin_route.post('/api/add_goods.json', manager_isLogin, function(req, res, text) {
            console.log('收到了添加商品的请求');
            let temp = (new Date().getTime() * 3).toString();
            let { book_name, original_price, now_price, storage, shipping_merchant, service_merchant, author, press, publication_date, isbn_num, folio, page, version, author_introduce, content_introduce, img_string } = req.body;
            // 查询所有数据
            var insert = 'insert into goods (book_name,original_price,now_price,storage,shipping_merchant,service_merchant,author,press,publication_date,isbn_num,folio,page,version,author_introduce,content_introduce,sales_volume,goods_number,thumbnail) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?);';
            var data = [book_name, original_price, now_price, storage, shipping_merchant, service_merchant, author, press, publication_date, isbn_num, folio, page, version, author_introduce, content_introduce, temp, img_string];
            connection.query(insert, data, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log('添加成功');
                res.send('添加成功');
            });
        })
        // 添加销售人员信息
    admin_route.post('/api/add_salesman.json', manager_isLogin, function(req, res, text) {
            console.log('收到了添加销售人员的请求');
            let temp = (new Date().getTime() * 4).toString();
            let { account, password } = req.body;
            // 查询所有数据
            var insert = 'insert into salesman (id,account,password) values(?,?,?);';
            var data = [temp, account, password];
            connection.query(insert, data, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log('添加成功');
                res.send('添加成功');
            });
        })
        // 修改商品信息
    admin_route.post('/api/edit_goods.json', manager_isLogin, function(req, res, text) {
            console.log('收到了修改商品的请求');
            let { book_name, original_price, now_price, storage, shipping_merchant, service_merchant, author, press, publication_date, isbn_num, folio, page, version, author_introduce, content_introduce, goods_number, img_string } = req.body;
            // 查询所有数据
            var update = 'update goods set book_name=?,original_price=?,now_price=?,storage=?,shipping_merchant=?,service_merchant=?,author=?,press=?,publication_date=?,isbn_num=?,folio=?,page=?,version=?,author_introduce=?,content_introduce=?,thumbnail=? where goods_number=? ;';
            var data = [book_name, original_price, now_price, storage, shipping_merchant, service_merchant, author, press, publication_date, isbn_num, folio, page, version, author_introduce, content_introduce, img_string, goods_number];
            connection.query(update, data, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log('修改成功');
                res.send('修改成功');
            });
        })
        // 删除商品信息
    admin_route.post('/api/delete_goods.json', manager_isLogin, function(req, res, text) {
            console.log('收到了删除商品的请求');
            let { goods_number } = req.body;
            // 查询所有数据
            var delete_d = 'DELETE FROM goods WHERE goods_number=?';
            var data = [goods_number];
            connection.query(delete_d, data, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                console.log('删除成功');
                res.send('删除成功');
            });
        })
        // 删除销售人员信息
    admin_route.post('/api/delete_salesman.json', manager_isLogin, function(req, res, text) {
        console.log('收到了删除销售人员的请求');
        let { id } = req.body;
        // 查询所有数据
        var delete_d = 'DELETE FROM salesman WHERE id=?';
        var data = [id];
        connection.query(delete_d, data, function(err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            console.log('删除成功');
            res.send('删除成功');
        });
    })
    admin_route.get('*', manager_isLogin, function(req, res, text) {
        //解析请求，包括文件名
        var pathname = url.parse(req.url).pathname;
        //输出请求的文件名
        console.log("req for " + pathname + "  received.");
        console.log(req.url);
        //当请求css文件夹时，url解析后为/css/xxxx.css,firstDir为xxxx.css,设置文件返回类型是text/css       
        var ContentType = null;
        // 文件格式
        let type_of_file = "";
        console.log('文件类型' + pathname.split('.')[pathname.split('.').length - 1]);
        // 用.作为分隔符来判断文件类型，直接访问端口一律默认为请求html文件
        if (pathname && pathname.split('.')[pathname.split('.').length - 1] === 'css') {
            ContentType = {
                'Content-Type': 'text/css'
            };
            type_of_file = '.css'
        } else if (pathname && pathname.split('.')[pathname.split('.').length - 1] === 'js') {
            ContentType = {
                'Content-Type': 'text/javascript'
            }
            type_of_file = ".js"
        } else if (pathname && pathname.split('.')[pathname.split('.').length - 1] === 'png') {
            ContentType = { 'Content-Type': 'image/png' }
            type_of_file = ".png"
        } else if (pathname && pathname.split('.')[pathname.split('.').length - 1] === 'jpg') {
            ContentType = { 'Content-Type': 'image/jpg' }
            type_of_file = ".jpg"
        } else if (pathname && pathname.split('.')[pathname.split('.').length - 1] === 'gif') {
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
        fs.readFile('./admin/' + pathname.substr(1), function(err, data) {
            if (err) {
                console.log(err);
                //HTTP 状态码 404 ： NOT FOUND
                //Content Type:text/plain
                res.writeHead(404, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                });
                console.log('读取失败' + pathname)
            } else {
                //HTTP 状态码 200 ： OK
                //Content Type:text/plain
                res.writeHead(200, ContentType);
                console.log('读取文件' + pathname)
                    //写会回相应内容
                res.write(data);
            }
            //发送响应数据
            res.end();
        });

    })
}