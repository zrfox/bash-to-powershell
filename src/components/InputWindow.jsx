import { useState, useId, useRef, useLayoutEffect } from 'react'


import commands from "../data/commands.json";

import { commandById } from '../utils/commandIndex';
import { flagById } from '../utils/flagIndex';

function InputWindow({ onRemove, languageName, setTextHandler, nId, setActiveWindowIdHandler, commandIds, activeWindowId, text, registerTextArea, activeWindowsBoolean, lockWindows, setLockWindows }){
    
// 2. props: replace textAreaSize and setTextAreaSize with registerTextArea
// 3. delete setTextAreaSizeHandler, and add under useId():
// Registers on mount (including newly added windows); the returned cleanup
// stops observing this textarea when the window is closed.



    const inputTextAreaId = useId();
const textAreaRef = useRef(null);

useLayoutEffect(() => registerTextArea(textAreaRef.current), [registerTextArea]);


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
    ref={textAreaRef}
    id={inputTextAreaId}
    name='inputTextArea'
    onFocus={() => {
        if (!isActive) setActiveWindowIdHandler(nId, valueText, languageName);
    }}
    onChange={(e) => {
        if (isActive) setTextHandler(e.target.value, languageName, nId);
    }}
    value={valueText}
/>
        </div>
        </>
    );
}

export default InputWindow;