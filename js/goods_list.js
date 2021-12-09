window.onload = function() {
    $.get("/database/goods", function(data, status) {
        console.dir(data);
        // 返回的所有商品数据
        let all_data = data;
        // 存储要添加的代码内容
        let str1 = ''
        $.each(all_data, function(i, item) {
            str1 +=
                `<div class="productItem">
                    <div class="imgBox">
                        <a href="showDetail.html?goods_number=` + all_data[i].goods_number + `" target="_blank">
                            <img src="`+all_data[i].thumbnail+`" alt="" style="height:188px;width: 188px;">
                        </a>
                    </div>
                    <div class="infoCont">
                        <div class="titleRow">
                            <a class="productTitle" title="" href="showDetail.html?goods_number=` + all_data[i].goods_number + `" target="_blank">` + all_data[i].book_name +
                `</a>
                        </div>
                        <div class="saleRow">
                            <div class="col fl">
                                <span class="price"><span class="priceYue">约</span> <span class="priceSign">¥</span> <span class="priceNum">` +all_data[i].now_price + `</span> </span>
                            </div>
                            <div class="col end fr">
                                <span class="weekSale">月销量<span class="num">` + all_data[i].sales_volume + `</span></span>
                            </div>
                        </div>


                    </div>
                </div>`;
        });
        // 将代码加入到前端
        $("#all_goods").html(str1);
        $(".productNum b").text(all_data.length);      
    });
}