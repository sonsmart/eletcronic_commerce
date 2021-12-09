// 1. 导入nodemailer
const nodeMailer = require("../lib/node_modules/nodemailer");

// 定义一个生成验证码的函数
function getCode() {
    return Math.random().toString(16).slice(2, 6).toUpperCase()
}

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
        to: "394760702@qq.com", //收件箱地址
        subject: "<测试邮件>注册验证码:", //邮件的标题
        html: `您的注测码是:${getCode()}`
    }
    // 发送邮件：
transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
        throw new Error("邮件发送失败!")
        return
    }
    console.log(info.response)
})