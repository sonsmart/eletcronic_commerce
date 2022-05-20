export // 定义一个发送电子邮件的函数
function send_email(to) {
    //创建一个传送器
    const transporter = nodeMailer.createTransport({
            host: "smtp.qq.com", //邮件发送的域名，我们这里使用的是QQ的服务
            port: 587, // SMTP端口号
            secure: false, //secure:true for port 465, secure:false for port 587
            auth: {
                user: "582825762@qq.com", //邮件发送方的邮箱
                pass: "bcpszqzxfcpebcii" //我们开启POP服务生成的授权码
            }
        })
        //配置发件箱和收件箱的信息
    const mailOptions = {
            from: "582825762@qq.com", //发件箱
            to: to, //收件箱地址
            subject: "发货通知", //邮件的标题
            html: new Date().getFullYear() + `年` + (new Date().getMonth() + 1) + `月` + new Date().getDate() + `日` + (new Date().getHours() < 10 ? '0' + new Date().getHours() : new Date().getHours()) + `:` + (new Date().getMinutes() < 10 ? '0' + new Date().getMinutes() : new Date().getMinutes()) + `的订单已经为您发货`
        }
        // 发送邮件：
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            throw new Error("邮件发送失败!")
            return
        }
        console.log(info.response)
    })
}