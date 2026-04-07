import { useState, useId } from 'react'

import commands from "../data/commands.json";

import { commandById } from '../utils/commandIndex';
import { flagById } from '../utils/flagIndex';

function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, commandIds, activeWindowId, text }){
    
    const inputTextAreaId = useId();

    function getCommandsInCommon(commandIds) {
        console.log("commandIds: ", commandIds);
        if (nId == activeWindowId) return;
        let translatedCommands = [];
        console.log("languageName: ", languageName);

        commandIds.forEach((commandId) =>{
            if (commandId === undefined) return;
            const commandObj = commandById[commandId];
            if (commandObj === undefined) return;
            console.log("commandObj: ", commandObj);
            translatedCommands.push(commandObj.shells[languageName].command);
            //translatedCommands.push(commands[commandId].shells[languageName].command);
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