import React from "react";
import {useParams} from "react-router-dom"
import Steganography from "../../components/Steganography/Steganography";

const Krypt = () =>{
    const kryptType = useParams().name;

    return (
        <div  style={{margin:"40px", height:"100vh"}}>
            { kryptType==="steganoGraphy" ?  
                <Steganography /> : null 
            }

            {kryptType==="textToText" ?
                "waiting" : null    
            }
         
        </div>
    )
}

export default Krypt;