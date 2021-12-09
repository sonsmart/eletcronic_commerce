window.onload = function(e) {
    console.dir(window.location.search)
        // 从url获得商品id
    let the_goods_number = window.location.search.split('=')[1];
    // 商品数据
    let all_data = '';
    // 商品库存
    let storage = 1234;
    // 购买数量
    let buy_num = 1;

    $.post("/database/goods_detail", {
        goods_number: the_goods_number
    }, function(data, status) {
        console.dir(data);
        // 返回的商品数据
        all_data = data[0];
        console.dir(all_data);
        storage = all_data.storage;
        //   设置书名
        $('#name h1').text(function(i, old) {
            return all_data.book_name;
        })
        $('#the_type tr:nth-of-type(1) td:nth-of-type(2)').text(function(i, old) {
                return all_data.book_name;
            })
            //   设置优惠价
        $('#jd-price').text(function(i, old) {
            return all_data.now_price;
        })
        $('#the_type tr:nth-of-type(2) td:nth-of-type(2)').text(function(i, old) {
                return all_data.now_price;
            })
            // 设置缩略图
        $("#img_string").attr('src',all_data.thumbnail);                  
            //   设置原价
        $('#notice-downp').text(function(i, old) {
                return all_data.original_price;
            })
            //   设置发货商
        $('#shipping_merchant').text(function(i, old) {
                return all_data.shipping_merchant;
            })
            //   设置售后服务商家
        $('#service_merchant').text(function(i, old) {
                return all_data.service_merchant;
            })
            //   设置库存
        $('#J_SpanStock').text(function(i, old) {
                return all_data.storage;
            })
            // 设置作者
        $('#the_type tr:nth-of-type(3) td:nth-of-type(2)').text(function(i, old) {
                return all_data.author;
            })
            // 设置出版社
        $('#the_type tr:nth-of-type(4) td:nth-of-type(2)').text(function(i, old) {
                return all_data.press;
            })
            // 设置出版日期
        $('#the_type tr:nth-of-type(5) td:nth-of-type(2)').text(function(i, old) {
                return all_data.publication_date;
            })
            // 设置isbn
        $('#the_type tr:nth-of-type(6) td:nth-of-type(2)').text(function(i, old) {
                return all_data.isbn_num;
            })
            // 设置开本
        $('#the_type tr:nth-of-type(7) td:nth-of-type(2)').text(function(i, old) {
                return all_data.folio;
            })
            // 设置页数
        $('#the_type tr:nth-of-type(8) td:nth-of-type(2)').text(function(i, old) {
                return all_data.page;
            })
            // 设置版次
        $('#the_type tr:nth-of-type(9) td:nth-of-type(2)').text(function(i, old) {
                return all_data.version;
            })
            // 作者简介
        $('#author_introduce').text(function(i, old) {
                return all_data.author_introduce;
            })
            // 内容简介
        $('#content_introduce').text(function(i, old) {
            return all_data.content_introduce;
        })
    });
    // 加入购物车的点击事件
    $('#add_shop_car').click(function() {
            alert('该商品已加入购物车');
            $.post("/database/add_goods", {
                goods_number: all_data.goods_number,
                buy_num: buy_num
            }, function(data, status) {

            });
            window.location.href = "lookShoppingCar.html";
        })
        // 加入立即购买的点击事件
    $('#id_buy_now').click(function() {
            // alert('立即购买');
            window.location.href = "lookShoppingCar.html?goods_number=" + all_data.goods_number + '&buy_num=' + buy_num + '&from_shop_car=false';
        })
        // 设置和输入购买数量↓   
    $('#id_add_num').click(function() {
        if (buy_num < storage) {
            buy_num++;
        }
        $('#J_IptAmount').val(buy_num);
    })
    $('#id_reduce_num').click(function() {
        if (buy_num > 0) {
            buy_num--;
        }
        $('#J_IptAmount').val(buy_num);
    })
    $('#J_IptAmount').blur(function(e) {
            $('#J_IptAmount').val(function(i, old) {
                if (parseInt(old) > parseInt(storage)) {
                    buy_num = storage;
                } else {
                    buy_num = old;
                }
                return buy_num;
            });
        })
        // 设置和输入购买数量↑

}