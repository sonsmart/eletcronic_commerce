//  定义一个map存储各个账号及其token
export var map_token = new Map();
// 定义一个销售人员map，存储所有正在登录的销售人员
export var map_salesman = new Map();
// 定义一个管理员map，存储所有正在登录的管理员
export var map_manager = new Map();
//一个中间件 检测cookie上面使用username属性 如果有 那么证明登录成功过 否正跳到登录页面
export function manager_isLogin(req, res, next) {
    const { m_token } = req.cookies;
    //  没登录就去登录
    if (m_token) { //如果存在
        //  判断m_token是否合法      
        //  查看map    
        console.log('管理员m_token存在');
        if (map_manager.has(m_token.toString())) {
            next();
            console.log('管理员m_token合法');
        } else {
            res.redirect("/login")
            console.log('管理员m_token不合法，去登录');
        }
        //  next();
    } else {
        console.log('m_token不存在');
        res.redirect("/login");
    }

}
//一个中间件 检测cookie上面使用username属性 如果有 那么证明登录成功过 否正跳到登录页面
export function salesman_isLogin(req, res, next) {
    const { m_token } = req.cookies;
    //  没登录就去登录
    if (m_token) { //如果存在
        //  判断m_token是否合法      
        //  查看map    
        console.log('销售人员m_token存在');
        if (map_salesman.has(m_token.toString())) {
            next();
            console.log('销售人员m_token合法');
        } else {
            res.redirect("/login")
            console.log('销售人员m_token不合法，去登录');
        }
        //  next();
    } else {
        console.log('m_token不存在');
        res.redirect("/login");
    }

}
//一个中间件 检测cookie上面使用username属性 如果有 那么证明登录成功过 否正跳到登录页面
export function isLogin(req, res, next) {
    const { token } = req.cookies;
    //  没登录就去登录
    if (token) { //如果存在
        //  判断token是否合法      
        //  查看map    
        console.log('token存在');
        console.log('_____________________token:')
        console.log(token)
        console.log('_____________________token:')
        console.log('____________________map:')
        console.dir(map_token)
        console.log('____________________map:')
        if (map_token.has(token.toString())) {
            next();
            console.log('token合法');
        } else {
            res.redirect("/login")
            console.log('token不合法，去登录');
        }
        //  next();
    } else {
        console.log('页面token不存在');
        res.redirect("/login");
    }

}