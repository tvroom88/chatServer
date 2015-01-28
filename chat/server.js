//mongoose에 save가 안

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var nicknames = [];
var users = {};
var mongoose = require('mongoose');


server.listen(3000);


mongoose.connect('mongodb://localhost/test', function(err){
    if(err){
        console.log(err);
    }else{
        console.log('Connected to mongodb');
    }
});
//mongoose 모델 지정함
var chatSchema = mongoose.Schema({
    nick : String,
    msg: String,
    created:{type:Date, default:Date.now}
});

var Chat = mongoose.model('Message', chatSchema);
//console.log(Chat) ;

//-------------------------------------------

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});
//뭐나오는지 찍어볼려고 만들어 놓은거임 -----------------------
app.get('/DataBase', function (req, res) {
    res.html(Chat);
});
//----------------------------------------------------
io.sockets.on('connection', function (socket) {
    var query = Chat.find({});
    //query.limit(8); 찾는 수치를 지정해줄수있소이
    query.sort('-created').limit(8).exec(function (err, docs) {
        if(err) throw err;
        socket.emit('load old msgs', docs);

    });

    // 새로운 유저 정보 받는 부분
    socket.on('new user', function(data, callback){
        //if(nicknames.indexOf(data)!=-1){ //indexof 문자열찾
        if(data in users){
            callback(false);
        }else{
            callback(true);
            socket.nickname=data;
            users[socket.nickname] = socket;
            //nicknames.push(sockCet.nickname);
            updateNickname();
            //nickname 배열에 저장된 이름이 전송됨
        }
    });

    function updateNickname(){
        io.sockets.emit('usernames', Object.keys(users));
        //io.sockets.emit('usernames', nicknames));
    }
//-------------------------------------
//    function chatName(){
//        io.sockets.on('new user', function (data, callback) {
//
//        });
//    }
//-------------------------------------
    //대화창부분
    socket.on('send message', function (data, callback) {
        var msg = data.trim();
        // /w를 쓸경우 아이디 한명에게만 대화할수 있도록 조절하려고 이렇게 함.
        if(msg.substr(0,3) === '/w ') {
            msg = msg.substr(3);
            //"전체 문자열".indexOf("검사할 문자", 시작순서), -1은 해당 문자에 왔을
            var ind = msg.indexOf(' ');
            if (ind !== -1) {
                // /w 다음 빈칸 이후 이름 이랑 메세지 부분
                //substring 문자열 길이를 자른다
                var name = msg.substring(0, ind);
                var msg = msg.substring(ind + 1);
                //------------------user 확인부분------------------------
                if (name in users) {
                    users[name].emit('whisper', {msg: msg, nick: socket.nickname});
                    console.log('Whisper!');
                //-----------user가 없을경우
                    } else {
                    callback('Error! Enter a valid user');
                }
            //------' '-----빈칸이 없거나 /w 치고 끝날경우
            }else {
                callback('Error! please enter a message for your whisper!');
            }
        //---------------------/w를 안쓰고 그냥 대화를 칠경우-----------------------
        }else {
            //먼저 mongoose에 저장해주고 있음
            var newMsg = new Chat({msg: msg, nick:socket.nickname});
            newMsg.save(function (err){
                if(err){
                    console.log('error');
                }else{
                    io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
                    console.log('already send to mongoose');
                    console.log(newMsg);
                }
            });

        }

    });

    socket.on('disconnect', function (data) {
        if(!socket.nickname) return;
        delete users[socket.nickname];
        //delete nicknames.splice(nicknames.indexOf(socket.nickname));
        //nicknames.splice(nicknames.indexOf(socket.nickname));
        // (!!!그러니까 한 유저가 연결이 끊기면 아이디가 없어진다는 의미임)
        // plice 메서드는 start 위치에서 지정된 수만큼 요소를 제거하고
        // 새 요소를 삽입하여 arrayObj를 수정합니다.
        // 삭제된 요소는 새 Array 개체로 반환됩니다.
        updateNickname();
        //해당 아이디를 지우고 바로 업데이
    });

});