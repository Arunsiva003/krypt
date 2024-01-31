import React from "react";
import {useParams} from "react-router-dom"
import Steganography from "../../components/Steganography/Steganography";
import TextEncrypt from "../../components/TextEncryption/TextEncypt";

const Krypt = () =>{
    const kryptType = useParams().name;

    return (
        <div  style={{margin:"40px", height:"100vh"}}>
            { kryptType==="steganoGraphy" ?  
                <Steganography /> : null 
            }

            {kryptType==="textToText" ?
                <TextEncrypt/>: null    
            }
         
        </div>
    )
}

export default Krypt;