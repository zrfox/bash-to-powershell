import { useState, useId } from 'react'

import commands from "../data/commands.json";

import { commandById } from '../utils/commandIndex';
import { flagById } from '../utils/flagIndex';

function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, commandIds, activeWindowId, text, textAreaSize, setTextAreaSize }){
    
    const inputTextAreaId = useId();

    function setTextAreaSizeHandler(e) {
        console.log("setTextArea called!");
        setTextAreaSize([e.target.offsetWidth, e.target.offsetHeight])
    }

    function getCommandsInCommon(commandIds) {
        console.log("commandIds: ", commandIds);
        if (nId == activeWindowId) return;
        let translatedCommands = [];
        console.log("languageName: ", languageName);
        commandIds.forEach((commandId) =>{
            if (commandId === undefined) return;
            const commandObj = commandById[commandId];
            console.log("commandObj: ", commandObj);
            translatedCommands.push(commandObj.shells[languageName].command);
            //translatedCommands.push(commands[commandId].shells[languageName].command);
        }
        )
        const translatedStr = JSON.stringify(translatedCommands);
        return translatedStr;            
    }

    const isActive = nId === activeWindowId;

    // this is the problem, it's calling when not active. 
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
                onMouseUp={setTextAreaSizeHandler}
                style={{width: textAreaSize[0],  height: textAreaSize[1]}}
            />
        </div>
        </>
    );
}

export default InputWindow;