import React, { useContext, useEffect, useState, useCallback } from 'react'
import { useSocket } from '../socket'
import useLocalStorage from "../../hooks/useLocalStorage";
import { useNotifications } from '@mantine/notifications';
import queryString from "query-string"

import {initializeApp} from "firebase/app";
import {getFirestore, doc} from "firebase/firestore";

import {useDocumentData} from "react-firebase-hooks/firestore"

initializeApp({
    apiKey: process.env.REACT_APP_firebase_api,
    authDomain: "red-flags-v2.firebaseapp.com",
    projectId: "red-flags-v2",
    storageBucket: "red-flags-v2.appspot.com",
    messagingSenderId: "35160152967",
    appId: "1:35160152967:web:6d106eec111e58897d1122",
    measurementId: "G-1GQK9YKCNK"
})


const FS = getFirestore();

const context = React.createContext()

export function useData(){
    return useContext(context)
}

export function DataContext(props) {
    var {roomId} = queryString.parse(window.location.search);
    const [room] = useDocumentData(doc(FS, "rooms", roomId))

    //cards. it may be better to create a context provider for this in the future
    const [whiteCards, setWhiteCards] = useState([])
    const [redCards, setRedCards] = useState([])
    const [whiteDupe, setWhiteDupe] = useState(false)
    const [redDupe, setRedDupe] = useState(false) 
    const [present, setPresent] = useState([])
    const [presentedFish, setPresentedFish] = useState({})
    //present field
    const notifications = useNotifications()
    const [topText, setTopText] = useState("loading data, please be patient")//maybe I can use an object again
    const [buttonName, setButtonName] = useState("")//not sure if these two have to be useState. just Using them for now to be sure
    const [show, setShow] = useState(false)
    //pointer is for the function that place cards in their new location
    const pointer = {array:{white:whiteCards, red:redCards, present:present}, setArray:{white:setWhiteCards,red:setRedCards,present:setPresent}}
    //socket
    const socket = useSocket()
    const [id] = useLocalStorage("id")
    const [seed] = useLocalStorage("seed")
    const [username] = useLocalStorage("user")

    function dupe(card, array, setDupe){
        const cardString = JSON.stringify(card)//the (Custom card)s have an "n" value that makes them different when stringified
        for(let x=0;x<array.length;x++){
            if (cardString===JSON.stringify(array[x])){
                setDupe(true)
                return true
            }
        }
        setDupe(false)
        return false
    }

    const pull = useCallback((color, array, setArray, setDupe)=>{
        socket.emit("pull", {color:color}, (card)=>{
            if(dupe(card, array, setDupe))return
            setArray((prevCards)=>{return [...prevCards, card]})
        })
    },[socket])

    useEffect(()=>{
        if (socket==null)return
        socket.emit("gamejoin", roomId, id, username, seed)
        socket.on("init", ()=>{
            for(let x=0; x<20; x++){
                pull("white", whiteCards, setWhiteCards, setWhiteDupe)//I may be able to abstract this in the future with the pointer array
            }
            for(let x=0; x<15; x++){
                pull("red", redCards, setRedCards, setRedDupe)
            }
        })
        socket.on("draw",(color)=>{
            if (color==="white"){
                pull("white", whiteCards, setWhiteCards, setWhiteDupe)
                pull("white", whiteCards, setWhiteCards, setWhiteDupe)
            } else {
                pull("red", redCards, setRedCards, setRedDupe)
            }
        })
        socket.on("notif", (notif)=>{
            notifications.showNotification(notif)
        })
        socket.on("reveal", (card)=>{
            if (card===3){
                setPresentedFish({...presentedFish, show:true})
            } else {
                let cards = Array.from(presentedFish)
                cards[card]["show"] = true
                setPresentedFish({...presentedFish, cards})
            }
        })
    },[socket])

    useEffect(()=>{//for some reason this does not work
        if (whiteDupe===true){
            pull("white", whiteCards, setWhiteCards, setWhiteDupe)
        }
        if (redDupe===true){
            pull("red", redCards, setRedCards, setRedDupe)
        }
    }, [whiteDupe,redDupe])

    useEffect(()=>{
        if(!room)return
        let you = room.players.find(user => user.id === id)
        if(!you)return
        let swiper = room.players.find(user => user.swiper)

        switch(room.data.state){
            case "awaiting":
                setTopText("waiting for players")
                setButtonName("start")
                if(you.admin){
                    setShow(true)
                    break;
                } 
                setShow(false)
                break
            case "white":
                if (you.swiper){
                    setTopText("You are lonely and looking for a fish to fill the empty void that is your heart. Don't worry, you'll find someone eventually")
                    setShow(false)
                    break;
                }
                if (room.order){
                    const yourFish = room.order.find(user => user.id === id)
                    if (JSON.stringify(yourFish.fish)!=="{}"){
                    setTopText("You have submitted your fish. Now wait for others to submit their fish")
                    setShow(false)
                    break
                }}
                setTopText(`${swiper.username} is looking for love, play two white cards`)
                setButtonName("confirm")
                if(present.length === 2){
                    setShow(true)
                    break
                }
                setShow(false)
                break;
            case "presenting":
                //maybe have a new array showing the order in the database
                let presenter = room.order[room.data.turn] 
                setButtonName("next")
                if(presenter.id===you.id){
                    setPresentedFish({...presenter.fish, present:true})
                    setShow(true)
                    setTopText(`you are presenting your fish (${presenter.fish.cards[0].name}), press next or the cards to reveal your cards`)
                    break
                }
                setPresentedFish({...presenter.fish, present:false})
                setTopText(`${presenter.username} is now presenting their fish`)//maybe the name should be added later, so it can be a reveal
                setShow(false)
                break;
            case "red":
                let ruiner = room.order[room.data.turn] 
                let spoiledFish = room.order[room.data.turn+1]?room.order[room.data.turn+1]:room.order[0]
                setPresentedFish(spoiledFish.fish)
                if (ruiner.id===you.id){
                    setTopText(`you are spoiling ${spoiledFish.username}'s fish`)
                    if(spoiledFish.fish.cards.length >=4){
                        setShow(true)
                        setButtonName("next")
                        break;
                    }
                    setButtonName("confirm")
                    setShow(!!present.length) //I could also do present.length? setShow(true):setShow(false)
                    break;
                }
                setShow(false)
                setTopText(`${ruiner.username} is ruining ${spoiledFish.username}'s fish`)
                break;
            case "pick":
                setShow(false)
                setPresentedFish({})
                if (you.swiper){
                    setTopText("time to choose your favorite fish")
                    break;
                }
                setTopText(`${swiper.username} is choosing their destined lover`)
                break;
            default:
                break
        }
    }, [present, room, id])

    const allData = {
        topText,
        buttonName,
        show,
        pointer,
        room,
        roomId,
        presentedFish,
        username,
        id
    }
    
    return (
        <context.Provider value={allData}>
            {props.children}
        </context.Provider>
    )
}