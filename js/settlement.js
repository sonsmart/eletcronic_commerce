window.onload = function() {
    let the_from_shop_car = window.location.search.split('=')[1].split('&')[0];
    // 点击提交
    $('#submit').click(function() {
        // 获得所有输入内容
        let rev_name = $('#JS_receiver_name').val();
        let rev_license = $('#JS_china_id_number').val();
        let rev_phone = $('#JS_phone').val();
        let rev_place = $('#JS_address').val();
        // 获取支付方式↓
        let all_payment_style = ['goods_arrive', 'zfb', 'web_bank', 'quickly_pay'];
        let payment_style = '';        
        let goods_arrive = []        
        goods_arrive.push($('.gateway_line:nth-of-type(1) input:nth-of-type(1)').attr('checked'));
        goods_arrive.push($('.gateway_line:nth-of-type(2) input:nth-of-type(1)').attr('checked'));
        goods_arrive.push($('.gateway_line:nth-of-type(3) input:nth-of-type(1)').attr('checked'));
        goods_arrive.push($('.gateway_line:nth-of-type(4) input:nth-of-type(1)').attr('checked'));
        for (let i = 0; i < 4; i++) {
            if (goods_arrive[i] == "checked") {
                payment_style = all_payment_style[i];
                break;
            }
        }        
        // 数据校验↓
        let reg_phone = /^1[3|4|5|7|8][0-9]{9}$/;
        let reg_idcard = 
        /^[1-9]\d{5}(18|19|20|(3\d))\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
        if(!reg_phone.test(rev_phone))
        {
            alert('请输入正确的电话');
            return;
        }
        if(!reg_idcard.test(rev_license))
        {
            alert('请输入正确的身份证');
            return;
        }
        if(rev_name==""||rev_place==""||payment_style=="")
        {
            alert("信息不能为空，请输入完整信息");
            return;
        }
        // 数据校验↑
        // 如果是从购物车跳转过来
        if (the_from_shop_car == "true") {
            $.post('/database/order_message', {
                rev_name: rev_name,
                rev_license: rev_license,
                rev_phone: rev_phone,
                rev_place: rev_place,
                payment_style: payment_style,
                from_shop_car: the_from_shop_car
            }, function(data, status) {
                if (data) {
                    console.log('提交成功')
                    window.location.href = './result.html';
                } else {
                    console.log('提交失败')
                }
            })
        }
        // 如果是从单次购买跳转过来
        else {
            let goods_number = window.location.search.split('=')[2].split('&')[0];
            let buy_num = window.location.search.split('=')[3]

            $.post('/database/buy_a_time', {
                rev_name: rev_name,
                rev_license: rev_license,
                rev_phone: rev_phone,
                rev_place: rev_place,
                payment_style: payment_style,
                from_shop_car: the_from_shop_car,
                goods_number: goods_number,
                buy_num: buy_num
            }, function(data, status) {
                if (data) {
                    console.log('提交成功')

                } else {
                    console.log('提交失败')
                }
            })
            window.location.href = './result.html';

        }
    })

}