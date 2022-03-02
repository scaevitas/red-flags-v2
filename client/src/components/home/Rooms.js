import React, {useState, useRef, useEffect} from 'react'
import Popup from '../Popup'
import { v4 } from "uuid"
import io from "socket.io-client"
import socket from 'socket.io-client/lib/socket'
import useLocalStorage from "../../hooks/useLocalStorage";

import {initializeApp} from "firebase/app";
import {getFirestore, setDoc, getDoc, doc, collection, getDocs} from "firebase/firestore";

import {useCollectionData} from "react-firebase-hooks/firestore"

const APIKey = ""

const firebase = initializeApp({
    apiKey: APIKey,
    authDomain: "red-flags-v2.firebaseapp.com",
    projectId: "red-flags-v2",
    storageBucket: "red-flags-v2.appspot.com",
    messagingSenderId: "35160152967",
    appId: "1:35160152967:web:6d106eec111e58897d1122",
    measurementId: "G-1GQK9YKCNK"
})

const FS = getFirestore();

export default function Rooms() {
    const roomRef = useRef()
    const [popupOn, setPopupOn] = useState(()=>false);
    const [isPrivate, setIsPrivate] = useState(()=>false)
    const [user, setUser] = useLocalStorage("user")

    let player = {username:user, score:0, admin:true, played:[]}//note to self, create an id

    useEffect(()=>{
        const socket = io.connect("http://localhost:9000/")
        socket.emit("home")
    })

    const [roomsList] = useCollectionData(collection(FS,"rooms"))

    const createRoom = async(x) => {
        const lobbyId = v4()
        x.preventDefault()
        const password = isPrivate? x["target"][4].value : null
        await setDoc(doc(FS, "rooms", lobbyId), {
            Name:x["target"][0].value,
            players:[player],
            data:{
                state:"awaiting",
                turn:1,
                maxPoints:x["target"][1].value,
                maxPlayer:x["target"][2].value,
                password:password
            },
            waiting:[]
        })
        //window.location = (`game?roomId=${lobbyId}&room=${roomName}`)
        return () =>{
            socket.emit("disconnect")
            socket.off()
        }
    }
    return (
        <div>
            <div className='btn' datatext="Get_A_room" onClick={()=>setPopupOn(!popupOn)}>Get_A_room</div>
            <Popup trigger={popupOn} text="create" setTrigger={setPopupOn}>                
                <form onSubmit={createRoom} autoComplete='off' action="game">
                    <h1>Room details:</h1>
                    <p style={{margin:"0"}}><input required ref={roomRef} className="input" name="Lobbyname" id="Lobbyname" placeholder="Lobby name"/></p>
                    <h1 style={{margin:"0"}}>Score limit:<input type="number" className="input" name="ScoreMax" id="ScoreMax" defaultValue="8" /></h1>
                    <h1 style={{margin:"0"}} >player limit:<input type="number" className="input" name="playerMax" id="playerMax" defaultValue="10" /></h1>
                    <div className="checkbox" style={{marginBottom:"1em"}}>
                        <input type="checkbox" id="private" name="private" onClick={()=>setIsPrivate(!isPrivate)}/>
                        <label htmlFor="private" style={{color:"white", fontSize:"larger", fontWeight:"bold"}}>require password</label>
                    </div>
                    {isPrivate? <p><input required className="input" name="password" id="password" placeholder="password"/></p> : ""}
                    <button className='btn' type='submit' datatext="create">create</button>
                </form>
            </Popup>
            <div>
                <h1>rooms</h1>
                {
                    roomsList?.map((room, index)=>(
                        <div key={room["Name"]} style={{backgroundColor:"purple"}}>
                            <h1>{index+1}.{room["Name"]}</h1>
                            <p style={{color:"white"}}>players: {room.players.length}/{room.data.maxPlayer}</p>
                            <p style={{color:"white"}}>State: {room.data.state}</p>
                            <p>{room.data.password? "private lobby" : "open"}</p>
                        </div>
                        ))
                }
            </div>
        </div>
    )
}

//things that the lobby needs to show: room name, room host, current players, max players