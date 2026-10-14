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
    function translateTokens(commandIds) {
  const tokens = [];
  for (const group of commandIds) {
    for (const obj of group) {
      if (!obj?.id) continue;
      const commandObj = commandById[obj.id];
      const translated = commandObj
        ? commandObj.shells?.[languageName]?.command
        : obj.shells?.[languageName];
      tokens.push(translated ?? `<no ${languageName} equivalent: ${obj.id}>`);
    }
  }
  return tokens.join(" ");
}

    const isActive = nId === activeWindowId;

    // if window is not active, it's a target window that needs translation/interpreting.
    const valueText = isActive || !activeWindowsBoolean ? text : translateTokens(commandIds);

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