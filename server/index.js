const { connect } = require("http2"); //not sure what this is, I think I will remove it. I think it might have auto added this 
const cards = require("./misc/cards.json");

const app = require("express")()
const server = require("http").createServer(app)
const io = require("socket.io")(server)

const admin = require("firebase-admin")//note to self: may change to real time database in the future instead of firestore
const serviceAccount = require("./firestore_key.json")
const FieldValue = require('firebase-admin').firestore.FieldValue;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

function randint(n){
    return Math.floor(Math.random() * (n));
};

const userToSocket = {}

io.on("connection", socket =>{
    socket.on("gamejoin", (roomId, userId, user, seed)=>{
        socket.emit("init")
        userToSocket[socket.id] = {userId,roomId}
        let docRef = db.collection("rooms").doc(roomId);
        (async ()=>{
            const doc = await docRef.get();
            try{if (doc.data()["players"]){
                await docRef.update({players:FieldValue.arrayUnion({username:user, score:0, admin:false, played:[], seed:seed, id:userId})})
                //{username:user, score:0, admin:false, played:[], seed:seed, id:id}
            }else{
                await docRef.update({players:FieldValue.arrayUnion({username:user, score:0, admin:true, played:[], seed:seed, id:userId})})
            }} catch {
                console.log("this is just test stuff")
            }
        })();
    });

    socket.on("pull", ({color},callback)=>{ 
        var random = randint(cards[color].length)
        callback(cards[color][random])
    });

    socket.on("disconnect", ()=>{ 
        const data = userToSocket[socket.id]
        if (data){
            let docRef = db.collection("rooms").doc(data.roomId); 
            (async ()=>{
                const doc = await docRef.get();
                const quiter = doc.data()["players"].find(user => user.id == data.userId)
                if(doc.data()["players"].length <= 1){ 
                    await docRef.delete()
                }else{
                    await docRef.update({players:FieldValue.arrayRemove(quiter)}) 
                } 
            })(); 
        } 
    }) 
});
//the env port checks if there is an environmental variable
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`\n\x1b[32m[server]\x1b[0m running on port: \x1b[33m${PORT}\x1b[0m \n`));