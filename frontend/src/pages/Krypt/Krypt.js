import React, { useEffect } from "react";
import {useParams} from "react-router-dom"
import Steganography from "../../components/Steganography/Steganography";
import TextEncrypt from "../../components/TextEncryption/TextEncypt";
import QRCodeComponent from "../../components/QrCode/QrCode";
import ImageEncryption from "../../components/ImageEncrypt/ImageEncrypt";
import AdvancedToolWorkspace from "../../components/Tools/AdvancedToolWorkspaces";
import { trackEvent } from "../../analytics";

const Krypt = () =>{
    const kryptType = useParams().name;

    useEffect(() => {
        if (!kryptType) return;
        trackEvent('tool_opened', {
            eventGroup: 'tool',
            path: `/krypt/${kryptType}`,
            tool: kryptType,
        });
    }, [kryptType]);

    return (
        <>
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
            <AdvancedToolWorkspace name={kryptType} />
         
        </>
    )
}

export default Krypt;
