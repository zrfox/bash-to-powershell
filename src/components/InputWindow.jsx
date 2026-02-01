import { useState, useId } from 'react'

import commands from "../data/commands.json";


function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, activeWindowId }){
    
    const inputTextAreaId = useId();

    return (
        <>
        <div className='input-window'>
            <button className='close-button' onClick={onRemove}>x</button>
            <div>{languageName}</div>
            <label htmlFor={inputTextAreaId}></label>
            <textarea
                id={inputTextAreaId}
                name='inputTextArea'
                onClick={() => setActiveWindowIdHandler(nId)}
                onChange={(e) => {if(activeWindowId == nId) {
                    setTextHandler(e.target.value, languageName, nId)}}
                }
            />
            
        </div>
        </>
    );
}

export default InputWindow;