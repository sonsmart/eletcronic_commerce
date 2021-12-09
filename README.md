# sonsmart的电子商务网站

##### 学号：201930341403

##### 姓名：黎子聪

整个系统布局，

1、css文件夹存放客户端网站的css模块

2、js文件夹存放客户端网站的js模块

3、photo文件夹和image文件夹存放客户端网站的静态资源模块

4、webfonts存放客户端网站的字体样式模块

5、admin文件夹存放整个管理系统模块

6、Index.js是基于nodejs的后端服务接口

7、主文件夹下的所有html文件都是客户端网站的所有html模块

##### 各个数据表的字段如下

##### 1、user表  user

手机号 phone 主键

昵称 username

电子邮件 e_mail

密码 password

##### 2商品表 goods

价格price

销量sales_volume

缩略图thumbnail

书名book_name

原价original_price

现价now_price

库存 storage

发货商家shipping_merchant

售后服务商家service_merchant

作者author

出版社press

出版日期publication_date

ISBN号 isbn_num

开本 folio

页数 page

版次 version

作者简介 author_introduce

内容简介 content_introduce

商品编号 goods_number 主键

##### 3订单商品表 order_goods

 商品编号goods_number

购买数量  buy_num

订单号 order_num

##### 4订单详情表 the_order

订单号 order_num

用户手机号 phone

支付状态 payment_state 未确定0 已支付1

收件人名字 rev_name

收件人身份证 rev_license

收件人手机号 rev_phone

详细地址 rev_place

支付方式 payment_style

支付时间 pay_time

##### 5客户浏览表 user_view

浏览次数 view_number

用户手机号 phone

商品编号 goods_number

 

 

