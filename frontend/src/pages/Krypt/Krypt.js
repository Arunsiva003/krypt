import React from "react";
import {useParams} from "react-router-dom"
import Steganography from "../../components/Steganography/Steganography";
import TextEncrypt from "../../components/TextEncryption/TextEncypt";
import QRCodeComponent from "../../components/QrCode/QrCode";
import ImageEncryption from "../../components/ImageEncrypt/ImageEncrypt";

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

            {
                kryptType==="qrCode" ?
                <QRCodeComponent/>:null
            }
            {
                kryptType==="ImageEncryption" ?
                <ImageEncryption/>:null
            }
         
        </div>
    )
}

export default Krypt;