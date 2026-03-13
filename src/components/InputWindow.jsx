import { useState, useId } from 'react'

import commands from "../data/commands.json";


function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, commandIds, activeWindowId, text }){
    
    const inputTextAreaId = useId();

    function getCommandsInCommon(commandIds) {
        if (nId == activeWindowId) return;
        let translatedCommands = [];
        commandIds.forEach((commandId) =>{
            translatedCommands.push(commands[commandId].shells[languageName].command);
        }
        )
        const translatedStr = JSON.stringify(translatedCommands);
        return translatedStr;            
    }

    const isActive = nId === activeWindowId;

    const valueText = isActive ? text : getCommandsInCommon(commandIds);

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
                value={valueText}
            />
            
        </div>
        </>
    );
}

export default InputWindow;