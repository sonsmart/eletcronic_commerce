window.onload = function() {
    console.dir(window.location.search)
        // 从url获得商品id,购买数量和标识符
    if (window.location.search) {
        let the_goods_number = window.location.search.split('=')[1].split('&')[0];
        let the_buy_num = window.location.search.split('=')[2].split('&')[0];
        let the_from_shop_car = window.location.search.split('=')[3];
        the_buy_num = parseInt(the_buy_num)
        if(the_from_shop_car)
        if (the_from_shop_car == "false") {

            $.post('/database/goods_detail', {
                goods_number: the_goods_number
            }, function(data, status) {
                console.dir(data);
                // data[0].original_price = parseFloat(data[0].original_price);
                console.log('dddd')
                console.dir(data[0].original_price);
                console.log('dddd')
                let new_content = `<div class="content_header clear">
            <div class="top_banner">
                <ul class="header_icons">
                    <li> <span> <i class="icon_tuihuo header_icon png"></i> 30天无条件退货 </span> </li>
                </ul>
            </div>
        </div>
        <div class="groups_wrapper">
            <table class="cart_group_item  cart_group_item_product">
                <thead>
                    <tr>
                        <th class="cart_overview">
                            <div class="cart_group_header">
                                <h2>在线发货</h2>
                            </div>
                        </th>
                        <th class="cart_price">优惠价（元）</th>
                        <th class="cart_num">数量</th>
                        <th class="cart_total">小计（元）</th>                        
                    </tr>
                </thead>
                <tbody class="hide">
                    <tr class="cart_item " hashid="d150603p892053zc" id="1057066_d150603p892053zc" product_id="892053" item_price="48.00" category_v3_3="18" brand_id="623" product_type="product">
                        <td valign="top">
                            <div class="cart_item_desc clear">
                                <input class="js_item_selector cart_item_selector" data-item-key="1057066_d150603p892053zc" checked="'checked'/" type="checkbox">
                                <div class="cart_item_desc_wrapper">
                                    <a class="cart_item_pic" href="http://sh.jumei.com/i/deal/d150603p892053zc.html" target="_blank"> <img src="./image/book/book_list4/list4_lit1.jpg" alt="世界那么大，我想去看看！"> <span class="sold_out_pic png"></span> </a> <a class="cart_item_link" title="世界那么大，我想去看看" href="http://sh.jumei.com/i/deal/d150603p892053zc.html"
                                        target="_blank">` + data[0].book_name + `！</a>
                                    <p class="sku_info">规格：<span class="cart_item_attribute">彩色</span>&nbsp; </p>
                                    <div class="sale_info clear">
                                        <div class="tips_pop_full float_box JS_tips_pop_full">
                                            <div> <a class="sale_tag gift JS_sale_tag" data-promo-type="gift"> 满赠 <i class="icon_small png"></i> </a> </div>
                                            <div class="pop_box JS_pop_box">
                                                <div><span class="arrow_t_1"><span class="arrow_t_2"></span></span>
                                                </div>
                                                <div>
                                                    <a class="clear promo_sale_item promo_has_url" target="_blank" href="http://hd.jumei.com/act/4-3-6035-ppt_maybelline_150603.html"> <span class="title">图书团满99送109</span> <span class="tips">查看活动</span> </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="tips_pop_full float_box JS_tips_pop_full">
                                            <div> <a class="sale_tag reduce JS_sale_tag" data-promo-type="reduce"> 满减 <i class="icon_small png"></i> </a> </div>
                                            <div class="pop_box JS_pop_box">
                                                <div><span class="arrow_t_1"><span class="arrow_t_2"></span></span>
                                                </div>
                                                <div>
                                                    <a class="clear promo_sale_item promo_has_url" target="_blank" href="http://hd.jumei.com/act/4-3-6035-ppt_maybelline_150603.html"> <span class="title">图书团满99减20</span> <span class="tips">查看活动</span> </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_price">
                                <p class="jumei_price">` + data[0].now_price + `</p>
                                <p class="market_price">` + data[0].original_price + `</p>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_num ">
                                <div class="item_quantity_editer clear" data-item-key="1057066_d150603p892053zc">
                                    <input class="item_quantity" value="` + the_buy_num + `" type="text"> </div>
                                <div class="item_shortage_tip"> </div>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_total">
                                <p class="item_total_price">` + parseInt(the_buy_num) * parseFloat(data[0].now_price) + `</p>
                                <p>省 <span class="item_saved_price">` + parseInt(the_buy_num) * (parseFloat(data[0].original_price) - parseFloat(data[0].now_price)) + `</span></p>
                            </div>
                        </td>                       
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5"> 商品金额： <span class="group_total_price">￥` + parseInt(the_buy_num) * parseFloat(data[0].now_price) + `</span> </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="common_handler_anchor"></div>
        <div class="common_handler">
            <div class="right_handler"> 共 <span class="total_amount">` + the_buy_num + ` </span> &nbsp;件商品 &nbsp;&nbsp; 商品应付总额：<span class="total_price">￥` + parseInt(the_buy_num) * parseFloat(data[0].now_price) + `</span> <a id="go_to_order" class="btn" href="lookOrderForm.html?from_shop_car=false&goods_number=` + the_goods_number + `&buy_num=` + the_buy_num + `">去结算</a> </div>                      
            <form id="form_to_order" action="" method="post" style="display: none;">
                <input name="items_key" type="hidden"> </form>
        </div>`;
                $('#group_show').html(new_content);

            })


        }
    }

    // 如果是g购物车购买
    else {
        console.log('购物车')
            // 定义商品总价格和总数量
        let total_num = 0;
        let total_price = 0;
        var new_content = `<div class="content_header clear">
                <div class="top_banner">
                    <ul class="header_icons">
                        <li> <span> <i class="icon_tuihuo header_icon png"></i> 30天无条件退货 </span> </li>
                    </ul>
                </div>
            </div>
            <div class="groups_wrapper">
                <table class="cart_group_item  cart_group_item_product">
                    <thead>
                        <tr>
                            <th class="cart_overview">
                                <div class="cart_group_header">
                                    <h2>在线发货</h2>
                                </div>
                            </th>
                            <th class="cart_price">优惠价（元）</th>
                            <th class="cart_num">数量</th>
                            <th class="cart_total">小计（元）</th>                        
                        </tr>
        </thead>`;
        $.post('/database/shop_car', function(data, status) {
            console.dir(data); 
            if(data.length==0||data==false)                       
            {
                alert('购物车为空');
                return;
            }
            for (let i = 0; i < data.length; i++) {
                total_num += parseInt(data[i].buy_num);
                total_price += parseInt(data[i].buy_num) * parseInt(data[i].now_price);
                console.log(parseInt(data[i].now_price))  
                new_content += `
                <tbody class="hide">
                    <tr class="cart_item " hashid="d150603p892053zc" id="1057066_d150603p892053zc" product_id="892053" item_price="48.00" category_v3_3="18" brand_id="623" product_type="product">
                        <td valign="top">
                            <div class="cart_item_desc clear">
                                <input class="js_item_selector cart_item_selector" data-item-key="1057066_d150603p892053zc" checked="'checked'/" type="checkbox">
                                <div class="cart_item_desc_wrapper">
                                    <a class="cart_item_pic" href="" target="_blank"> <img src="`+data[i].thumbnail+`" alt="世界那么大，我想去看看！"> <span class="sold_out_pic png"></span> </a> <a class="cart_item_link" title="世界那么大，我想去看看" href=""
                                        target="_blank">` + data[i].book_name + `！</a>
                                    <p class="sku_info">规格：<span class="cart_item_attribute">彩色</span>&nbsp; </p>
                                    <div class="sale_info clear">
                                        <div class="tips_pop_full float_box JS_tips_pop_full">
                                            <div> <a class="sale_tag gift JS_sale_tag" data-promo-type="gift"> 满赠 <i class="icon_small png"></i> </a> </div>
                                            <div class="pop_box JS_pop_box">
                                                <div><span class="arrow_t_1"><span class="arrow_t_2"></span></span>
                                                </div>
                                                <div>
                                                    <a class="clear promo_sale_item promo_has_url" target="_blank" href="http://hd.jumei.com/act/4-3-6035-ppt_maybelline_150603.html"> <span class="title">图书团满99送109</span> <span class="tips">查看活动</span> </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="tips_pop_full float_box JS_tips_pop_full">
                                            <div> <a class="sale_tag reduce JS_sale_tag" data-promo-type="reduce"> 满减 <i class="icon_small png"></i> </a> </div>
                                            <div class="pop_box JS_pop_box">
                                                <div><span class="arrow_t_1"><span class="arrow_t_2"></span></span>
                                                </div>
                                                <div>
                                                    <a class="clear promo_sale_item promo_has_url" target="_blank" href="http://hd.jumei.com/act/4-3-6035-ppt_maybelline_150603.html"> <span class="title">图书团满99减20</span> <span class="tips">查看活动</span> </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_price">
                                <p class="jumei_price">` + data[i].now_price + `</p>
                                <p class="market_price">` + data[i].original_price + `</p>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_num ">
                                <div class="item_quantity_editer clear" data-item-key="1057066_d150603p892053zc">
                                    <input class="item_quantity" value="` + data[i].buy_num + `" type="text"> </div>
                                <div class="item_shortage_tip"> </div>
                            </div>
                        </td>
                        <td>
                            <div class="cart_item_total">
                                <p class="item_total_price">` + parseInt(data[i].buy_num) * parseFloat(data[i].now_price) + `</p>
                                <p>省 <span class="item_saved_price">` + parseInt(data[i].buy_num) * (parseFloat(data[i].original_price) - parseFloat(data[i].now_price)) + `</span></p>
                            </div>
                        </td>                       
                    </tr>
                </tbody>`
            }
                      
            new_content += `<tfoot>
        <tr>
        <td colspan="5"> 商品金额： <span class="group_total_price">￥` + total_price + `</span> </td>
    </tr>
</tfoot>
</table>
</div>
<div class="common_handler_anchor"></div>
<div class="common_handler">
<div class="right_handler"> 共 <span class="total_amount">` + total_num + ` </span> &nbsp;件商品 &nbsp;&nbsp; 商品应付总额：<span class="total_price">￥` + total_price + `</span> <a id="go_to_order" class="btn" href="lookOrderForm.html?from_shop_car=true">去结算</a> </div>                      
<form id="form_to_order" action="" method="post" style="display: none;">
<input name="items_key" type="hidden"> </form>
</div>`;
            $('#group_show').html(new_content);

        })
    }
}