import React, { useState, useEffect } from 'react'
import { useData } from './dataProvider'
import Profile from './profile'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faHeart } from '@fortawesome/free-solid-svg-icons'
import { useSocket } from '../socket'
import {useNotifications } from '@mantine/notifications'

function Tinder() {
    const { room, roomId, id } = useData()
    const [num, setNum] = useState(0)
    const socket = useSocket()
    const notifications = useNotifications() 
    function newNum(){
        if(num+1>=room.order.length)return 0
        return num+1
    }

    function next(){
        if (room.players.find(user=>user.id===id).swiper){
            socket.emit("slide", roomId, newNum())
        } else {
            notifications.showNotification({
                title: 'You may be single, but you are not the "single"',
                message: `I'm sure it'll be your turn to find love eventually`,
                color:"red",
                style:{ textAlign: 'left' }
            })
        }
    }

    function select(){
        if (room.players.find(user=>user.id===id).swiper){
            socket.emit("winner", roomId, num)
        } else {
            notifications.showNotification({
                title: 'You may be single, but you are not the "single"',
                message: `I'm sure it'll be your turn to find love eventually`,
                color:"red",
                style:{ textAlign: 'left' }
            })
        }
    }

    useEffect(()=>{
        if(!socket)return
        socket.on("change", (newNum)=>{
            setNum(newNum)
        })
    },[socket])
    

    return (
        <>
        {
        room?.data.state==="pick"?
        <div style={{width:"100%", height:"100%",top:"0", position:"fixed", zIndex:"30", background:"rgba(0,0,0,0.75)", left:"0"}}>
            <div style={{position:"fixed", width:"500px", background:"white", borderRadius:"5%", height:"100%", left:"50%", transform:"translateX(-50%)"}}>
                <div style={{display:"grid"}}>
                    {room.order.map((profile, index)=>(
                        <Profile key={"profile "+index} cards={profile.fish.cards} name={"Matheus"} index={room.order.length-index} mount={index>=num}/>
                    ))}
                </div>
                <div style={{display:"flex", flexDirection:"row", height:"auto", width:"100%", alignItems:"center", justifyContent:"center"}}>
                    <div className='circle'><FontAwesomeIcon size="2xl" icon={faXmark} style={{color:"rgb(254,133,113)"}} onClick={()=>{next()}}/></div>
                    <div className='circle'><FontAwesomeIcon size="2xl" icon={faHeart} style={{color:"rgb(159, 226,191)"}} onClick={()=>{select()}}/></div>
                </div>
            </div>
        </div>:""
    }
    </>
    )
}

export default Tinder