import React, {useState, useEffect} from 'react'
import axios from "axios";
import Popup from '../Popup';
import { useSocket } from '../socket';
import { useNotifications } from '@mantine/notifications';
import { useData } from "./dataProvider"
import Fish from './Fish';
import { randFullName } from '@ngneat/falso'


function PresentField(props) {
    const {
        topText,
        buttonName,
        show,
        pointer,
        room,
        roomId,
        presentedFish
    } = useData()
    const [popupOn, setPopupOn] = useState(()=>false);
    const [pics, setPics] = useState([])
    const socket = useSocket()
    const notifications = useNotifications()
    const [fishName, setFishName] = useState("")

    useEffect(()=>{
        getImages("Humans")
    },[])

    function action(){
        switch(room.data.state){
            case "awaiting":
                if (room.players.length < 3){
                    notifications.showNotification({
                        title: 'Not enough players',
                        message: `You only need ${3-room.players.length} more ${(3-room.players.length)===1? 'person':'people'}. Get more friends, loser`,
                        color:"red",
                        style:{ textAlign: 'left' }
                    })
                    break;
                }
                socket.emit("increment", roomId)
                break;
            case "white":
                setPopupOn(!popupOn)
                break;
            case "presenting":
                const next = presentedFish.cards.find((card)=>card.show===false)
                if(!next){
                    socket.emit("increment", roomId)
                    break;
                }
                const index = presentedFish.cards.indexOf(next)
                socket.emit("reveal", roomId, index)
                break;
            case "red":
                if(presentedFish.cards.length>=4){
                    socket.emit("increment", roomId)
                    break;
                }
                let card = {...pointer.array.present[0], show:true}
                if (card.Custom){//not sure if I should make this a function in the future
                    console.log(card)
                    if (card.text === "(Custom card)"){
                        card.text = card.value
                    } else {
                        card.text = card.text.replace("_____", card.value)
                    }
                }
                pointer.setArray.present([])
                socket.emit("spoilFish", roomId, card)
                break;
            default:
                break;
        }
    }

    function getImages(query){
        if (!query) query="Humans"
        query = query.replace(/ /g, "+")
        axios.request({
            url: `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${process.env.REACT_APP_imgur_api}&tags=${query}&format=json&tagmode=any&per_page=10&sort=relevance`,
            method: 'GET'
        }).then(res => {
            let x = res.data;
            x = (JSON.parse(x.substring(14,(x.length-1))))
            let array = x.photos.photo.map((pic) =>{
                return (`https://farm${pic.farm}.static.flickr.com/${pic.server}/${pic.id}_${pic.secret}.jpg`)
            })
            setPics(array)
        })
    }
    function goFish(pic){
        const cards = Array.from(pointer.array.present)
        for (let x=0;x<2;x++){
            cards[x]["show"] = false
            if (cards[x]["Custom"]){
                if (cards[x].text === "(Custom card)"){
                    cards[x].text = cards[x].value
                } else {
                    cards[x].text = cards[x].text.replace("_____", cards[x].value)
                }
            }
        }
        const fish = {cards:[{url:pic, name:fishName?fishName:randFullName(), show:false}, ...cards]}
        socket.emit("submitFish", {fish, roomId}, ()=>socket.emit("increment", roomId))//callback function is to make sure that the fish is submitted before incrementing
        pointer.setArray.present([])
        setFishName("")
        getImages()
        setPopupOn(false)
    }
    return (
        <div id="upper-half">
                    <h2>{topText}</h2>
                    <div id="played-cards" className="scrollmenu" style={{width:"100%", height:"auto"}}>
                        <Fish/>
                        {room?.data.state==="white"||room?.data.state==="red"?<>{props.children}</>:""}
                    </div>
            {show? <div className="btn" datatext={buttonName} onClick={action}>{buttonName}</div> : ""/*maybe I can make this a seperate component so that I can add an animation to this*/}
            <Popup trigger={popupOn} text="create" setTrigger={setPopupOn}>
                <h2>choose a picture</h2>
                <input className="input" name="fishName" id="fishName" onChange={(e)=>setFishName(e.target.value)} maxLength={20} autoComplete="off" placeholder="name of Fish"/>
                
                    <div className='scrollmenu' style={{spaceBetween:"5rem", padding:"1rem"}}>
                        {pics.map((pic)=>(
                            <div className="pfp" key={pic} onClick={()=>goFish(pic)}>
                                <img alt={pic} src={pic}/>
                            </div>
                        ))}
                    </div>
                    <input className="input" name="search" id="search" onChange={(e)=>getImages(e.target.value)} maxLength={25} autoComplete="off" placeholder="search"/>
            </Popup>
        </div>
    )
}

export default PresentField