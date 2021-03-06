import React from 'react'
import DiceBear from "../DiceBear"
import { useData } from './dataProvider'

export default function Scoreboard() {//this might have to take in the room data
    //const mockPlayers = [{userName:"matheus",seed:"test",points:4},{userName:"Scaevitas",seed:"bleh",points:1},{userName:"Mat A Door",seed:"poaewr",points:8},{userName:"hurder",seed:"Matheus",points:0}]
    const {room} = useData()
    return (
        <div className="players-menu">
            <p>score</p>
            <div className='players-list'>
            {room?.players? room.players.map(player => (
                        <div className="player" key={player.username}>
                            <DiceBear seed={player.seed}/>
                            <div className="player-text">{player.username}<br/>{player.score} point{player.score===1?"":"s"}</div>
                        </div>
                    )) : ""}
            </div>

        </div>
    )
} //note to self, change the key to their id later instead of their username
