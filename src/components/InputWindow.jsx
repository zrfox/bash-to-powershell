import { useState, useId } from 'react'

import commands from "../data/commands.json";

import { commandById } from '../utils/commandIndex';
import { flagById } from '../utils/flagIndex';

function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, commandIds, activeWindowId, text, textAreaSize, setTextAreaSize, activeWindowsBoolean, lockWindows, setLockWindows }){
    
    const inputTextAreaId = useId();

    function setTextAreaSizeHandler(e) {
        //console.log("e.target.offsetheight: ", e.target.offsetHeight)
        if (lockWindows == false || Math.abs(textAreaSize[1] - e.target.offsetHeight) < 10) return;
        console.log("setTextArea called!");
        setTextAreaSize([e.target.offsetWidth, e.target.offsetHeight])
    }
    //commandIds are currently objects to keep cmds and flgs together
    function getCommandsInCommon(commandIds) {
        console.log("commandIds: ", commandIds);
        if (nId == activeWindowId) return;
        let translatedCommands = [];
        //console.log("languageName: ", languageName);
        commandIds.forEach((commandId) => {
            console.log("commandId", commandId)
            commandId.forEach((obj) => {
                //console.log("1234234obj: ", obj);
                if (obj === undefined || obj.id === undefined) return;
            //console.log("Test cd: ", commandById["change-directory"]);
            const commandObj = commandById[obj.id];
            console.log("commandObj: ", commandObj);
            if (commandObj) {
                translatedCommands.push(commandObj.shells[languageName].command);

            }
            //translatedCommands.push(commands[commandId].shells[languageName].command);

            // ! obj might not havbe flagIds
            // this is i think trying to use command context...but we don't need to do this here
            // we've already resolve context before this. 
            // however, we may need to do context handling for the target language
            // right now we are still mostly replacing one token for another, 
            // doesn't necessarily tell us how to do things if they aren't done in an obvious 1:1 way
            else if (obj.id !== undefined) {
                    //console.log("!!!flag obj: ", obj);
                    translatedCommands.push(obj.shells[languageName])

                }
            })
            
        

        })
        
        const translatedStr = JSON.stringify(translatedCommands);
        const cleanedTranslatedStr = translatedStr.replaceAll(/[\[\]\"\"]/g, "");
        const spacedTranslatedStr = cleanedTranslatedStr.replaceAll(/,/g, " ");
        //console.log("spacedTranslatedStr: ", spacedTranslatedStr);
        return spacedTranslatedStr;            
    }

    const isActive = nId === activeWindowId;

    // if window is not active, it's a target window that needs translation/interpreting.
    const valueText = isActive || !activeWindowsBoolean ? text : getCommandsInCommon(commandIds);

    return (
        <>
        <div className='input-window'>
            <div className='close-button-container'>
            <button className='close-button' onClick={onRemove}>x</button>
            </div>
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