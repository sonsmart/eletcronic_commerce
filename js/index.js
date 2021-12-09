/**

 */
window.onload = function() {
    // var oDIV = document.getElementById('navbox');
    // var oUL = oDIV.document.getElementsByTagName('ul')[0];
    // var aLI = oUL.document.getElementsByTagName('li');
    // var oDIV1 = aLI.document.getElementsByTagName('div');

    // for (var i = 0; i < aLI.length; i++) {
    //     aLI[i].onmouseover = function() {
    //         this.document.getElementsByTagName('div').style.cssText = 'display:block;boder:none'
    //     }
    // };
    $('#sign_out').click(function() {

        //获取当前时间
        var date = new Date();
        //将date设置为过去的时间
        date.setTime(date.getTime() - 1);
        localStorage.clear();
        //将userId这个cookie删除
        document.cookie = "token=1; expire=" + date.toGMTString();
        window.location.href = "./login"
    })
}

window.onpageshow = function() {

}